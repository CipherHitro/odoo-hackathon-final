from fastapi import HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.users.service import PasswordResetService, UserService
from app.core.config import settings
from app.core.cookies import set_auth_cookie
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
from app.models.user import User
from app.schemas.user import (
    AuthResponse,
    ForgotPasswordRequest,
    MessageResponse,
    ResetPasswordRequest,
    UserLogin,
    UserRegister,
    UserResponse,
    VerifyOTPRequest,
    VerifyOTPResponse,
)


class UserController:

    @staticmethod
    async def register(
        db: AsyncSession,
        data: UserRegister,
        current_admin: User | None = None,
    ) -> AuthResponse:

        try:
            user = await UserService.register(db, data)

        except UserAlreadyExistsError as exc:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=str(exc),
            ) from exc

        message = (
            "Admin registered successfully"
            if current_admin is None
            else "User created successfully"
        )

        return AuthResponse(
            message=message,
            user=UserResponse.model_validate(user),
        )

    @staticmethod
    async def get_all(db: AsyncSession) -> list[UserResponse]:
        users = await UserService.get_all(db)
        from app.models.employee import Employee
        from sqlalchemy import select
        emp_res = await db.execute(select(Employee))
        emps = emp_res.scalars().all()
        emp_by_uid = {e.user_id: e for e in emps if e.user_id}
        emp_by_email = {e.work_email: e for e in emps if e.work_email}

        res = []
        for u in users:
            emp = emp_by_uid.get(u.id) or emp_by_email.get(u.email)
            st = emp.status if emp else ("active" if u.is_active else "inactive")
            item = UserResponse.model_validate(u)
            item.status = st
            res.append(item)
        return res

    @staticmethod
    async def update(db: AsyncSession, user_id: int, data, current_user: User) -> UserResponse:
        try:
            user = await UserService.update(db, user_id, data, current_user)
            from app.models.employee import Employee
            from sqlalchemy import select
            emp_res = await db.execute(select(Employee).where((Employee.user_id == user.id) | (Employee.work_email == user.email)))
            emp = emp_res.scalar_one_or_none()
            st = emp.status if emp else ("active" if user.is_active else "inactive")
            resp = UserResponse.model_validate(user)
            resp.status = st
            return resp
        except UserNotFoundError as exc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(exc),
            ) from exc
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(exc),
            ) from exc

    @staticmethod
    async def login(
        db: AsyncSession,
        data: UserLogin,
        response: Response,
    ) -> AuthResponse:

        try:
            user = await UserService.login(db, data)
        except InvalidCredentialsError as exc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=str(exc),
            ) from exc
        except InactiveUserError as exc:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=str(exc),
            ) from exc

        token = UserService.issue_token(user)
        set_auth_cookie(response, token)

        return AuthResponse(
            message="Logged in successfully",
            user=UserResponse.model_validate(user),
        )

    @staticmethod
    async def forgot_password(
        db: AsyncSession,
        data: ForgotPasswordRequest,
    ) -> MessageResponse:

        try:
            await PasswordResetService.forgot_password(db, data.email)
        except UserNotFoundError as exc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(exc),
            ) from exc

        return MessageResponse(
            message="OTP sent to your email. It expires in "
            f"{settings.OTP_EXPIRE_MINUTES} minutes."
        )

    @staticmethod
    async def verify_otp(
        data: VerifyOTPRequest,
    ) -> VerifyOTPResponse:

        try:
            reset_token = await PasswordResetService.verify_otp(
                data.email,
                data.otp,
            )
        except (OTPNotFoundError, InvalidOTPError) as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(exc),
            ) from exc
        except OTPAttemptsExceededError as exc:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=str(exc),
            ) from exc

        return VerifyOTPResponse(
            message="OTP verified successfully",
            reset_token=reset_token,
        )

    @staticmethod
    async def reset_password(
        db: AsyncSession,
        data: ResetPasswordRequest,
    ) -> MessageResponse:

        try:
            await PasswordResetService.reset_password(
                db,
                data.reset_token,
                data.new_password,
            )
        except InvalidResetTokenError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(exc),
            ) from exc
        except UserNotFoundError as exc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(exc),
            ) from exc

        return MessageResponse(
            message="Password reset successfully. You can now log in with your new password."
        )