from fastapi import HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.users.service import UserService
from app.core.cookies import set_auth_cookie
from app.core.exceptions import InvalidCredentialsError, UserAlreadyExistsError
from app.schemas.user import AuthResponse, UserLogin, UserRegister, UserResponse


class UserController:

    @staticmethod
    async def register(
        db: AsyncSession,
        data: UserRegister,
        response: Response,
    ) -> AuthResponse:

        try:
            user = await UserService.register(db, data)

        except UserAlreadyExistsError as exc:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=str(exc),
            ) from exc

        token = UserService.issue_token(user)
        set_auth_cookie(response, token)

        return AuthResponse(
            message="User registered successfully",
            user=UserResponse.model_validate(user),
        )

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

        token = UserService.issue_token(user)
        set_auth_cookie(response, token)

        return AuthResponse(
            message="Logged in successfully",
            user=UserResponse.model_validate(user),
        )