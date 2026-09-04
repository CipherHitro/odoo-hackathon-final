from sqlalchemy.ext.asyncio import AsyncSession

from app.api.users.repository import UserRepository
from app.core.exceptions import InvalidCredentialsError, UserAlreadyExistsError
from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User
from app.schemas.user import UserLogin, UserRegister


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