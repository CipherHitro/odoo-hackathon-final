from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User, UserRole


class UserRepository:

    @staticmethod
    async def get_by_email(
        db: AsyncSession,
        email: str,
    ) -> User | None:

        result = await db.execute(
            select(User).where(User.email == email)
        )

        return result.scalar_one_or_none()

    @staticmethod
    async def get_by_id(
        db: AsyncSession,
        user_id: int,
    ) -> User | None:

        result = await db.execute(
            select(User).where(User.id == user_id)
        )

        return result.scalar_one_or_none()

    @staticmethod
    async def count(db: AsyncSession) -> int:
        result = await db.execute(select(func.count(User.id)))
        return result.scalar() or 0

    @staticmethod
    async def has_admin(db: AsyncSession) -> bool:
        result = await db.execute(
            select(func.count(User.id)).where(User.role == UserRole.ADMIN.value)
        )
        return (result.scalar() or 0) > 0

    @staticmethod
    async def create(
        db: AsyncSession,
        name: str,
        email: str,
        password_hash: str,
        role: str = UserRole.EMPLOYEE.value,
        is_active: bool = True,
    ) -> User:

        user = User(
            name=name,
            email=email,
            password_hash=password_hash,
            role=role,
            is_active=is_active,
        )

        db.add(user)

        await db.commit()
        await db.refresh(user)

        return user

    @staticmethod
    async def update_password(
        db: AsyncSession,
        user: User,
        password_hash: str,
    ) -> None:

        user.password_hash = password_hash

        db.add(user)
        await db.commit()

    @staticmethod
    async def get_all(db: AsyncSession) -> list[User]:
        result = await db.execute(select(User).order_by(User.id.asc()))
        return list(result.scalars().all())

    @staticmethod
    async def update(db: AsyncSession, user: User, **fields) -> User:
        for key, val in fields.items():
            if val is not None:
                setattr(user, key, val)
        db.add(user)
        await db.commit()
        await db.refresh(user)
        return user