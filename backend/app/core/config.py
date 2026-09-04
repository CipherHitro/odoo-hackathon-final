from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # "development" or "production" - controls cookie security (and other env-specific behaviour)
    APP_ENV: str = "development"

    DATABASE_URL: str

    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    COOKIE_NAME: str = "access_token"
    COOKIE_HTTPONLY: bool = True
    COOKIE_SAMESITE: str = "lax"

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
    )

    @property
    def COOKIE_SECURE(self) -> bool:
        """Secure cookies are only sent over HTTPS - required in production."""
        return self.APP_ENV.strip().lower() == "production"

    @property
    def COOKIE_MAX_AGE(self) -> int:
        """Cookie lifetime in seconds - matches the access token lifetime."""
        return self.ACCESS_TOKEN_EXPIRE_MINUTES * 60


settings = Settings()