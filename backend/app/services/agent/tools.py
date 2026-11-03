import os
import re
import json
import fnmatch
from typing import Dict, Any, List, Optional
from app.services.sandbox.base import SandboxRunner, ExecutionResult

AGENT_TOOL_DEFINITIONS = [
    {
        "type": "function",
        "function": {
            "name": "list_files",
            "description": "List files and directories in the workspace or a given subfolder with optional pattern filter.",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "Relative directory path (e.g. '.' or 'src/components')", "default": "."},
                    "pattern": {"type": "string", "description": "Optional glob pattern like '*.py' or '*.tsx'"}
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "read_file",
            "description": "Read file contents with line numbers and optional line range window.",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "Relative file path from workspace root"},
                    "start_line": {"type": "integer", "description": "1-based starting line number"},
                    "end_line": {"type": "integer", "description": "1-based ending line number"}
                },
                "required": ["path"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "search_code",
            "description": "Search code across files in the workspace for regex or keyword match.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Search term or regex pattern"},
                    "file_pattern": {"type": "string", "description": "Optional file glob filter like '*.py'"}
                },
                "required": ["query"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "inspect_project",
            "description": "Get high-level overview of project structure, languages, detected frameworks and entrypoints.",
            "parameters": {
                "type": "object",
                "properties": {}
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "inspect_dependencies",
            "description": "Inspect detected project dependencies from package manifests (package.json, requirements.txt, etc.).",
            "parameters": {
                "type": "object",
                "properties": {}
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "create_file",
            "description": "Create a new file in the workspace with given content.",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "Relative file path"},
                    "content": {"type": "string", "description": "Full file content to write"}
                },
                "required": ["path", "content"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "edit_file",
            "description": "Replace a specific contiguous target block of text in an existing file with replacement text.",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "Relative file path"},
                    "target": {"type": "string", "description": "Exact text block in the file to replace"},
                    "replacement": {"type": "string", "description": "New text block to insert in place of target"}
                },
                "required": ["path", "target", "replacement"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "delete_file",
            "description": "Delete a file from the workspace.",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "Relative file path to delete"}
                },
                "required": ["path"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "run_tests",
            "description": "Execute tests in the sandbox workspace and capture results.",
            "parameters": {
                "type": "object",
                "properties": {
                    "command": {"type": "string", "description": "Test command (e.g. 'pytest' or 'npm test')"},
                    "test_path": {"type": "string", "description": "Optional specific test file path"}
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "run_linter",
            "description": "Run code linter or format checker (e.g. 'flake8', 'eslint', 'ruff').",
            "parameters": {
                "type": "object",
                "properties": {
                    "command": {"type": "string", "description": "Linter command to execute"}
                },
                "required": ["command"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "run_build",
            "description": "Run compilation or build verification command.",
            "parameters": {
                "type": "object",
                "properties": {
                    "command": {"type": "string", "description": "Build command (e.g. 'npm run build', 'tsc --noEmit')"}
                },
                "required": ["command"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "inspect_git_diff",
            "description": "Inspect uncommitted git diff in the workspace to review pending changes.",
            "parameters": {
                "type": "object",
                "properties": {}
            }
        }
    }
]

class ToolExecutor:
    def __init__(self, workspace_path: str, runner: SandboxRunner):
        self.workspace_path = os.path.realpath(workspace_path)
        self.runner = runner

    def _resolve_safe(self, rel_path: str) -> str:
        # Protect against path traversal and sensitive files
        if not rel_path or rel_path.strip() == "":
            return self.workspace_path
        clean_rel = rel_path.strip().lstrip("/\\")
        full_path = self.runner.validate_path(self.workspace_path, clean_rel)
        base = os.path.basename(full_path).lower()
        if base.startswith(".env"):
            raise PermissionError(f"Access to '{base}' is blocked by security policy")
        return full_path

    async def execute(self, tool_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
        handler = getattr(self, f"tool_{tool_name}", None)
        if not handler:
            return {"success": False, "error": f"Unknown tool '{tool_name}'"}
        try:
            return await handler(**arguments)
        except Exception as e:
            return {"success": False, "error": f"Tool execution failed: {str(e)}"}

    async def tool_list_files(self, path: str = ".", pattern: Optional[str] = None) -> Dict[str, Any]:
        target_dir = self._resolve_safe(path)
        if not os.path.exists(target_dir):
            return {"success": False, "error": f"Directory not found: {path}"}

        entries = []
        for root, dirs, files in os.walk(target_dir):
            # Prune excluded directories
            dirs[:] = [d for d in dirs if d not in {".git", "node_modules", ".venv", "__pycache__", "dist", "build", ".next"}]
            rel_root = os.path.relpath(root, self.workspace_path).replace("\\", "/")
            if rel_root == ".":
                rel_root = ""

            for f in files:
                if pattern and not fnmatch.fnmatch(f, pattern):
                    continue
                file_rel = f"{rel_root}/{f}".lstrip("/")
                try:
                    size = os.path.getsize(os.path.join(root, f))
                except Exception:
                    size = 0
                entries.append({"path": file_rel, "size_bytes": size})
                if len(entries) >= 150:
                    break
            if len(entries) >= 150:
                break

        return {"success": True, "files": entries, "count": len(entries), "truncated": len(entries) >= 150}

    async def tool_read_file(self, path: str, start_line: Optional[int] = None, end_line: Optional[int] = None) -> Dict[str, Any]:
        file_path = self._resolve_safe(path)
        if not os.path.exists(file_path):
            return {"success": False, "error": f"File does not exist: {path}"}
        if os.path.isdir(file_path):
            return {"success": False, "error": f"Path is a directory, not a file: {path}"}

        with open(file_path, "r", encoding="utf-8", errors="replace") as f:
            lines = f.readlines()

        total_lines = len(lines)
        s_line = max(1, start_line or 1)
        e_line = min(total_lines, end_line or total_lines)

        indexed_lines = []
        for idx in range(s_line, e_line + 1):
            indexed_lines.append(f"{idx:4d} | {lines[idx - 1]}")

        return {
            "success": True,
            "path": path,
            "total_lines": total_lines,
            "start_line": s_line,
            "end_line": e_line,
            "content": "".join(indexed_lines)
        }

    async def tool_search_code(self, query: str, file_pattern: Optional[str] = None) -> Dict[str, Any]:
        results = []
        pattern_re = re.compile(re.escape(query), re.IGNORECASE)

        for root, dirs, files in os.walk(self.workspace_path):
            dirs[:] = [d for d in dirs if d not in {".git", "node_modules", ".venv", "__pycache__", "dist", "build", ".next"}]
            for f in files:
                if file_pattern and not fnmatch.fnmatch(f, file_pattern):
                    continue
                full_path = os.path.join(root, f)
                rel_path = os.path.relpath(full_path, self.workspace_path).replace("\\", "/")
                try:
                    with open(full_path, "r", encoding="utf-8", errors="replace") as fp:
                        for l_idx, line in enumerate(fp, start=1):
                            if pattern_re.search(line):
                                results.append({
                                    "file": rel_path,
                                    "line": l_idx,
                                    "content": line.strip()[:180]
                                })
                                if len(results) >= 50:
                                    break
                except Exception:
                    continue
            if len(results) >= 50:
                break

        return {"success": True, "query": query, "matches": results, "count": len(results)}

    async def tool_inspect_project(self) -> Dict[str, Any]:
        from app.services.github.analyzer import RepositoryAnalyzer
        all_files = []
        contents = {}
        for root, dirs, files in os.walk(self.workspace_path):
            dirs[:] = [d for d in dirs if d not in {".git", "node_modules", ".venv", "__pycache__", "dist", "build", ".next"}]
            for f in files:
                rel = os.path.relpath(os.path.join(root, f), self.workspace_path).replace("\\", "/")
                all_files.append(rel)
                if f.lower() in ("package.json", "requirements.txt", "pyproject.toml"):
                    try:
                        with open(os.path.join(root, f), "r", encoding="utf-8", errors="replace") as cfile:
                            contents[rel] = cfile.read(4000)
                    except Exception:
                        pass
        return {"success": True, "analysis": RepositoryAnalyzer.analyze_file_list(all_files, contents)}

    async def tool_inspect_dependencies(self) -> Dict[str, Any]:
        deps = {}
        for manifest in ["package.json", "requirements.txt", "pyproject.toml", "Cargo.toml", "go.mod"]:
            fpath = os.path.join(self.workspace_path, manifest)
            if os.path.exists(fpath):
                try:
                    with open(fpath, "r", encoding="utf-8", errors="replace") as fp:
                        deps[manifest] = fp.read(3000)
                except Exception:
                    pass
        return {"success": True, "manifests": deps}

    async def tool_create_file(self, path: str, content: str) -> Dict[str, Any]:
        file_path = self._resolve_safe(path)
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)
        return {"success": True, "path": path, "message": f"Successfully created {path} ({len(content)} characters)"}

    async def tool_edit_file(self, path: str, target: str, replacement: str) -> Dict[str, Any]:
        file_path = self._resolve_safe(path)
        if not os.path.exists(file_path):
            return {"success": False, "error": f"File not found: {path}"}

        with open(file_path, "r", encoding="utf-8") as f:
            old_content = f.read()

        if target not in old_content:
            return {
                "success": False,
                "error": f"Target string not found in {path}. Make sure whitespace and formatting match exactly."
            }

        new_content = old_content.replace(target, replacement, 1)
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(new_content)

        return {"success": True, "path": path, "message": f"Successfully edited {path}"}

    async def tool_delete_file(self, path: str) -> Dict[str, Any]:
        file_path = self._resolve_safe(path)
        if not os.path.exists(file_path):
            return {"success": False, "error": f"File does not exist: {path}"}
        os.remove(file_path)
        return {"success": True, "path": path, "message": f"Successfully deleted {path}"}

    async def tool_run_tests(self, command: Optional[str] = None, test_path: Optional[str] = None) -> Dict[str, Any]:
        cmd = command or "pytest"
        if test_path:
            cmd = f"{cmd} {test_path}"
        result: ExecutionResult = await self.runner.execute_command(cmd, self.workspace_path, timeout_seconds=120)
        return {
            "success": result.exit_code == 0,
            "exit_code": result.exit_code,
            "stdout": result.stdout[:4000],
            "stderr": result.stderr[:4000],
            "duration_ms": result.duration_ms,
            "timed_out": result.timed_out
        }

    async def tool_run_linter(self, command: str) -> Dict[str, Any]:
        result = await self.runner.execute_command(command, self.workspace_path, timeout_seconds=60)
        return {
            "success": result.exit_code == 0,
            "exit_code": result.exit_code,
            "output": (result.stdout + "\n" + result.stderr)[:4000],
            "duration_ms": result.duration_ms
        }

    async def tool_run_build(self, command: str) -> Dict[str, Any]:
        result = await self.runner.execute_command(command, self.workspace_path, timeout_seconds=180)
        return {
            "success": result.exit_code == 0,
            "exit_code": result.exit_code,
            "output": (result.stdout + "\n" + result.stderr)[:4000],
            "duration_ms": result.duration_ms
        }

    async def tool_inspect_git_diff(self) -> Dict[str, Any]:
        from app.services.agent.diff_engine import DiffEngine
        return await DiffEngine.get_diff(self.workspace_path, self.runner)
