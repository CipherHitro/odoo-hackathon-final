from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.api.deps import get_current_user, require_roles
from app.api.working_schedules.controller import WorkingScheduleController
from app.core.database import get_db
from app.models.user import User, UserRole
from app.schemas.working_schedule import WorkingScheduleCreate, WorkingScheduleUpdate, WorkingScheduleResponse

router = APIRouter(prefix="/working-schedules", tags=["Working Schedules"])

HR_ROLES = tuple(role.value for role in UserRole if role != UserRole.EMPLOYEE)


@router.get("/", response_model=List[WorkingScheduleResponse])
async def get_working_schedules(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all working schedules (all authenticated users)."""
    return await WorkingScheduleController.get_all(db)


@router.post("/", response_model=WorkingScheduleResponse, status_code=status.HTTP_201_CREATED)
async def create_working_schedule(
    data: WorkingScheduleCreate,
    current_user: User = Depends(require_roles(*HR_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    """Create a new working schedule (HR/Admin only)."""
    return await WorkingScheduleController.create(db, data)


@router.get("/{schedule_id}", response_model=WorkingScheduleResponse)
async def get_working_schedule(
    schedule_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get working schedule by ID (all authenticated users)."""
    return await WorkingScheduleController.get_by_id(db, schedule_id)


@router.patch("/{schedule_id}", response_model=WorkingScheduleResponse)
async def update_working_schedule(
    schedule_id: int,
    data: WorkingScheduleUpdate,
    current_user: User = Depends(require_roles(*HR_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    """Update working schedule (HR/Admin only)."""
    return await WorkingScheduleController.update(db, schedule_id, data)
