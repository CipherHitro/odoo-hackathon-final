from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.api.deps import get_current_user, require_roles
from app.api.departments.controller import DepartmentController
from app.core.database import get_db
from app.models.user import User, UserRole
from app.schemas.department import DepartmentCreate, DepartmentUpdate, DepartmentResponse

router = APIRouter(prefix="/departments", tags=["Departments"])

HR_ROLES = tuple(role.value for role in UserRole if role != UserRole.EMPLOYEE)


@router.get("/", response_model=List[DepartmentResponse])
async def get_departments(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all departments (all authenticated users)."""
    return await DepartmentController.get_all(db)


@router.post("/", response_model=DepartmentResponse, status_code=status.HTTP_201_CREATED)
async def create_department(
    data: DepartmentCreate,
    current_user: User = Depends(require_roles(*HR_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    """Create a new department (HR/Admin only)."""
    return await DepartmentController.create(db, data)


@router.get("/{dept_id}", response_model=DepartmentResponse)
async def get_department(
    dept_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get department by ID (all authenticated users)."""
    return await DepartmentController.get_by_id(db, dept_id)


@router.patch("/{dept_id}", response_model=DepartmentResponse)
async def update_department(
    dept_id: int,
    data: DepartmentUpdate,
    current_user: User = Depends(require_roles(*HR_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    """Update department (HR/Admin only)."""
    return await DepartmentController.update(db, dept_id, data)
