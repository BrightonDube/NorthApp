from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    # Supabase
    supabase_url: str
    supabase_service_key: str
    supabase_jwt_secret: str = ""  # Legacy — no longer required; auth uses /auth/v1/user

    # LLM
    groq_api_key: str
    openai_api_key: str = ""

    # Push Notifications
    onesignal_app_id: str = ""
    onesignal_api_key: str = ""

    # Web Search
    tavily_api_key: str = ""

    # Google Calendar
    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = ""

    # App
    environment: str = "development"
    allowed_origins: str = "http://localhost:8081"

    @property
    def is_production(self) -> bool:
        return self.environment == "production"

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",")]

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False)


@lru_cache()
def get_settings() -> Settings:
    return Settings()
