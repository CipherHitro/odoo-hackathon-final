from sqlalchemy.ext.asyncio import AsyncSession

from app.api.users.redis_repository import RedisRepository
from app.api.users.repository import UserRepository
from app.core.config import settings
from app.core.exceptions import (
    InvalidCredentialsError,
    InvalidOTPError,
    InvalidResetTokenError,
    OTPAttemptsExceededError,
    OTPNotFoundError,
    UserAlreadyExistsError,
    UserNotFoundError,
)
from app.core.security import (
    create_access_token,
    generate_otp,
    generate_reset_token,
    hash_password,
    verify_password,
)
from app.models.user import User
from app.schemas.user import UserLogin, UserRegister
from app.services.email.service import send_password_reset_otp


class UserService:

    @staticmethod
    async def register(
        db: AsyncSession,
        data: UserRegister,
    ) -> User:

        existing_user = await UserRepository.get_by_email(
            db,
            data.email,
        )

        if existing_user:
            raise UserAlreadyExistsError("Email is already registered")

        password_hash = hash_password(
            data.password
        )

        return await UserRepository.create(
            db,
            name=data.name,
            email=data.email,
            password_hash=password_hash,
        )

    @staticmethod
    async def login(
        db: AsyncSession,
        data: UserLogin,
    ) -> User:

        user = await UserRepository.get_by_email(
            db,
            data.email,
        )

        if not user or not verify_password(
            data.password,
            user.password_hash,
        ):
            raise InvalidCredentialsError("Invalid email or password")

        return user

    @staticmethod
    def issue_token(user: User) -> str:
        """Issue a signed JWT for the given user."""
        return create_access_token(user.id)


class PasswordResetService:
    """Business logic for the forgot password / verify otp / reset password flow."""

    @staticmethod
    async def forgot_password(db: AsyncSession, email: str) -> None:
        user = await UserRepository.get_by_email(db, email)

        if not user:
            raise UserNotFoundError("No account found with this email")

        otp = generate_otp()

        # store the hash (never the raw OTP) - re-requesting overwrites and resets attempts
        await RedisRepository.save_otp(
            email=user.email,
            code_hash=hash_password(otp),
        )

        await send_password_reset_otp(
            to=user.email,
            name=user.name,
            otp=otp,
        )

    @staticmethod
    async def verify_otp(email: str, otp: str) -> str:
        record = await RedisRepository.get_otp(email)

        if not record:
            raise OTPNotFoundError(
                "OTP is invalid or has expired. Please request a new one."
            )

        if verify_password(otp, record["code_hash"]):
            # correct OTP - consume it and issue a single-use reset token
            await RedisRepository.delete_otp(email)

            reset_token = generate_reset_token()
            await RedisRepository.save_reset_token(reset_token, email)

            return reset_token

        # wrong OTP - burn one attempt
        remaining = await RedisRepository.decrement_otp_attempts(email)

        if remaining <= 0:
            await RedisRepository.delete_otp(email)
            raise OTPAttemptsExceededError(
                "Too many incorrect attempts. Please request a new OTP."
            )

        raise InvalidOTPError(
            f"Incorrect OTP. {remaining} "
            f"attempt{'s' if remaining != 1 else ''} remaining."
        )

    @staticmethod
    async def reset_password(
        db: AsyncSession,
        reset_token: str,
        new_password: str,
    ) -> None:
        email = await RedisRepository.get_reset_token_email(reset_token)

        if not email:
            raise InvalidResetTokenError("Reset token is invalid or has expired")

        user = await UserRepository.get_by_email(db, email)

        if not user:
            raise UserNotFoundError("No account found with this email")

        await UserRepository.update_password(
            db,
            user,
            hash_password(new_password),
        )

        # single use - the token can never reset the password again
        await RedisRepository.delete_reset_token(reset_token)