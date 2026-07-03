"""
AI service: OpenAI-compatible chat completions, embeddings, and AI command dispatch.
"""
from typing import Optional
import httpx

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

SYSTEM_PROMPT = (
    "You are SmartSync AI, an intelligent assistant embedded in a universal clipboard manager. "
    "You help users understand, organize, and transform their clipboard content."
)

AI_COMMANDS = {
    "/summarize": "Summarize the following content concisely:\n\n{content}",
    "/translate": "Translate the following content to English (detect source language automatically):\n\n{content}",
    "/rewrite": "Rewrite the following content to be clearer and more professional:\n\n{content}",
    "/explain": "Explain the following content in simple terms:\n\n{content}",
    "/markdown": "Convert the following content to well-formatted Markdown:\n\n{content}",
}


class AIService:
    def __init__(self) -> None:
        self._client: Optional[httpx.AsyncClient] = None

    def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                base_url=settings.OPENAI_BASE_URL,
                headers={"Authorization": f"Bearer {settings.OPENAI_API_KEY}"},
                timeout=60.0,
            )
        return self._client

    async def chat_completion(self, user_message: str, system: str = SYSTEM_PROMPT) -> str:
        if not settings.OPENAI_API_KEY:
            return "[AI unavailable: OPENAI_API_KEY not configured]"
        client = self._get_client()
        payload = {
            "model": settings.AI_MODEL,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user_message},
            ],
            "max_tokens": 1024,
            "temperature": 0.4,
        }
        resp = await client.post("/chat/completions", json=payload)
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"].strip()

    async def run_command(self, command: str, content: str, extra: dict | None = None) -> str:
        """Dispatch an AI slash command against the provided content."""
        template = AI_COMMANDS.get(command)
        if not template:
            raise ValueError(f"Unknown AI command: {command}")
        prompt = template.format(content=content[:6000])  # cap at 6k chars
        if extra and command == "/translate" and extra.get("target_language"):
            prompt = f"Translate the following content to {extra['target_language']}:\n\n{content[:6000]}"
        return await self.chat_completion(prompt)

    async def categorize_and_tag(self, content: str, content_type: str) -> dict:
        """Returns {category, tags, title} for a clipboard item."""
        prompt = (
            f"Analyze this {content_type} clipboard item and respond with JSON only (no markdown).\n"
            "Keys: category (string), tags (list of ≤5 strings), title (string ≤60 chars).\n\n"
            f"Content:\n{content[:3000]}"
        )
        try:
            raw = await self.chat_completion(prompt)
            import json
            return json.loads(raw)
        except Exception as e:
            logger.warning("AI categorize failed: %s", e)
            return {"category": "uncategorized", "tags": [], "title": None}

    async def get_embedding(self, text: str) -> list[float]:
        """Get an embedding vector from the OpenAI-compatible API."""
        if not settings.OPENAI_API_KEY:
            return []
        client = self._get_client()
        resp = await client.post(
            "/embeddings",
            json={"model": "text-embedding-3-small", "input": text[:8000]},
        )
        resp.raise_for_status()
        return resp.json()["data"][0]["embedding"]

    async def close(self) -> None:
        if self._client and not self._client.is_closed:
            await self._client.aclose()


ai_service = AIService()
