from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import List


class Settings(BaseSettings):
    # App
    APP_NAME: str = "AI Interview Assistant"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    # Gemini
    GEMINI_API_KEY: str = ""

    # Database
    DATABASE_URL: str = "sqlite:///./interview.db"

    # CORS
    ALLOWED_ORIGINS: str = "http://localhost:3000"

    def get_allowed_origins(self) -> List[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]

    model_config = {"env_file": ".env"}


@lru_cache()
def get_settings() -> Settings:
    return Settings()