"""
Application configuration.

All settings are loaded from environment variables (or a local .env file
during development). The Groq API key never leaves the server - the
frontend only ever talks to this API, never Groq directly.
"""

from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Required - the server-side Groq API key. Never exposed to clients.
    groq_api_key: str = ""

    # Model used unless a request specifies otherwise.
    default_model: str = "openai/gpt-oss-120b"

    # Auth
    secret_key: str = "change-me-to-a-long-random-string"
    access_token_expire_minutes: int = 60 * 24
    algorithm: str = "HS256"

    # Database - defaults to local SQLite, zero setup required.
    database_url: str = "sqlite:///./mindgym.db"

    # Alternative to DATABASE_URL: set these instead if your Neon password
    # contains characters like @ : / % # ? & or a space - those break when
    # embedded directly in a URL string, but are handled correctly when
    # passed as separate fields (see database.py). If pg_host is set, these
    # take priority over DATABASE_URL.
    pg_host: str = ""
    pg_port: int = 5432
    pg_user: str = ""
    pg_password: str = ""
    pg_database: str = ""
    pg_sslmode: str = "require"
    pg_channel_binding: str = "require"

    # Origins allowed to call this API (your frontend's origin(s)).
    allowed_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    # Per-request Groq timeouts, in seconds.
    scenario_timeout_seconds: float = 45.0
    questions_timeout_seconds: float = 60.0
    status_timeout_seconds: float = 30.0

    # Timeout for the "Run Simulation" feature's per-turn Groq call.
    simulation_timeout_seconds: float = 30.0

    @property
    def allowed_origins_list(self) -> List[str]:
        if self.allowed_origins.strip() == "*":
            return ["*"]
        return [origin.strip() for origin in self.allowed_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    """Cached so we only read/parse the environment once."""
    return Settings()
