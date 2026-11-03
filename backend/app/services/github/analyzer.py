import os
import re
import json
from typing import Dict, List, Any, Optional

EXCLUDED_DIRS = {
    "node_modules", ".git", ".venv", "venv", "__pycache__", ".pytest_cache",
    "dist", "build", ".next", ".nuxt", "coverage", ".turbo", "target",
    "bin", "obj", ".idea", ".vscode", "vendor"
}

EXCLUDED_FILES = {
    ".env", ".env.local", ".env.production", ".env.development", ".DS_Store",
    "id_rsa", "id_ed25519", "*.pem", "*.key", "*.pfx", "*.p12"
}

LANGUAGE_EXTENSIONS = {
    ".py": "Python",
    ".ts": "TypeScript",
    ".tsx": "TypeScript (React)",
    ".js": "JavaScript",
    ".jsx": "JavaScript (React)",
    ".rs": "Rust",
    ".go": "Go",
    ".java": "Java",
    ".cpp": "C++",
    ".c": "C",
    ".cs": "C#",
    ".rb": "Ruby",
    ".php": "PHP",
    ".html": "HTML",
    ".css": "CSS",
    ".sql": "SQL",
    ".sh": "Shell",
    ".yml": "YAML",
    ".yaml": "YAML",
    ".json": "JSON",
    ".md": "Markdown"
}

class RepositoryAnalyzer:
    """Static analysis engine for git repositories and local project trees"""

    @staticmethod
    def is_path_excluded(path: str) -> bool:
        normalized = path.replace("\\", "/").strip("/")
        parts = normalized.split("/")
        for part in parts:
            if part in EXCLUDED_DIRS:
                return True
        filename = parts[-1] if parts else ""
        if filename in EXCLUDED_FILES or filename.startswith(".env"):
            return True
        return False

    @staticmethod
    def analyze_file_list(files: List[str], contents_map: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
        contents_map = contents_map or {}
        lang_counts: Dict[str, int] = {}
        frameworks: List[str] = []
        dependencies: Dict[str, Any] = {}
        important_files: List[str] = []
        tree_summary: Dict[str, Any] = {}

        filtered_files = [f for f in files if not RepositoryAnalyzer.is_path_excluded(f)]

        for file_path in filtered_files:
            _, ext = os.path.splitext(file_path.lower())
            if ext in LANGUAGE_EXTENSIONS:
                lang = LANGUAGE_EXTENSIONS[ext]
                lang_counts[lang] = lang_counts.get(lang, 0) + 1

            # Detect key files
            fname = os.path.basename(file_path).lower()
            if fname in ("readme.md", "dockerfile", "docker-compose.yml", "package.json", "requirements.txt", "pyproject.toml", "cargo.toml", "go.mod", "makefile"):
                important_files.append(file_path)

        # Framework heuristics
        file_set = set(filtered_files)
        if any("next.config" in f for f in file_set):
            frameworks.append("Next.js")
        if any("vite.config" in f for f in file_set):
            frameworks.append("Vite")
        if any("tailwind.config" in f for f in file_set):
            frameworks.append("Tailwind CSS")

        # Parse package.json if present
        for path, content in contents_map.items():
            if os.path.basename(path).lower() == "package.json":
                try:
                    pkg = json.loads(content)
                    deps = {**pkg.get("dependencies", {}), **pkg.get("devDependencies", {})}
                    dependencies["npm"] = list(deps.keys())[:40]
                    if "react" in deps and "React" not in frameworks:
                        frameworks.append("React")
                    if "vue" in deps:
                        frameworks.append("Vue.js")
                    if "express" in deps:
                        frameworks.append("Express")
                    if "fastify" in deps:
                        frameworks.append("Fastify")
                except Exception:
                    pass

            if os.path.basename(path).lower() in ("requirements.txt", "pyproject.toml"):
                try:
                    py_deps = []
                    for line in content.splitlines():
                        line = line.strip()
                        if line and not line.startswith("#"):
                            dep_name = re.split(r"[=<>~;]", line)[0].strip()
                            if dep_name:
                                py_deps.append(dep_name)
                    dependencies["python"] = py_deps[:40]
                    if any("fastapi" in d.lower() for d in py_deps) and "FastAPI" not in frameworks:
                        frameworks.append("FastAPI")
                    if any("django" in d.lower() for d in py_deps) and "Django" not in frameworks:
                        frameworks.append("Django")
                    if any("flask" in d.lower() for d in py_deps) and "Flask" not in frameworks:
                        frameworks.append("Flask")
                except Exception:
                    pass

        # Build tree summary (first 3 directory levels)
        dirs_seen = set()
        for f in filtered_files[:200]:
            parts = f.replace("\\", "/").split("/")
            if len(parts) > 1:
                dirs_seen.add("/".join(parts[:-1]))

        # Calculate language percentages
        total_lang_files = sum(lang_counts.values()) or 1
        lang_percentages = {
            lang: round((count / total_lang_files) * 100, 1)
            for lang, count in sorted(lang_counts.items(), key=lambda x: x[1], reverse=True)[:5]
        }

        return {
            "languages": lang_percentages,
            "total_files_analyzed": len(filtered_files),
            "frameworks": sorted(list(set(frameworks))),
            "dependencies": dependencies,
            "important_files": important_files,
            "directories": sorted(list(dirs_seen))[:25],
            "analysis_summary": {
                "primary_language": max(lang_counts.items(), key=lambda x: x[1])[0] if lang_counts else "Unknown",
                "framework_count": len(frameworks),
                "dependency_count": sum(len(v) for v in dependencies.values()),
                "is_monorepo": any(p.startswith("packages/") or p.startswith("apps/") for p in filtered_files)
            }
        }
