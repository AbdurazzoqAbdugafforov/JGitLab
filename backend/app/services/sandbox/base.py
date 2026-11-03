from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from dataclasses import dataclass

@dataclass
class ExecutionResult:
    exit_code: int
    stdout: str
    stderr: str
    duration_ms: int
    timed_out: bool = False
    error: Optional[str] = None

class SandboxRunner(ABC):
    """Abstract interface for executing code and commands in an isolated sandbox"""

    @abstractmethod
    async def execute_command(
        self,
        command: str,
        workspace_path: str,
        timeout_seconds: Optional[int] = None,
        env: Optional[Dict[str, str]] = None
    ) -> ExecutionResult:
        """Run command inside isolated workspace"""
        pass

    @abstractmethod
    def validate_path(self, workspace_path: str, target_path: str) -> str:
        """Ensure target_path does not escape workspace_path (prevent path traversal)"""
        pass
