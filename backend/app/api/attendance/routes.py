# Purpose: FastAPI route definitions for Attendance (/attendance/check-in, /attendance/check-out, /attendance/widget, etc.).
from datetime import datetime
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.attendance.controller import AttendanceController
from app.api.deps import get_current_user, require_roles
from app.core.database import get_db
from app.models.user import User, UserRole
from app.schemas.attendance import (
    AttendanceCreate,
    AttendanceListResponse,
    AttendanceResponse,
    AttendanceUpdate,
    AttendanceWidgetResponse,
    CheckInResponse,
    CheckOutResponse,
)

router = APIRouter(
    prefix="/attendance",
    tags=["Attendance"],
)

# All roles other than employee can manage/edit attendance records
HR_ROLES = tuple(
    role.value for role in UserRole if role != UserRole.EMPLOYEE
)



@router.post(
    "/check-in",
    response_model=CheckInResponse,
    status_code=status.HTTP_201_CREATED,
)
async def check_in(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Self-service endpoint: check in for the current user."""
    return await AttendanceController.check_in(db, current_user)


@router.post(
    "/check-out",
    response_model=CheckOutResponse,
    status_code=status.HTTP_200_OK,
)
async def check_out(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Self-service endpoint: check out for the current user and compute worked hours."""
    return await AttendanceController.check_out(db, current_user)


@router.get(
    "/widget",
    response_model=AttendanceWidgetResponse,
    status_code=status.HTTP_200_OK,
)
async def widget_state(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Navbar widget state: polling endpoint returning active check-in status and worked hours."""
    return await AttendanceController.get_widget_state(db, current_user)


@router.get(
    "",
    response_model=AttendanceListResponse,
    status_code=status.HTTP_200_OK,
)
async def list_attendance(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    employee_id: int | None = Query(default=None),
    date_from: datetime | None = Query(default=None),
    date_to: datetime | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List attendance records with optional filtering (regular employees only see their own)."""
    return await AttendanceController.list_attendance(
        db=db,
        user=current_user,
        skip=skip,
        limit=limit,
        employee_id=employee_id,
        date_from=date_from,
        date_to=date_to,
    )


@router.post(
    "",
    response_model=AttendanceResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_attendance(
    data: AttendanceCreate,
    current_user: User = Depends(require_roles(*HR_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    """HR/Admin manual entry: create an attendance record for any employee."""
    return await AttendanceController.admin_create(db, data)


@router.get(
    "/{id}",
    response_model=AttendanceResponse,
    status_code=status.HTTP_200_OK,
)
async def get_attendance(
    id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve details of an individual attendance record."""
    return await AttendanceController.get_by_id(db, id, current_user)


@router.patch(
    "/{id}",
    response_model=AttendanceResponse,
    status_code=status.HTTP_200_OK,
)
async def update_attendance(
    id: int,
    data: AttendanceUpdate,
    current_user: User = Depends(require_roles(*HR_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    """HR/Admin manual edit: update attendance timestamps or notes and recompute hours."""
    return await AttendanceController.admin_update(db, id, data)
