import os
from typing import Dict, Any, List
from app.services.sandbox.base import SandboxRunner, ExecutionResult

class DiffEngine:
    @staticmethod
    async def get_diff(workspace_path: str, runner: SandboxRunner) -> Dict[str, Any]:
        """
        Calculates git diff in workspace, handling untracked files and working tree edits.
        """
        # 1. Run git status -s
        status_res: ExecutionResult = await runner.execute_command("git status -s", workspace_path, timeout_seconds=15)
        changed_files = []
        if status_res.exit_code == 0:
            for line in status_res.stdout.splitlines():
                line = line.strip()
                if not line:
                    continue
                parts = line.split(maxsplit=1)
                if len(parts) == 2:
                    status_code, path = parts
                    changed_files.append({"status": status_code, "path": path})

        # 2. Run git diff
        diff_res: ExecutionResult = await runner.execute_command("git diff HEAD", workspace_path, timeout_seconds=20)
        unified_diff = diff_res.stdout if diff_res.exit_code == 0 else ""

        # If git diff HEAD is empty but there are untracked files, check git diff
        if not unified_diff:
            diff_cached: ExecutionResult = await runner.execute_command("git diff", workspace_path, timeout_seconds=20)
            if diff_cached.exit_code == 0:
                unified_diff = diff_cached.stdout

        # Parse per-file diff snippets for UI
        file_diffs: List[Dict[str, Any]] = []
        if unified_diff:
            diff_chunks = unified_diff.split("diff --git ")
            for chunk in diff_chunks:
                if not chunk.strip():
                    continue
                lines = chunk.splitlines()
                header = lines[0] if lines else ""
                file_diffs.append({
                    "header": f"diff --git {header}",
                    "diff": chunk
                })

        return {
            "success": True,
            "has_changes": len(changed_files) > 0 or len(unified_diff.strip()) > 0,
            "changed_files_count": len(changed_files),
            "changed_files": changed_files,
            "unified_diff": unified_diff,
            "file_diffs": file_diffs
        }
