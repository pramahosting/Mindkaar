"""
Application configuration.

All settings are loaded from environment variables (or a local .env file
during development). Nothing sensitive is hardcoded, and the Groq API key
never leaves the server — the frontend only ever talks to *this* API.
"""

from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Required — the server-side Groq API key. Never exposed to clients.
    groq_api_key: str

    # Model used unless the client requests a different one.
    default_model: str = "openai/gpt-oss-120b"

    # Origins allowed to call this API (your frontend's origin(s)).
    # Comma-separated in .env, e.g. ALLOWED_ORIGINS=http://localhost:5500,http://127.0.0.1:5500
    allowed_origins: str = "*"

    # Per-request timeouts, in seconds.
    topics_timeout_seconds: float = 45.0
    questions_timeout_seconds: float = 60.0

    @property
    def allowed_origins_list(self) -> List[str]:
        if self.allowed_origins.strip() == "*":
            return ["*"]
        return [origin.strip() for origin in self.allowed_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    """Cached so we only read/parse the environment once."""
    return Settings()
