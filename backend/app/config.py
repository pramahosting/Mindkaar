"""
Central configuration for Mental Gym backend.
Everything that could reasonably change between environments (which LLM,
which DB, which frontend origin) lives here and is read from environment
variables / .env, never hard-coded elsewhere.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite:///./mental_gym.db"

    llm_provider: str = "ollama"        # "ollama" | "demo"
    llm_model: str = "qwen2.5:3b"
    ollama_base_url: str = "http://localhost:11434"
    llm_timeout_seconds: int = 25

    frontend_origin: str = "http://localhost:3000"


settings = Settings()
