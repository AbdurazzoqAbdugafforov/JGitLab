import logging
from typing import Optional
from app.services.sandbox.base import SandboxRunner
from app.services.sandbox.local_runner import LocalRestrictedRunner
from app.services.sandbox.docker_runner import DockerSandboxRunner

logger = logging.getLogger("jgitlab.sandbox")

class SandboxManager:
    _instance: Optional[SandboxRunner] = None

    @classmethod
    async def get_runner(cls) -> SandboxRunner:
        if cls._instance is not None:
            return cls._instance

        # Probe Docker availability
        docker_runner = DockerSandboxRunner()
        if await docker_runner.is_docker_available():
            logger.info("Docker daemon active: using Docker Sandbox Runner for isolated execution.")
            cls._instance = docker_runner
        else:
            logger.info("Docker daemon not available: using Local Restricted Sandbox Runner with path isolation.")
            cls._instance = LocalRestrictedRunner()

        return cls._instance

sandbox_manager = SandboxManager()
