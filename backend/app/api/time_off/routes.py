# Purpose: FastAPI route definitions for Time Off (/time-off/types, /time-off/allocations, /time-off/requests).
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_roles
from app.api.time_off.controller import TimeOffController
from app.core.database import get_db
from app.models.user import User, UserRole
from app.schemas.time_off import (
    MessageResponse,
    TimeOffAllocationCreate,
    TimeOffAllocationListResponse,
    TimeOffAllocationResponse,
    TimeOffRequestCreate,
    TimeOffRequestListResponse,
    TimeOffRequestResponse,
    TimeOffTypeCreate,
    TimeOffTypeListResponse,
    TimeOffTypeResponse,
    TimeOffTypeUpdate,
)

router = APIRouter(prefix="/time-off", tags=["Time Off"])

# All roles other than basic employee can approve and manage time off
HR_ROLES = tuple(role.value for role in UserRole if role != UserRole.EMPLOYEE)


# -----------------------------------------------------------------------------
# 1. Leave Types Endpoints
# -----------------------------------------------------------------------------

@router.get(
    "/types",
    response_model=TimeOffTypeListResponse,
    status_code=status.HTTP_200_OK,
)
async def list_time_off_types(
    is_active: bool | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all available time off / leave types."""
    return await TimeOffController.list_types(db, is_active=is_active)


@router.post(
    "/types",
    response_model=TimeOffTypeResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_time_off_type(
    data: TimeOffTypeCreate,
    current_user: User = Depends(require_roles(*HR_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    """Create a new time off type (HR/Admin only)."""
    return await TimeOffController.create_type(db, data)


@router.patch(
    "/types/{type_id}",
    response_model=TimeOffTypeResponse,
    status_code=status.HTTP_200_OK,
)
async def update_time_off_type(
    type_id: int,
    data: TimeOffTypeUpdate,
    current_user: User = Depends(require_roles(*HR_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    """Update an existing time off type (HR/Admin only)."""
    return await TimeOffController.update_type(db, type_id, data)


# -----------------------------------------------------------------------------
# 2. Leave Allocations Endpoints
# -----------------------------------------------------------------------------

@router.get(
    "/allocations",
    response_model=TimeOffAllocationListResponse,
    status_code=status.HTTP_200_OK,
)
async def list_allocations(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    employee_id: int | None = Query(default=None),
    type_id: int | None = Query(default=None),
    status: str | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List leave allocations (regular employees see own; HR/Admin see all)."""
    return await TimeOffController.list_allocations(
        db,
        user=current_user,
        skip=skip,
        limit=limit,
        employee_id=employee_id,
        type_id=type_id,
        status_filter=status,
    )


@router.post(
    "/allocations",
    response_model=TimeOffAllocationResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_allocation(
    data: TimeOffAllocationCreate,
    current_user: User = Depends(require_roles(*HR_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    """Allocate leave balance to an employee (HR/Admin only)."""
    return await TimeOffController.create_allocation(db, data)


@router.post(
    "/allocations/{allocation_id}/approve",
    response_model=MessageResponse,
    status_code=status.HTTP_200_OK,
)
async def approve_allocation(
    allocation_id: int,
    current_user: User = Depends(require_roles(*HR_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    """Approve a leave allocation balance (HR/Admin only)."""
    return await TimeOffController.approve_allocation(db, allocation_id, current_user)


@router.post(
    "/allocations/{allocation_id}/refuse",
    response_model=MessageResponse,
    status_code=status.HTTP_200_OK,
)
async def refuse_allocation(
    allocation_id: int,
    current_user: User = Depends(require_roles(*HR_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    """Refuse a leave allocation (HR/Admin only)."""
    return await TimeOffController.refuse_allocation(db, allocation_id)


# -----------------------------------------------------------------------------
# 3. Leave Requests Endpoints
# -----------------------------------------------------------------------------

@router.get(
    "/requests",
    response_model=TimeOffRequestListResponse,
    status_code=status.HTTP_200_OK,
)
async def list_time_off_requests(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    employee_id: int | None = Query(default=None),
    type_id: int | None = Query(default=None),
    status: str | None = Query(default=None),
    my_team: bool = Query(default=False),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List leave requests with filters (employees see own; managers see team; HR see all)."""
    return await TimeOffController.list_requests(
        db,
        user=current_user,
        skip=skip,
        limit=limit,
        employee_id=employee_id,
        type_id=type_id,
        status_filter=status,
        my_team=my_team,
    )


@router.post(
    "/requests",
    response_model=TimeOffRequestResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_time_off_request(
    data: TimeOffRequestCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Submit a leave request. Automatically calculates duration and validates allocation balance."""
    return await TimeOffController.create_request(db, current_user, data)


@router.post(
    "/requests/{request_id}/approve",
    response_model=MessageResponse,
    status_code=status.HTTP_200_OK,
)
async def approve_time_off_request(
    request_id: int,
    current_user: User = Depends(require_roles(*HR_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    """Approve a leave request and automatically deduct days from the employee's approved allocation balance."""
    return await TimeOffController.approve_request(db, request_id, current_user)


@router.post(
    "/requests/{request_id}/refuse",
    response_model=MessageResponse,
    status_code=status.HTTP_200_OK,
)
async def refuse_time_off_request(
    request_id: int,
    current_user: User = Depends(require_roles(*HR_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    """Refuse a leave request (reverses balance deduction if previously approved)."""
    return await TimeOffController.refuse_request(db, request_id)
