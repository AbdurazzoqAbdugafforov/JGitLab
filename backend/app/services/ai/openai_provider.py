import time
import json
import asyncio
from typing import List, Dict, Any, Optional, AsyncGenerator
import httpx
from app.services.ai.base import (
    AIProvider,
    AIProviderError,
    AIAuthenticationError,
    AIRateLimitError,
    AIQuotaExceededError,
    AITimeoutError,
    AIModelNotFoundError,
    AIResponse,
    AIToolCall,
    AIStreamChunk,
    AIValidationResult
)

class OpenAICompatibleProvider(AIProvider):
    def __init__(
        self,
        api_key: str,
        base_url: str = "https://api.openai.com/v1",
        model_name: str = "gpt-4o",
        embedding_model_name: Optional[str] = "text-embedding-3-small",
        temperature: float = 0.2,
        max_output_tokens: int = 4096,
        timeout_seconds: int = 60,
        max_retries: int = 3
    ):
        self.api_key = api_key.strip() if api_key else ""
        self.base_url = base_url.rstrip("/")
        self.model_name = model_name.strip() if model_name else "gpt-4o"
        self.embedding_model_name = embedding_model_name.strip() if embedding_model_name else "text-embedding-3-small"
        self.temperature = temperature
        self.max_output_tokens = max_output_tokens
        self.timeout_seconds = timeout_seconds
        self.max_retries = max_retries

    def _get_headers(self) -> Dict[str, str]:
        headers = {
            "Content-Type": "application/json",
            "User-Agent": "JGitLab-AI-Engine/0.1.0"
        }
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        return headers

    def _handle_error_response(self, status_code: int, response_text: str):
        error_msg = f"HTTP {status_code}"
        details = {}
        try:
            data = json.loads(response_text)
            if "error" in data:
                err = data["error"]
                if isinstance(err, dict):
                    error_msg = err.get("message", error_msg)
                    details = err
                elif isinstance(err, str):
                    error_msg = err
            elif "message" in data:
                error_msg = data["message"]
        except Exception:
            error_msg = response_text[:200]

        if status_code in (401, 403):
            raise AIAuthenticationError(f"Authentication failed: {error_msg}", status_code=status_code, details=details)
        elif status_code == 429:
            lower = error_msg.lower()
            if "quota" in lower or "credit" in lower or "billing" in lower or "balance" in lower:
                raise AIQuotaExceededError(f"AI Provider quota exceeded: {error_msg}", status_code=status_code, details=details)
            raise AIRateLimitError(f"Rate limit exceeded: {error_msg}", status_code=status_code, details=details)
        elif status_code == 404:
            raise AIModelNotFoundError(f"Model or endpoint not found ({self.model_name}): {error_msg}", status_code=status_code, details=details)
        else:
            raise AIProviderError(f"Provider API error ({status_code}): {error_msg}", status_code=status_code, details=details)

    async def validate_connection(self) -> AIValidationResult:
        start_time = time.perf_counter()
        url = f"{self.base_url}/models"
        
        async with httpx.AsyncClient(timeout=float(min(15, self.timeout_seconds))) as client:
            try:
                resp = await client.get(url, headers=self._get_headers())
                latency_ms = int((time.perf_counter() - start_time) * 1000)
                
                if resp.status_code == 200:
                    data = resp.json()
                    models = []
                    if "data" in data and isinstance(data["data"], list):
                        models = [m.get("id", "") for m in data["data"] if isinstance(m, dict) and "id" in m]
                    return AIValidationResult(
                        is_valid=True,
                        latency_ms=latency_ms,
                        message=f"Successfully connected to provider. {len(models)} models discovered.",
                        available_models=models[:30]
                    )
                else:
                    self._handle_error_response(resp.status_code, resp.text)
            except httpx.TimeoutException:
                latency_ms = int((time.perf_counter() - start_time) * 1000)
                raise AITimeoutError(f"Connection timed out after {self.timeout_seconds}s connecting to {self.base_url}")
            except httpx.RequestError as exc:
                latency_ms = int((time.perf_counter() - start_time) * 1000)
                raise AIProviderError(f"Network error connecting to {self.base_url}: {str(exc)}")

        return AIValidationResult(is_valid=False, latency_ms=0, message="Validation ended unexpectedly")

    async def generate_response(
        self,
        messages: List[Dict[str, Any]],
        tools: Optional[List[Dict[str, Any]]] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
    ) -> AIResponse:
        url = f"{self.base_url}/chat/completions"
        payload: Dict[str, Any] = {
            "model": self.model_name,
            "messages": messages,
            "temperature": temperature if temperature is not None else self.temperature,
            "max_tokens": max_tokens if max_tokens is not None else self.max_output_tokens
        }
        if tools:
            payload["tools"] = tools
            payload["tool_choice"] = "auto"

        start_time = time.perf_counter()
        retries = 0

        while True:
            try:
                async with httpx.AsyncClient(timeout=float(self.timeout_seconds)) as client:
                    resp = await client.post(url, headers=self._get_headers(), json=payload)
                    latency_ms = int((time.perf_counter() - start_time) * 1000)
                    
                    if resp.status_code == 200:
                        data = resp.json()
                        choice = data.get("choices", [{}])[0]
                        message = choice.get("message", {})
                        content = message.get("content")
                        tool_calls_data = message.get("tool_calls", [])
                        
                        tool_calls = []
                        for tc in tool_calls_data:
                            func = tc.get("function", {})
                            fn_name = func.get("name", "")
                            args_str = func.get("arguments", "{}")
                            try:
                                args = json.loads(args_str) if isinstance(args_str, str) else args_str
                            except Exception:
                                args = {"raw_arguments": args_str}
                            tool_calls.append(AIToolCall(
                                id=tc.get("id", f"call_{len(tool_calls)}"),
                                name=fn_name,
                                arguments=args
                            ))
                        
                        usage = data.get("usage", {})
                        return AIResponse(
                            content=content,
                            tool_calls=tool_calls,
                            prompt_tokens=usage.get("prompt_tokens", 0),
                            completion_tokens=usage.get("completion_tokens", 0),
                            total_tokens=usage.get("total_tokens", 0),
                            latency_ms=latency_ms,
                            finish_reason=choice.get("finish_reason"),
                            model=data.get("model", self.model_name)
                        )
                    elif resp.status_code in (500, 502, 503, 504) and retries < self.max_retries:
                        retries += 1
                        await asyncio.sleep(1.0 * (2 ** (retries - 1)))
                        continue
                    else:
                        self._handle_error_response(resp.status_code, resp.text)
            except httpx.TimeoutException:
                if retries < self.max_retries:
                    retries += 1
                    await asyncio.sleep(1.0 * (2 ** (retries - 1)))
                    continue
                raise AITimeoutError(f"Request to {self.model_name} timed out after {self.timeout_seconds}s")
            except (AIAuthenticationError, AIRateLimitError, AIQuotaExceededError, AIModelNotFoundError):
                raise
            except httpx.RequestError as exc:
                if retries < self.max_retries:
                    retries += 1
                    await asyncio.sleep(1.0 * (2 ** (retries - 1)))
                    continue
                raise AIProviderError(f"Network error during generation: {str(exc)}")

    async def generate_structured_response(
        self,
        messages: List[Dict[str, Any]],
        response_schema: Dict[str, Any],
        temperature: Optional[float] = None,
    ) -> Dict[str, Any]:
        """Generate structured response guaranteed to match schema"""
        # Append strict instructions to messages to guarantee valid JSON adhering to schema
        schema_instruction = (
            f"\n\nCRITICAL INSTRUCTION: You MUST return a single valid JSON object strictly matching this schema. "
            f"Do NOT include markdown backticks or commentary outside the JSON:\n"
            f"{json.dumps(response_schema, indent=2)}"
        )
        enhanced_messages = list(messages)
        enhanced_messages[-1] = {
            "role": enhanced_messages[-1]["role"],
            "content": str(enhanced_messages[-1]["content"]) + schema_instruction
        }

        response = await self.generate_response(
            messages=enhanced_messages,
            temperature=temperature if temperature is not None else 0.1,
            max_tokens=self.max_output_tokens
        )
        
        raw_text = response.content or "{}"
        clean_text = raw_text.strip()
        if clean_text.startswith("```json"):
            clean_text = clean_text[7:]
        elif clean_text.startswith("```"):
            clean_text = clean_text[3:]
        if clean_text.endswith("```"):
            clean_text = clean_text[:-3]
        clean_text = clean_text.strip()

        try:
            return json.loads(clean_text)
        except json.JSONDecodeError as e:
            # Fallback parse attempt finding outer { }
            first_brace = clean_text.find("{")
            last_brace = clean_text.rfind("}")
            if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
                try:
                    return json.loads(clean_text[first_brace:last_brace + 1])
                except Exception:
                    pass
            raise AIProviderError(f"Provider failed to return valid JSON: {str(e)}\nRaw: {raw_text[:300]}")

    async def stream_response(
        self,
        messages: List[Dict[str, Any]],
        tools: Optional[List[Dict[str, Any]]] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
    ) -> AsyncGenerator[AIStreamChunk, None]:
        url = f"{self.base_url}/chat/completions"
        payload: Dict[str, Any] = {
            "model": self.model_name,
            "messages": messages,
            "stream": True,
            "temperature": temperature if temperature is not None else self.temperature,
            "max_tokens": max_tokens if max_tokens is not None else self.max_output_tokens
        }
        if tools:
            payload["tools"] = tools
            payload["tool_choice"] = "auto"

        async with httpx.AsyncClient(timeout=float(self.timeout_seconds)) as client:
            async with client.stream("POST", url, headers=self._get_headers(), json=payload) as response:
                if response.status_code != 200:
                    body = await response.aread()
                    self._handle_error_response(response.status_code, body.decode("utf-8", errors="replace"))

                async for line in response.aiter_lines():
                    line = line.strip()
                    if not line or not line.startswith("data: "):
                        continue
                    data_str = line[6:].strip()
                    if data_str == "[DONE]":
                        break
                    try:
                        chunk_json = json.loads(data_str)
                        choice = chunk_json.get("choices", [{}])[0]
                        delta = choice.get("delta", {})
                        content_piece = delta.get("content")
                        tool_calls_piece = delta.get("tool_calls", [])
                        finish_reason = choice.get("finish_reason")

                        yield AIStreamChunk(
                            delta_content=content_piece,
                            delta_tool_calls=tool_calls_piece,
                            finish_reason=finish_reason
                        )
                    except Exception:
                        continue

    async def generate_embedding(self, text: str) -> List[float]:
        url = f"{self.base_url}/embeddings"
        payload = {
            "model": self.embedding_model_name,
            "input": text[:8000]
        }
        async with httpx.AsyncClient(timeout=float(min(30, self.timeout_seconds))) as client:
            try:
                resp = await client.post(url, headers=self._get_headers(), json=payload)
                if resp.status_code == 200:
                    data = resp.json()
                    return data.get("data", [{}])[0].get("embedding", [])
                else:
                    self._handle_error_response(resp.status_code, resp.text)
                    return []
            except Exception as e:
                # Log without raising so keyword fallback takes over gracefully
                return []
