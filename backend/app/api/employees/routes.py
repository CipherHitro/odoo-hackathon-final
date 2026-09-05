from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.api.deps import get_current_user, require_roles
from app.api.employees.controller import EmployeeController
from app.api.employees.service import EmployeeService
from app.core.database import get_db
from app.models.user import User, UserRole
from app.schemas.employee import EmployeeCreate, EmployeeUpdate, EmployeeResponse

router = APIRouter(prefix="/employees", tags=["Employees"])

# All roles other than employee can manage and view all employees
HR_ROLES = tuple(role.value for role in UserRole if role != UserRole.EMPLOYEE)


@router.get("/", response_model=List[EmployeeResponse])
async def get_employees(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List employees. Regular employees only see their own profile, while HR/Admin can view all."""
    if current_user.role == UserRole.EMPLOYEE.value:
        emp = await EmployeeService.get_by_user_id(db, current_user.id)
        return [EmployeeController._to_response(emp)] if emp else []

    return await EmployeeController.get_all(db)


@router.get("/me", response_model=EmployeeResponse)
async def get_my_employee_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Self-service endpoint: retrieve the employee record linked to the current user."""
    emp = await EmployeeService.get_by_user_id(db, current_user.id)
    if not emp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee profile not found for this account",
        )
    return EmployeeController._to_response(emp)


@router.post("/", response_model=EmployeeResponse, status_code=status.HTTP_201_CREATED)
async def create_employee(
    data: EmployeeCreate,
    current_user: User = Depends(require_roles(*HR_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    """Create a new employee record (HR/Admin only)."""
    return await EmployeeController.create(db, data)


@router.get("/{employee_id}", response_model=EmployeeResponse)
async def get_employee(
    employee_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve an employee's details. Regular employees can only view their own record."""
    emp = await EmployeeService.get_by_id(db, employee_id)
    if not emp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found",
        )

    if current_user.role == UserRole.EMPLOYEE.value and emp.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view other employee records",
        )

    return EmployeeController._to_response(emp)


@router.patch("/{employee_id}", response_model=EmployeeResponse)
async def update_employee(
    employee_id: int,
    data: EmployeeUpdate,
    current_user: User = Depends(require_roles(*HR_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    """Update employee details (HR/Admin only)."""
    return await EmployeeController.update(db, employee_id, data)


@router.get("/{employee_id}/contracts")
async def get_employee_contracts(
    employee_id: int,
    current_user: User = Depends(require_roles(*HR_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve all contracts for a specific employee (HR/Admin only)."""
    from app.api.contracts.controller import ContractController
    return await ContractController.get_by_employee_id(db, employee_id)

