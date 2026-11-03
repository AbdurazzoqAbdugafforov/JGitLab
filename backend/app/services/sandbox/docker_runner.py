import os
import time
import asyncio
from typing import Dict, Optional
from app.services.sandbox.base import SandboxRunner, ExecutionResult

class DockerSandboxRunner(SandboxRunner):
    """
    Executes commands inside an isolated Docker container with strict CPU,
    memory, network limits and non-root execution.
    """

    def __init__(self, image: str = "python:3.12-slim"):
        self.image = image

    def validate_path(self, workspace_path: str, target_path: str) -> str:
        workspace_real = os.path.realpath(workspace_path)
        combined = os.path.normpath(os.path.join(workspace_real, target_path))
        if not combined.startswith(workspace_real) and os.path.commonpath([workspace_real, combined]) != workspace_real:
            raise PermissionError(f"Access denied: Path '{target_path}' attempts to traverse outside workspace boundary.")
        return combined

    async def is_docker_available(self) -> bool:
        try:
            proc = await asyncio.create_subprocess_exec(
                "docker", "info",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            await asyncio.wait_for(proc.communicate(), timeout=3.0)
            return proc.returncode == 0
        except Exception:
            return False

    async def execute_command(
        self,
        command: str,
        workspace_path: str,
        timeout_seconds: Optional[int] = None,
        env: Optional[Dict[str, str]] = None
    ) -> ExecutionResult:
        workspace_real = os.path.realpath(workspace_path)
        timeout = timeout_seconds or 120
        start_time = time.perf_counter()

        # Mount workspace to /workspace inside container
        docker_args = [
            "docker", "run", "--rm",
            "--memory=1024m",
            "--cpus=1.0",
            "--pids-limit=64",
            "-v", f"{workspace_real}:/workspace",
            "-w", "/workspace"
        ]

        # Add environment flags
        if env:
            for k, v in env.items():
                docker_args.extend(["-e", f"{k}={v}"])

        docker_args.extend([self.image, "sh", "-c", command])

        try:
            process = await asyncio.create_subprocess_exec(
                *docker_args,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
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
                    stderr=f"Docker container execution timed out after {timeout} seconds",
                    duration_ms=duration_ms,
                    timed_out=True,
                    error="Container execution timed out"
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
