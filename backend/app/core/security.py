from datetime import datetime, timedelta, timezone
import secrets

import jwt
from pwdlib import PasswordHash

from app.core.config import settings


password_hash = PasswordHash.recommended()

_OTP_DIGITS = "0123456789"


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(
    password: str,
    hashed_password: str,
) -> bool:
    return password_hash.verify(
        password,
        hashed_password,
    )


def create_access_token(subject: str | int) -> str:
    """Create a signed JWT whose `sub` claim identifies the user."""
    now = datetime.now(timezone.utc)
    expires_delta = timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    payload = {
        "sub": str(subject),
        "iat": now,
        "exp": now + expires_delta,
    }
    return jwt.encode(
        payload,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )


def decode_access_token(token: str) -> dict:
    """Decode and validate a JWT. Raises jwt.PyJWTError on invalid/expired tokens."""
    return jwt.decode(
        token,
        settings.JWT_SECRET_KEY,
        algorithms=[settings.JWT_ALGORITHM],
    )


def generate_otp(length: int = 6) -> str:
    """Generate a cryptographically secure numeric OTP (default: 6 digits)."""
    return "".join(secrets.choice(_OTP_DIGITS) for _ in range(length))


def generate_reset_token() -> str:
    """Generate a cryptographically secure, URL-safe single-use reset token."""
    return secrets.token_urlsafe(32)