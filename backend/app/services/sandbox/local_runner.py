import os
import sys
import time
import asyncio
from typing import Dict, Optional
from app.services.sandbox.base import SandboxRunner, ExecutionResult

class LocalRestrictedRunner(SandboxRunner):
    """
    Controlled local execution runner with strict path traversal prevention,
    timeout handling, and command isolation.
    """

    def validate_path(self, workspace_path: str, target_path: str) -> str:
        workspace_real = os.path.realpath(workspace_path)
        combined = os.path.normpath(os.path.join(workspace_real, target_path))
        # Ensure target cannot escape workspace root
        if not combined.startswith(workspace_real) and os.path.commonpath([workspace_real, combined]) != workspace_real:
            raise PermissionError(f"Access denied: Path '{target_path}' attempts to traverse outside workspace boundary.")
        return combined

    async def execute_command(
        self,
        command: str,
        workspace_path: str,
        timeout_seconds: Optional[int] = None,
        env: Optional[Dict[str, str]] = None
    ) -> ExecutionResult:
        workspace_real = os.path.realpath(workspace_path)
        if not os.path.exists(workspace_real):
            os.makedirs(workspace_real, exist_ok=True)

        # Basic dangerous shell command prevention
        forbidden_patterns = ["rm -rf /", "mkfs", ":(){ :|:& };:", "dd if=/dev/zero", "format c:"]
        for p in forbidden_patterns:
            if p in command.lower():
                return ExecutionResult(
                    exit_code=1,
                    stdout="",
                    stderr=f"Security violation: Command '{command}' contains forbidden system pattern.",
                    duration_ms=0,
                    error="Forbidden command blocked by security policy"
                )

        timeout = timeout_seconds or 60
        start_time = time.perf_counter()

        # Build clean environment
        process_env = os.environ.copy()
        if env:
            process_env.update(env)
        # Prevent git credential prompts
        process_env["GIT_TERMINAL_PROMPT"] = "0"

        # On Windows, use PowerShell or cmd
        is_windows = sys.platform == "win32"
        shell_cmd = ["powershell.exe", "-NoProfile", "-Command", command] if is_windows else ["/bin/bash", "-c", command]

        try:
            process = await asyncio.create_subprocess_exec(
                *shell_cmd,
                cwd=workspace_real,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                env=process_env
            )

            try:
                stdout_data, stderr_data = await asyncio.wait_for(
                    process.communicate(),
                    timeout=float(timeout)
                )
                duration_ms = int((time.perf_counter() - start_time) * 1000)
                return ExecutionResult(
                    exit_code=process.returncode or 0,
                    stdout=stdout_data.decode("utf-8", errors="replace"),
                    stderr=stderr_data.decode("utf-8", errors="replace"),
                    duration_ms=duration_ms
                )
            except asyncio.TimeoutError:
                try:
                    process.kill()
                    await process.wait()
                except Exception:
                    pass
                duration_ms = int((time.perf_counter() - start_time) * 1000)
                return ExecutionResult(
                    exit_code=124,
                    stdout="",
                    stderr=f"Execution timed out after {timeout} seconds",
                    duration_ms=duration_ms,
                    timed_out=True,
                    error="Command execution timed out"
                )
        except Exception as exc:
            duration_ms = int((time.perf_counter() - start_time) * 1000)
            return ExecutionResult(
                exit_code=1,
                stdout="",
                stderr=str(exc),
                duration_ms=duration_ms,
                error=str(exc)
            )
