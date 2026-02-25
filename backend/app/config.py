from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    # Supabase
    supabase_url: str
    supabase_service_key: str
    # JWT_SECRET removed - now using JWKS endpoint with ES256 algorithm

    # LLM
    groq_api_key: str
    anthropic_api_key: str = ""
    gemini_api_key: str = ""

    # Embeddings (Voyage AI)
    voyage_api_key: str
    voyage_embedding_model: str = "voyage-3-lite"
    memory_embedding_dimensions: int = 1536

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

    # Monitoring
    sentry_dsn: str = ""
    sentry_traces_sample_rate: float = 0.1
    sentry_profiles_sample_rate: float = 0.1

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
