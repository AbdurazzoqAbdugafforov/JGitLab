from typing import Dict, List, Any, Optional
import httpx
from app.core.config import settings

class GitHubClient:
    def __init__(self, token: str):
        self.token = token.strip()
        self.base_url = "https://api.github.com"
        self.headers = {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "JGitLab-Engineering-Platform/0.1.0"
        }
        if self.token:
            self.headers["Authorization"] = f"token {self.token}"

    async def get_user_profile(self) -> Dict[str, Any]:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(f"{self.base_url}/user", headers=self.headers)
            if resp.status_code == 200:
                return resp.json()
            raise Exception(f"GitHub user profile lookup failed: {resp.status_code} {resp.text}")

    async def list_user_repos(self, page: int = 1, per_page: int = 50) -> List[Dict[str, Any]]:
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.get(
                f"{self.base_url}/user/repos",
                headers=self.headers,
                params={"sort": "updated", "direction": "desc", "page": page, "per_page": per_page}
            )
            if resp.status_code == 200:
                repos = resp.json()
                return [
                    {
                        "id": r.get("id"),
                        "name": r.get("name"),
                        "full_name": r.get("full_name"),
                        "owner": r.get("owner", {}).get("login"),
                        "html_url": r.get("html_url"),
                        "clone_url": r.get("clone_url"),
                        "default_branch": r.get("default_branch", "main"),
                        "description": r.get("description"),
                        "language": r.get("language"),
                        "is_private": r.get("private", False),
                        "updated_at": r.get("updated_at")
                    }
                    for r in repos
                ]
            raise Exception(f"Failed to fetch repositories: {resp.status_code} {resp.text}")

    async def get_repo_details(self, full_name: str) -> Dict[str, Any]:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(f"{self.base_url}/repos/{full_name}", headers=self.headers)
            if resp.status_code == 200:
                return resp.json()
            raise Exception(f"Repo details lookup failed: {resp.status_code} {resp.text}")

    async def get_repo_tree(self, full_name: str, branch: str = "main") -> List[Dict[str, Any]]:
        """Fetch git tree recursively via Git Trees API"""
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(
                f"{self.base_url}/repos/{full_name}/git/trees/{branch}?recursive=1",
                headers=self.headers
            )
            if resp.status_code == 200:
                return resp.json().get("tree", [])
            return []

    async def get_file_content(self, full_name: str, path: str, branch: str = "main") -> Optional[str]:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                f"{self.base_url}/repos/{full_name}/contents/{path}?ref={branch}",
                headers=self.headers
            )
            if resp.status_code == 200:
                import base64
                data = resp.json()
                if "content" in data and data.get("encoding") == "base64":
                    return base64.b64decode(data["content"]).decode("utf-8", errors="replace")
            return None

    async def create_branch(self, full_name: str, branch_name: str, base_branch: str = "main") -> Dict[str, Any]:
        """Create new branch from base branch sha"""
        async with httpx.AsyncClient(timeout=15.0) as client:
            # 1. Get base branch sha
            ref_resp = await client.get(
                f"{self.base_url}/repos/{full_name}/git/ref/heads/{base_branch}",
                headers=self.headers
            )
            if ref_resp.status_code != 200:
                raise Exception(f"Failed to find base branch {base_branch}: {ref_resp.text}")
            base_sha = ref_resp.json().get("object", {}).get("sha")

            # 2. Create new ref
            create_resp = await client.post(
                f"{self.base_url}/repos/{full_name}/git/refs",
                headers=self.headers,
                json={"ref": f"refs/heads/{branch_name}", "sha": base_sha}
            )
            if create_resp.status_code in (200, 201):
                return create_resp.json()
            elif create_resp.status_code == 422: # Reference already exists
                return {"ref": f"refs/heads/{branch_name}", "existing": True}
            raise Exception(f"Failed to create branch {branch_name}: {create_resp.text}")

    async def create_pull_request(
        self,
        full_name: str,
        title: str,
        body: str,
        head_branch: str,
        base_branch: str = "main"
    ) -> Dict[str, Any]:
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(
                f"{self.base_url}/repos/{full_name}/pulls",
                headers=self.headers,
                json={
                    "title": title,
                    "body": body,
                    "head": head_branch,
                    "base": base_branch
                }
            )
            if resp.status_code in (200, 201):
                return resp.json()
            raise Exception(f"Failed to create Pull Request: {resp.status_code} {resp.text}")
