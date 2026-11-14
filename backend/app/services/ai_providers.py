import json
import logging
import re
from typing import Any

import httpx

from app.core.config import get_settings

logger = logging.getLogger(__name__)


class AIProviderError(Exception):
    """Raised when an AI provider fails."""
    pass


async def call_groq_json(
    prompt: str,
    system_prompt: str,
    schema: type | None = None,
    max_tokens: int = 4000,
    model: str | None = None,
    timeout_seconds: float | None = None,
) -> dict[str, Any]:
    settings = get_settings()
    api_key = settings.groq_api_key.get_secret_value() if settings.groq_api_key else None
    if not api_key:
        raise AIProviderError("Groq API key not configured.")

    active_model = model or settings.planner_groq_model
    timeout = timeout_seconds or settings.planner_groq_timeout_seconds

    messages = [
        {"role": "system", "content": f"{system_prompt}\nYou MUST respond with strictly valid JSON only. Do not output markdown codeblocks, do not add introductory remarks."},
        {"role": "user", "content": prompt},
    ]

    async with httpx.AsyncClient(timeout=timeout) as client:
        try:
            resp = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": active_model,
                    "messages": messages,
                    "response_format": {"type": "json_object"},
                    "max_tokens": max_tokens,
                    "temperature": 0.3,
                },
            )
        except Exception as e:
            raise AIProviderError(f"Groq network error: {e}") from e

        if resp.status_code != 200:
            raise AIProviderError(f"Groq HTTP {resp.status_code}: {resp.text[:300]}")

        data = resp.json()
        content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
        if not content:
            raise AIProviderError("Groq returned empty response content.")

        try:
            cleaned = content.strip()
            if cleaned.startswith("```json"):
                cleaned = cleaned[7:]
            if cleaned.startswith("```"):
                cleaned = cleaned[3:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            return json.loads(cleaned.strip())
        except Exception as e:
            raise AIProviderError(f"Failed to parse JSON from Groq: {e} | Content: {content[:200]}") from e


async def call_gemini_json(
    prompt: str,
    system_prompt: str,
    schema: type | None = None,
    max_tokens: int = 4000,
    model: str | None = None,
    timeout_seconds: float | None = None,
) -> dict[str, Any]:
    settings = get_settings()
    api_key = settings.gemini_api_key.get_secret_value() if settings.gemini_api_key else None
    if not api_key:
        raise AIProviderError("Gemini API key not configured.")

    active_model = model or settings.planner_gemini_model
    timeout = timeout_seconds or settings.planner_gemini_timeout_seconds

    system_instruction = f"{system_prompt}\nYou MUST output strictly valid raw JSON only, compliant with RFC 8259."

    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [{"text": f"[SYSTEM INSTRUCTION: {system_instruction}]\n\n{prompt}"}],
            }
        ],
        "generationConfig": {
            "responseMimeType": "application/json",
            "maxOutputTokens": max_tokens,
            "temperature": 0.3,
        },
    }

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{active_model}:generateContent?key={api_key}"

    async with httpx.AsyncClient(timeout=timeout) as client:
        try:
            resp = await client.post(url, json=payload)
        except Exception as e:
            raise AIProviderError(f"Gemini network error: {e}") from e

        if resp.status_code != 200:
            raise AIProviderError(f"Gemini HTTP {resp.status_code}: {resp.text[:300]}")

        data = resp.json()
        parts = data.get("candidates", [{}])[0].get("content", {}).get("parts", [])
        if not parts or "text" not in parts[0]:
            raise AIProviderError("Gemini returned empty candidate parts.")

        text = parts[0]["text"].strip()
        try:
            cleaned = text
            if cleaned.startswith("```json"):
                cleaned = cleaned[7:]
            if cleaned.startswith("```"):
                cleaned = cleaned[3:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            return json.loads(cleaned.strip())
        except Exception as e:
            raise AIProviderError(f"Failed to parse JSON from Gemini: {e} | Content: {text[:200]}") from e
