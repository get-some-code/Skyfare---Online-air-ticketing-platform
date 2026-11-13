from functools import lru_cache
from typing import Literal

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "SkyFare API"
    app_env: Literal["development", "test", "staging", "production"] = "development"
    api_v1_prefix: str = "/api/v1"
    log_level: Literal["CRITICAL", "ERROR", "WARNING", "INFO", "DEBUG"] = "INFO"
    database_url: str = (
        "postgresql+psycopg://skyfare:replace-this-local-password@localhost:5432/skyfare"
    )
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"
    jwt_secret_key: SecretStr | None = None
    jwt_access_token_minutes: int = 1440
    jwt_refresh_token_days: int = 30
    aviationstack_api_key: SecretStr | None = None
    aviationstack_base_url: str = "https://api.aviationstack.com"
    serpapi_api_key: SecretStr | None = None
    serpapi_base_url: str = "https://serpapi.com/search.json"
    groq_api_key: SecretStr | None = None
    gemini_api_key: SecretStr | None = None

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
