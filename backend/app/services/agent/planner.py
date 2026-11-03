from typing import Dict, Any, List
from app.services.ai.base import AIProvider

PLANNER_SCHEMA = {
    "type": "object",
    "properties": {
        "task_summary": {"type": "string"},
        "existing_architecture_analysis": {"type": "string"},
        "files_to_inspect": {
            "type": "array",
            "items": {"type": "string"}
        },
        "files_likely_to_change": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "path": {"type": "string"},
                    "action": {"type": "string", "enum": ["read", "create", "edit", "delete"]},
                    "reason": {"type": "string"}
                },
                "required": ["path", "action", "reason"]
            }
        },
        "proposed_implementation_steps": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "step_number": {"type": "integer"},
                    "title": {"type": "string"},
                    "description": {"type": "string"},
                    "tools": {
                        "type": "array",
                        "items": {"type": "string"}
                    }
                },
                "required": ["step_number", "title", "description", "tools"]
            }
        },
        "potential_risks": {
            "type": "array",
            "items": {"type": "string"}
        },
        "dependencies": {
            "type": "array",
            "items": {"type": "string"}
        },
        "testing_strategy": {"type": "string"}
    },
    "required": [
        "task_summary",
        "existing_architecture_analysis",
        "files_to_inspect",
        "files_likely_to_change",
        "proposed_implementation_steps",
        "potential_risks",
        "dependencies",
        "testing_strategy"
    ]
}

class TaskPlanner:
    def __init__(self, provider: AIProvider):
        self.provider = provider

    async def generate_plan(
        self,
        task_title: str,
        task_description: str,
        project_context: Dict[str, Any],
        memory_context: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Produce a structured plan for the user to review and approve before execution.
        """
        memories_text = "\n".join([
            f"- [{m.get('category', 'knowledge')}] {m.get('title')}: {m.get('summary') or m.get('content')[:180]}"
            for m in memory_context
        ]) if memory_context else "No prior engineering memories found for this project."

        tech_stack_str = ", ".join(project_context.get("tech_stack", [])) or "Standard web application"
        frameworks_str = ", ".join(project_context.get("frameworks", [])) or "None detected"

        system_prompt = (
            "You are the Principal AI Software Architect of JGitLab, a world-class autonomous software engineering platform.\n"
            "Your objective is to thoroughly analyze the user's software engineering task and formulate a structured, "
            "safe, robust, step-by-step implementation plan.\n"
            "Do NOT write premature code yet. Focus on deep repository analysis, identifying files to modify, "
            "evaluating regression risks, and designing automated verification."
        )

        user_prompt = (
            f"### TASK DETAILS\n"
            f"Title: {task_title}\n"
            f"Description: {task_description}\n\n"
            f"### PROJECT ARCHITECTURAL CONTEXT\n"
            f"Project Name: {project_context.get('project_name', 'JGitLab Project')}\n"
            f"Tech Stack: {tech_stack_str}\n"
            f"Frameworks: {frameworks_str}\n"
            f"Repository: {project_context.get('repo_name', 'Default Repository')}\n\n"
            f"### RELEVANT ENGINEERING MEMORY & ADRs\n"
            f"{memories_text}\n\n"
            f"Provide your structured implementation plan strictly complying with the requested JSON schema."
        )

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]

        plan = await self.provider.generate_structured_response(messages, PLANNER_SCHEMA, temperature=0.1)
        return plan
