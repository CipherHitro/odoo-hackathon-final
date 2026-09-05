import jwt
from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.users.repository import UserRepository
from app.core.config import settings
from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.user import User


async def get_current_user(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> User:
    """FastAPI dependency: resolve the authenticated user from the auth cookie."""
    token = request.cookies.get(settings.COOKIE_NAME)

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    try:
        payload = decode_access_token(token)
    except jwt.PyJWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        ) from exc

    try:
        user_id = int(payload["sub"])
    except (KeyError, TypeError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        ) from exc

    user = await UserRepository.get_by_id(db, user_id)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive",
        )

    return user


async def get_current_admin_or_bootstrap(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> User | None:
    """FastAPI dependency for user registration:
    - If no admin exists in the system (bootstrap phase), allows registration without auth (returns None).
    - Otherwise, requires an authenticated user with ADMIN role.
    """
    has_admin = await UserRepository.has_admin(db)
    if not has_admin:
        return None

    current_user = await get_current_user(request, db)
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can register users",
        )

    return current_user