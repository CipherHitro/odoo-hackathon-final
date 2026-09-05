from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_admin_or_bootstrap, get_current_user, require_roles
from app.api.users.controller import UserController
from app.core.cookies import clear_auth_cookie
from app.core.database import get_db
from app.models.user import User, UserRole
from app.schemas.user import (
    AuthResponse,
    ForgotPasswordRequest,
    MessageResponse,
    ResetPasswordRequest,
    UserLogin,
    UserRegister,
    UserResponse,
    UserUpdate,
    VerifyOTPRequest,
    VerifyOTPResponse,
)


router = APIRouter(
    prefix="/auth",
    tags=["Auth"],
)


@router.post(
    "/register",
    response_model=AuthResponse,
    status_code=status.HTTP_201_CREATED,
)
async def register(
    data: UserRegister,
    db: AsyncSession = Depends(get_db),
    current_admin: User | None = Depends(get_current_admin_or_bootstrap),
):

    return await UserController.register(
        db,
        data,
        current_admin=current_admin,
    )


@router.post(
    "/login",
    response_model=AuthResponse,
    status_code=status.HTTP_200_OK,
)
async def login(
    data: UserLogin,
    response: Response,
    db: AsyncSession = Depends(get_db),
):

    return await UserController.login(
        db,
        data,
        response,
    )


@router.get(
    "/me",
    response_model=UserResponse,
)
async def me(
    current_user: User = Depends(get_current_user),
):

    return current_user


@router.post(
    "/logout",
    status_code=status.HTTP_200_OK,
)
async def logout(
    response: Response,
):

    clear_auth_cookie(response)

    return {
        "message": "Logged out successfully"
    }


@router.post(
    "/forgot-password",
    response_model=MessageResponse,
    status_code=status.HTTP_200_OK,
)
async def forgot_password(
    data: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
):

    return await UserController.forgot_password(db, data)


@router.post(
    "/verify-otp",
    response_model=VerifyOTPResponse,
    status_code=status.HTTP_200_OK,
)
async def verify_otp(
    data: VerifyOTPRequest,
):

    return await UserController.verify_otp(data)


@router.post(
    "/reset-password",
    response_model=MessageResponse,
    status_code=status.HTTP_200_OK,
)
async def reset_password(
    data: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
):

    return await UserController.reset_password(db, data)


@router.get(
    "/users",
    response_model=list[UserResponse],
)
async def list_users(
    current_admin: User = Depends(require_roles(UserRole.ADMIN.value)),
    db: AsyncSession = Depends(get_db),
):
    return await UserController.get_all(db)


@router.patch(
    "/users/{user_id}",
    response_model=UserResponse,
)
async def update_user(
    user_id: int,
    data: UserUpdate,
    current_admin: User = Depends(require_roles(UserRole.ADMIN.value)),
    db: AsyncSession = Depends(get_db),
):
    return await UserController.update(db, user_id, data, current_user=current_admin)