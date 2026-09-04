"""Redis data access for the password reset flow.

Stores the hashed OTP (with an attempts counter) and the single-use reset
token, both with automatic expiry via Redis TTLs:

    password_reset:otp:{email}      -> hash {code_hash, attempts}
    password_reset:token:{token}    -> email of the user the token belongs to
"""

from app.core.config import settings
from app.core.redis import redis_client

OTP_MAX_ATTEMPTS = 5

OTP_KEY_PREFIX = "password_reset:otp:"
TOKEN_KEY_PREFIX = "password_reset:token:"

OTP_TTL_SECONDS = settings.OTP_EXPIRE_MINUTES * 60
RESET_TOKEN_TTL_SECONDS = settings.RESET_TOKEN_EXPIRE_MINUTES * 60


def _otp_key(email: str) -> str:
    return OTP_KEY_PREFIX + email


def _token_key(reset_token: str) -> str:
    return TOKEN_KEY_PREFIX + reset_token


class RedisRepository:
    """All Redis operations for the password reset flow live here."""

    @staticmethod
    async def save_otp(email: str, code_hash: str) -> None:
        """Store the OTP hash with a fresh attempts counter and expiry.

        Overwrites any previous OTP for this email (re-request = fresh start).
        """
        key = _otp_key(email)

        await redis_client.hset(
            key,
            mapping={
                "code_hash": code_hash,
                "attempts": OTP_MAX_ATTEMPTS,
            },
        )
        await redis_client.expire(key, OTP_TTL_SECONDS)

    @staticmethod
    async def get_otp(email: str) -> dict | None:
        """Return {"code_hash": ..., "attempts": ...} or None if missing/expired."""
        data = await redis_client.hgetall(_otp_key(email))
        return data or None

    @staticmethod
    async def delete_otp(email: str) -> None:
        await redis_client.delete(_otp_key(email))

    @staticmethod
    async def decrement_otp_attempts(email: str) -> int:
        """Decrease the attempts counter by one and return the remaining count."""
        return int(
            await redis_client.hincrby(_otp_key(email), "attempts", -1)
        )

    @staticmethod
    async def save_reset_token(reset_token: str, email: str) -> None:
        await redis_client.set(
            _token_key(reset_token),
            email,
            ex=RESET_TOKEN_TTL_SECONDS,
        )

    @staticmethod
    async def get_reset_token_email(reset_token: str) -> str | None:
        return await redis_client.get(_token_key(reset_token))

    @staticmethod
    async def delete_reset_token(reset_token: str) -> None:
        await redis_client.delete(_token_key(reset_token))