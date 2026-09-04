from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # "development" or "production" - controls cookie security (and other env-specific behaviour)
    APP_ENV: str = "development"

    # App identity - used in email subjects and templates
    APP_NAME: str = "Odoo-Final-Hackathon"

    DATABASE_URL: str

    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    COOKIE_NAME: str = "access_token"
    COOKIE_HTTPONLY: bool = True
    COOKIE_SAMESITE: str = "lax"

    RESEND_API_KEY: str
    RESEND_FROM_EMAIL: str

    # How long a password reset OTP stays valid (minutes) - shown in the email too
    OTP_EXPIRE_MINUTES: int = 10

    # How long the single-use reset token (issued after OTP verification) stays valid
    RESET_TOKEN_EXPIRE_MINUTES: int = 15
    
    REDIS_URL: str = "redis://localhost:6379"

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