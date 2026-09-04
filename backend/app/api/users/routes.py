from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.api.users.controller import UserController
from app.core.cookies import clear_auth_cookie
from app.core.database import get_db
from app.models.user import User
from app.schemas.user import AuthResponse, UserLogin, UserRegister, UserResponse


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
    response: Response,
    db: AsyncSession = Depends(get_db),
):

    return await UserController.register(
        db,
        data,
        response,
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