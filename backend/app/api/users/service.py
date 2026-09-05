from sqlalchemy.ext.asyncio import AsyncSession

from app.api.users.redis_repository import RedisRepository
from app.api.users.repository import UserRepository
from app.core.config import settings
from app.core.exceptions import (
    InactiveUserError,
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
from app.models.employee import EmployeeStatus
from app.models.user import User, UserRole
from app.schemas.user import UserLogin, UserRegister
from app.services.email.service import send_password_reset_otp


class UserService:

    @staticmethod
    async def register(
        db: AsyncSession,
        data: UserRegister,
    ) -> User:

        existing = await UserRepository.get_by_email(
            db,
            data.email,
        )

        if existing:
            raise UserAlreadyExistsError("A user with this email already exists")

        has_admin = await UserRepository.has_admin(
            db
        )

        # first user registered becomes an admin automatically
        role = (
            UserRole.ADMIN.value
            if not has_admin
            else (data.role.value if hasattr(data.role, "value") else str(data.role))
        )

        password_hash = hash_password(
            data.password
        )

        status_val = (
            data.status.value
            if hasattr(data.status, "value")
            else (str(data.status) if data.status else EmployeeStatus.ACTIVE.value)
        )

        return await UserRepository.create(
            db,
            name=data.name,
            email=data.email,
            password_hash=password_hash,
            role=role,
            is_active=data.is_active,
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

        if not user.is_active:
            raise InactiveUserError("Account is inactive or archived. Please contact your administrator.")

        return user

    @staticmethod
    def issue_token(user: User) -> str:
        """Issue a signed JWT for the given user."""
        return create_access_token(user.id)

    @staticmethod
    async def get_all(db: AsyncSession) -> list[User]:
        return await UserRepository.get_all(db)

    @staticmethod
    async def update(db: AsyncSession, user_id: int, data, current_user: User) -> User:
        user = await UserRepository.get_by_id(db, user_id)
        if not user:
            raise UserNotFoundError("User not found")

        # Prevent admin from changing their own role
        if current_user.id == user_id and data.role is not None and data.role.value != user.role:
            from app.core.exceptions import AppError
            raise AppError("You cannot modify your own administrative role.")

        if current_user.id == user_id and (data.is_active is False or (data.status and data.status != EmployeeStatus.ACTIVE)):
            from app.core.exceptions import AppError
            raise AppError("You cannot deactivate or archive your own account.")

        update_data = data.model_dump(exclude_unset=True)
        if "role" in update_data and update_data["role"] is not None:
            update_data["role"] = update_data["role"].value if hasattr(update_data["role"], "value") else str(update_data["role"])

        status_val = None
        if "status" in update_data and update_data["status"] is not None:
            raw_status = update_data.pop("status")
            status_val = raw_status.value if hasattr(raw_status, "value") else str(raw_status)
            update_data["is_active"] = (status_val == EmployeeStatus.ACTIVE.value)
        elif "is_active" in update_data and update_data["is_active"] is not None:
            status_val = EmployeeStatus.ACTIVE.value if update_data["is_active"] else EmployeeStatus.INACTIVE.value

        updated_user = await UserRepository.update(db, user, **update_data)

        # Synchronize status with linked Employee
        if status_val is not None:
            from app.models.employee import Employee
            from sqlalchemy import select
            emp_result = await db.execute(
                select(Employee).where((Employee.user_id == user.id) | (Employee.work_email == user.email))
            )
            emp = emp_result.scalar_one_or_none()
            if emp:
                emp.status = status_val
                db.add(emp)
                await db.commit()

        return updated_user


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