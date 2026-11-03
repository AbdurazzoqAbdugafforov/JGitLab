import os
import tempfile
import pytest
from app.services.sandbox.local_runner import LocalRestrictedRunner
from app.services.agent.tools import ToolExecutor

@pytest.mark.asyncio
async def test_tool_crud_cycle():
    with tempfile.TemporaryDirectory() as tmp_dir:
        runner = LocalRestrictedRunner()
        executor = ToolExecutor(tmp_dir, runner)

        # 1. Create file
        create_res = await executor.execute("create_file", {
            "path": "src/math.py",
            "content": "def add(a, b):\n    return a + b\n"
        })
        assert create_res["success"] is True

        # 2. Read file
        read_res = await executor.execute("read_file", {"path": "src/math.py"})
        assert read_res["success"] is True
        assert "def add(a, b):" in read_res["content"]

        # 3. Edit file
        edit_res = await executor.execute("edit_file", {
            "path": "src/math.py",
            "target": "return a + b",
            "replacement": "return (a + b) * 1"
        })
        assert edit_res["success"] is True

        # 4. Search code
        search_res = await executor.execute("search_code", {"query": "add"})
        assert search_res["success"] is True
        assert len(search_res["matches"]) >= 1

        # 5. List files
        list_res = await executor.execute("list_files", {"path": "."})
        assert list_res["success"] is True
        assert any(f["path"] == "src/math.py" for f in list_res["files"])

        # 6. Delete file
        del_res = await executor.execute("delete_file", {"path": "src/math.py"})
        assert del_res["success"] is True
        assert not os.path.exists(os.path.join(tmp_dir, "src/math.py"))

@pytest.mark.asyncio
async def test_security_path_traversal_prevention():
    with tempfile.TemporaryDirectory() as tmp_dir:
        runner = LocalRestrictedRunner()
        executor = ToolExecutor(tmp_dir, runner)

        # Attempt to write outside workspace
        traversal_res = await executor.execute("create_file", {
            "path": "../../escaped.txt",
            "content": "malicious"
        })
        assert traversal_res["success"] is False
        assert "traversal" in traversal_res["error"].lower() or "denied" in traversal_res["error"].lower()

@pytest.mark.asyncio
async def test_security_env_file_blocking():
    with tempfile.TemporaryDirectory() as tmp_dir:
        runner = LocalRestrictedRunner()
        executor = ToolExecutor(tmp_dir, runner)

        # Attempt to access .env
        env_res = await executor.execute("create_file", {
            "path": ".env",
            "content": "SECRET_KEY=123"
        })
        assert env_res["success"] is False
        assert "security policy" in env_res["error"].lower()
