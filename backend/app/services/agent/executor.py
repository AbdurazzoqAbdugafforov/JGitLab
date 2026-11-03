import os
import time
import json
import asyncio
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.agent import AgentTask, AgentTaskStep, AgentApproval, AgentExecutionLog
from app.models.activity import ActivityLog
from app.services.ai.base import AIProvider, AIResponse, AIToolCall
from app.services.sandbox.base import SandboxRunner
from app.services.agent.tools import ToolExecutor, AGENT_TOOL_DEFINITIONS
from app.services.agent.diff_engine import DiffEngine
from app.core.websocket import ws_manager
from app.core.config import settings

def utc_now():
    return datetime.now(timezone.utc)

class AgentExecutionEngine:
    def __init__(
        self,
        task_id: str,
        workspace_path: str,
        provider: AIProvider,
        runner: SandboxRunner,
        db: AsyncSession
    ):
        self.task_id = task_id
        self.workspace_path = workspace_path
        self.provider = provider
        self.runner = runner
        self.db = db
        self.tool_executor = ToolExecutor(workspace_path, runner)
        self.total_tokens = 0
        self.step_counter = 0

    async def log(self, level: str, message: str, metadata: Optional[Dict[str, Any]] = None):
        log_entry = AgentExecutionLog(
            task_id=self.task_id,
            level=level,
            message=message,
            metadata_json=metadata
        )
        self.db.add(log_entry)
        await self.db.commit()

        # Broadcast via WebSocket
        await ws_manager.broadcast_task_event(self.task_id, "log", {
            "level": level,
            "message": message,
            "timestamp": utc_now().isoformat()
        })

    async def execute_approved_task(self):
        """
        Runs the autonomous tool execution loop after user approves the plan.
        """
        task_result = await self.db.execute(select(AgentTask).where(AgentTask.id == self.task_id))
        task = task_result.scalar_one_or_none()
        if not task:
            return

        task.status = "running"
        task.started_at = utc_now()
        await self.db.commit()

        await self.log("info", f"Starting autonomous execution for task: '{task.title}'")
        await ws_manager.broadcast_task_event(self.task_id, "status_change", {"status": "running"})

        plan = task.plan_json or {}
        conversation_messages: List[Dict[str, Any]] = [
            {
                "role": "system",
                "content": (
                    "You are JGitLab Autonomous AI Software Engineer. You have access to backend tools to inspect, "
                    "edit, test, and verify code inside a secure sandbox.\n"
                    "RULES:\n"
                    "1. Always read files before editing them.\n"
                    "2. Use edit_file for precise modifications or create_file for new files.\n"
                    "3. Run automated tests (run_tests) or linters (run_linter) after making changes.\n"
                    "4. If a test fails, analyze the failure output and make corrective edits.\n"
                    "5. Once all modifications and tests pass, explain your solution clearly and conclude without calling more tools."
                )
            },
            {
                "role": "user",
                "content": (
                    f"Task: {task.title}\n"
                    f"Description: {task.description}\n\n"
                    f"Approved Plan:\n{json.dumps(plan, indent=2)}\n\n"
                    f"Proceed to implement this task step by step. Start by inspecting files or making the necessary edits."
                )
            }
        ]

        consecutive_errors = 0
        max_steps = settings.MAX_TASK_STEPS

        while self.step_counter < max_steps:
            self.step_counter += 1

            # Check token budget
            if self.total_tokens > settings.MAX_TASK_TOKENS:
                await self.log("error", f"Task exceeded token budget limit ({self.total_tokens}/{settings.MAX_TASK_TOKENS})")
                task.status = "failed"
                task.failure_analysis = "Execution aborted: Maximum token budget exceeded."
                await self.db.commit()
                return

            await self.log("info", f"[Step {self.step_counter}/{max_steps}] Querying AI provider...")

            try:
                ai_resp: AIResponse = await self.provider.generate_response(
                    messages=conversation_messages,
                    tools=AGENT_TOOL_DEFINITIONS,
                    temperature=0.1
                )
                self.total_tokens += ai_resp.total_tokens
                task.total_tokens_used = self.total_tokens
                await self.db.commit()

            except Exception as exc:
                await self.log("error", f"AI Provider invocation failed: {str(exc)}")
                task.status = "failed"
                task.failure_analysis = f"Provider error during step {self.step_counter}: {str(exc)}"
                await self.db.commit()
                return

            # Append assistant message to conversation history
            assistant_msg: Dict[str, Any] = {"role": "assistant"}
            if ai_resp.content:
                assistant_msg["content"] = ai_resp.content
            if ai_resp.tool_calls:
                assistant_msg["tool_calls"] = [
                    {
                        "id": tc.id,
                        "type": "function",
                        "function": {"name": tc.name, "arguments": json.dumps(tc.arguments)}
                    }
                    for tc in ai_resp.tool_calls
                ]
            conversation_messages.append(assistant_msg)

            # If no tool calls were requested, agent has completed execution or given final answer
            if not ai_resp.tool_calls:
                await self.log("info", "Autonomous agent completed all work steps. Finalizing...")
                # Record final step
                final_step = AgentTaskStep(
                    task_id=self.task_id,
                    step_index=self.step_counter,
                    step_type="finish",
                    title="Task Completed",
                    description=ai_resp.content or "Completed without further tool calls",
                    status="completed",
                    latency_ms=ai_resp.latency_ms,
                    tokens_used=ai_resp.total_tokens
                )
                self.db.add(final_step)
                break

            # Execute each tool call
            for tc in ai_resp.tool_calls:
                tool_start = time.perf_counter()
                await self.log("info", f"Executing tool: {tc.name}", {"arguments": tc.arguments})

                # Check if tool requires special approval (e.g. destructive delete_file)
                if tc.name == "delete_file":
                    approval = AgentApproval(
                        task_id=self.task_id,
                        step_index=self.step_counter,
                        approval_type="file_deletion",
                        action_summary=f"Delete file '{tc.arguments.get('path')}'",
                        payload=tc.arguments,
                        status="pending"
                    )
                    self.db.add(approval)
                    task.status = "awaiting_approval"
                    await self.db.commit()
                    await self.log("warning", f"Destructive action paused: File deletion requires user approval.")
                    await ws_manager.broadcast_task_event(self.task_id, "approval_required", {
                        "approval_id": approval.id,
                        "action": approval.action_summary
                    })
                    return

                # Execute tool
                tool_output = await self.tool_executor.execute(tc.name, tc.arguments)
                tool_latency = int((time.perf_counter() - tool_start) * 1000)

                # Persist step record
                step_record = AgentTaskStep(
                    task_id=self.task_id,
                    step_index=self.step_counter,
                    step_type="tool_call",
                    title=f"Tool: {tc.name}",
                    description=json.dumps(tc.arguments)[:300],
                    tool_name=tc.name,
                    tool_input=tc.arguments,
                    tool_output=tool_output,
                    status="completed" if tool_output.get("success", True) else "failed",
                    error_message=tool_output.get("error"),
                    latency_ms=tool_latency,
                    tokens_used=ai_resp.total_tokens
                )
                self.db.add(step_record)
                await self.db.commit()

                # Broadcast step event
                await ws_manager.broadcast_task_event(self.task_id, "step", {
                    "step_index": self.step_counter,
                    "tool_name": tc.name,
                    "status": step_record.status,
                    "output": tool_output
                })

                # Append tool result to conversation messages for LLM context
                conversation_messages.append({
                    "role": "tool",
                    "tool_call_id": tc.id,
                    "content": json.dumps(tool_output)
                })

                if not tool_output.get("success", True):
                    consecutive_errors += 1
                else:
                    consecutive_errors = 0

            if consecutive_errors >= 4:
                await self.log("error", "Halting loop: 4 consecutive tool failures encountered.")
                task.status = "failed"
                task.failure_analysis = "Repeated tool execution failures. Human intervention advised."
                await self.db.commit()
                return

        # Post-execution review: Git Diff & Automated Tests
        await self.log("info", "Generating final code diff and test verification...")
        diff_info = await DiffEngine.get_diff(self.workspace_path, self.runner)
        task.diff_summary = diff_info.get("unified_diff")

        # Run automated tests to verify solution
        test_result = await self.tool_executor.tool_run_tests()
        task.test_results_json = test_result

        task.status = "completed"
        task.completed_at = utc_now()
        await self.db.commit()

        await self.log("info", "Task execution finished successfully.")
        await ws_manager.broadcast_task_event(self.task_id, "status_change", {
            "status": "completed",
            "has_diff": diff_info.get("has_changes", False),
            "tests_passed": test_result.get("success", False)
        })
