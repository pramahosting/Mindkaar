"""
Thin wrapper around the official Groq Python SDK.

Everything network- and parsing-related lives here so the route handlers
stay simple. Every failure mode is turned into one of the typed exceptions
below so callers (the routers) can map them to sensible HTTP responses
instead of a generic 500.
"""

import json
import logging
import re
from typing import Any, Dict, Optional

from groq import AsyncGroq
from groq import (
    APIConnectionError,
    APITimeoutError,
    APIStatusError,
    AuthenticationError,
    RateLimitError,
    BadRequestError,
)

from app.config import get_settings

logger = logging.getLogger("quiet_hours.groq_client")

_settings = get_settings()
_client = AsyncGroq(api_key=_settings.groq_api_key)


# ---------------------------------------------------------------------------
# Typed exceptions — one per failure mode we distinguish in the UI/logs.
# ---------------------------------------------------------------------------
class GroqCallError(Exception):
    """Base class for all errors raised by this module."""

    def __init__(self, message: str, code: str):
        super().__init__(message)
        self.message = message
        self.code = code


class GroqAuthError(GroqCallError):
    def __init__(self, message: str = "Groq rejected the server's API key."):
        super().__init__(message, "AUTH_ERROR")


class GroqRateLimitError(GroqCallError):
    def __init__(self, message: str = "Groq rate limit reached. Try again shortly."):
        super().__init__(message, "RATE_LIMIT")


class GroqBadRequestError(GroqCallError):
    def __init__(self, message: str = "Groq rejected the request."):
        super().__init__(message, "BAD_REQUEST")


class GroqTimeoutError(GroqCallError):
    def __init__(self, message: str = "Groq didn't respond in time."):
        super().__init__(message, "TIMEOUT")


class GroqUnreachableError(GroqCallError):
    def __init__(self, message: str = "Could not reach the Groq API."):
        super().__init__(message, "NETWORK_ERROR")


class GroqParseError(GroqCallError):
    def __init__(self, message: str = "Could not parse the model's JSON output."):
        super().__init__(message, "PARSE_ERROR")


class GroqEmptyResponseError(GroqCallError):
    def __init__(self, message: str = "The model returned an empty or unusable response."):
        super().__init__(message, "EMPTY_RESPONSE")


class GroqUpstreamError(GroqCallError):
    def __init__(self, message: str = "Groq API returned an unexpected error."):
        super().__init__(message, "API_ERROR")


# ---------------------------------------------------------------------------
# Model helpers
# ---------------------------------------------------------------------------
def supports_strict_schema(model: str) -> bool:
    """Strict JSON-Schema structured outputs are only guaranteed on the
    openai/gpt-oss models; everything else falls back to JSON Object Mode."""
    return model.startswith("openai/gpt-oss")


def is_reasoning_model(model: str) -> bool:
    """Reasoning-capable models need reasoning_format explicitly set when
    JSON mode is used, or chain-of-thought text can leak into the content
    and break JSON parsing."""
    lowered = model.lower()
    return (
        model.startswith("openai/gpt-oss")
        or "qwen" in lowered
        or "deepseek" in lowered
    )


# ---------------------------------------------------------------------------
# Robust JSON parsing — defensive against models that don't perfectly honor
# response_format (markdown fences, the "{{ }}" double-brace artifact, etc.)
# ---------------------------------------------------------------------------
def try_parse_json(raw: Optional[str]) -> Optional[Any]:
    if raw is None:
        return None
    if not isinstance(raw, str):
        return raw

    text = raw.strip()
    if not text:
        return None

    # strip ```json ... ``` or ``` ... ``` fences
    text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.IGNORECASE)
    text = re.sub(r"\s*```$", "", text, flags=re.IGNORECASE)
    text = text.strip()

    attempts = [text, text.replace("{{", "{").replace("}}", "}")]
    for attempt in attempts:
        try:
            return json.loads(attempt)
        except (json.JSONDecodeError, ValueError):
            continue

    match = re.search(r"\{[\s\S]*\}", text)
    if match:
        block = match.group(0)
        for attempt in [block, block.replace("{{", "{").replace("}}", "}")]:
            try:
                return json.loads(attempt)
            except (json.JSONDecodeError, ValueError):
                continue

    return None


def normalize_list(data: Any, key: str) -> list:
    """Accepts {key: [...]}, a bare list, a JSON-encoded string of either,
    or a single item — always returns a plain list."""
    if not data:
        return []
    if isinstance(data, str):
        return normalize_list(try_parse_json(data), key)
    if isinstance(data, list):
        return [item for item in data if item]
    if isinstance(data, dict) and data.get(key):
        value = data[key]
        return [item for item in value if item] if isinstance(value, list) else [value]
    return []


# ---------------------------------------------------------------------------
# The Groq call itself
# ---------------------------------------------------------------------------
async def generate_structured_json(
    *,
    system_prompt: str,
    user_prompt: str,
    schema_name: str,
    schema: Dict[str, Any],
    result_key: str,
    model: Optional[str] = None,
    timeout_seconds: float = 60.0,
) -> list:
    """
    Calls Groq's chat completions API asking for JSON matching `schema`,
    parses the result defensively, and returns the list found under
    `result_key`. Raises a GroqCallError subclass on any failure.
    """
    model = model or _settings.default_model

    response_format: Dict[str, Any]
    if supports_strict_schema(model):
        response_format = {
            "type": "json_schema",
            "json_schema": {"name": schema_name, "strict": True, "schema": schema},
        }
    else:
        response_format = {"type": "json_object"}

    extra_kwargs: Dict[str, Any] = {}
    if is_reasoning_model(model):
        # Required by Groq when JSON mode is combined with a reasoning model —
        # otherwise chain-of-thought text can leak into `content` and break parsing.
        extra_kwargs["reasoning_format"] = "hidden"

    try:
        completion = await _client.with_options(timeout=timeout_seconds).chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.9,
            max_completion_tokens=4096,
            response_format=response_format,
            **extra_kwargs,
        )
    except AuthenticationError as exc:
        logger.error("Groq authentication failed: %s", exc)
        raise GroqAuthError() from exc
    except RateLimitError as exc:
        logger.warning("Groq rate limit hit: %s", exc)
        raise GroqRateLimitError() from exc
    except BadRequestError as exc:
        logger.error("Groq rejected the request: %s", exc)
        raise GroqBadRequestError(str(exc)) from exc
    except APITimeoutError as exc:
        logger.error("Groq request timed out: %s", exc)
        raise GroqTimeoutError() from exc
    except APIConnectionError as exc:
        logger.error("Could not reach Groq: %s", exc)
        raise GroqUnreachableError() from exc
    except APIStatusError as exc:
        logger.error("Groq API error (%s): %s", exc.status_code, exc)
        raise GroqUpstreamError(f"Groq API responded with status {exc.status_code}.") from exc

    if not completion.choices:
        logger.error("Groq response had no choices: %s", completion)
        raise GroqEmptyResponseError()

    content = completion.choices[0].message.content
    if not content:
        logger.error("Groq response had no message content: %s", completion)
        raise GroqEmptyResponseError()

    data = try_parse_json(content)
    if data is None:
        logger.error("Could not parse model JSON output: %s", content[:500])
        raise GroqParseError(
            "Could not parse the model's JSON output. Try again, or switch to a model "
            "with structured-output support (openai/gpt-oss-120b or openai/gpt-oss-20b)."
        )

    items = normalize_list(data, result_key)
    if not items:
        logger.error('Groq returned JSON but no "%s" were found in it: %s', result_key, data)
        raise GroqEmptyResponseError(f"The model didn't return any {result_key}.")

    return items
