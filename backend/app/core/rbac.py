from collections.abc import Callable
from fastapi import Depends, HTTPException, status

from app.api.deps import get_current_user
from app.models.user import User, UserRole


def require_roles(*roles: str | UserRole) -> Callable:
    """FastAPI dependency to enforce Role-Based Access Control (RBAC).

    Usage:
        current_user: User = Depends(require_roles(UserRole.ADMIN))
        current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.HR_MANAGER))
    """
    allowed_roles = {
        r.value if isinstance(r, UserRole) else str(r) for r in roles
    }

    async def role_checker(
        current_user: User = Depends(get_current_user),
    ) -> User:
        if not current_user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is inactive",
            )

        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )

        return current_user

    return role_checker
