from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional, AsyncGenerator
from dataclasses import dataclass, field

class AIProviderError(Exception):
    """Base exception for AI provider failures"""
    def __init__(self, message: str, status_code: Optional[int] = None, details: Optional[Dict[str, Any]] = None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.details = details or {}

class AIAuthenticationError(AIProviderError):
    """Raised when API key is invalid or rejected by provider"""
    pass

class AIRateLimitError(AIProviderError):
    """Raised when provider returns HTTP 429 rate limit"""
    pass

class AIQuotaExceededError(AIProviderError):
    """Raised when provider account has run out of credits/quota"""
    pass

class AITimeoutError(AIProviderError):
    """Raised when provider fails to respond within timeout"""
    pass

class AIModelNotFoundError(AIProviderError):
    """Raised when requested model name does not exist on provider"""
    pass

@dataclass
class AIToolCall:
    id: str
    name: str
    arguments: Dict[str, Any]

@dataclass
class AIResponse:
    content: Optional[str]
    tool_calls: List[AIToolCall] = field(default_factory=list)
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0
    latency_ms: int = 0
    finish_reason: Optional[str] = None
    model: str = ""

@dataclass
class AIStreamChunk:
    delta_content: Optional[str] = None
    delta_tool_calls: List[Dict[str, Any]] = field(default_factory=list)
    finish_reason: Optional[str] = None

@dataclass
class AIValidationResult:
    is_valid: bool
    latency_ms: int
    message: str
    available_models: List[str] = field(default_factory=list)

class AIProvider(ABC):
    """Abstract interface for all AI model providers"""

    @abstractmethod
    async def validate_connection(self) -> AIValidationResult:
        """Ping the provider endpoint to check credentials and list models"""
        pass

    @abstractmethod
    async def generate_response(
        self,
        messages: List[Dict[str, Any]],
        tools: Optional[List[Dict[str, Any]]] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
    ) -> AIResponse:
        """Generate a complete completion or tool call response"""
        pass

    @abstractmethod
    async def generate_structured_response(
        self,
        messages: List[Dict[str, Any]],
        response_schema: Dict[str, Any],
        temperature: Optional[float] = None,
    ) -> Dict[str, Any]:
        """Generate a guaranteed JSON structured response adhering to schema"""
        pass

    @abstractmethod
    async def stream_response(
        self,
        messages: List[Dict[str, Any]],
        tools: Optional[List[Dict[str, Any]]] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
    ) -> AsyncGenerator[AIStreamChunk, None]:
        """Stream chunks from the provider for real-time output"""
        pass

    @abstractmethod
    async def generate_embedding(self, text: str) -> List[float]:
        """Generate an embedding vector for semantic memory retrieval"""
        pass
