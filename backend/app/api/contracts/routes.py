from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.api.contracts.controller import ContractController
from app.api.deps import require_roles
from app.core.database import get_db
from app.models.user import User, UserRole
from app.schemas.contract import (
    ContractCreate,
    ContractListResponse,
    ContractResponse,
    ContractUpdate,
)

router = APIRouter(prefix="/contracts", tags=["Contracts"])

# Per permission.txt: HR Manager, HR Payroll User, HR Payroll Manager, and Admin have full CRUD.
# Regular Employees have NO access (403).
CONTRACT_ROLES = tuple(role.value for role in UserRole if role != UserRole.EMPLOYEE)


@router.get("", response_model=ContractListResponse)
async def list_contracts(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    search: Optional[str] = Query(default=None),
    employee_id: Optional[int] = Query(default=None),
    status: Optional[str] = Query(default=None),
    current_user: User = Depends(require_roles(*CONTRACT_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    """List contracts with optional search and filtering (HR/Admin only)."""
    return await ContractController.get_all(
        db=db,
        skip=skip,
        limit=limit,
        search=search,
        employee_id=employee_id,
        status_filter=status,
    )


@router.post("", response_model=ContractResponse, status_code=status.HTTP_201_CREATED)
async def create_contract(
    data: ContractCreate,
    current_user: User = Depends(require_roles(*CONTRACT_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    """Create a new employee contract with auto-generated reference (HR/Admin only)."""
    return await ContractController.create(db, data)


@router.get("/{contract_id}", response_model=ContractResponse)
async def get_contract(
    contract_id: int,
    current_user: User = Depends(require_roles(*CONTRACT_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    """Get a specific contract by ID (HR/Admin only)."""
    return await ContractController.get_by_id(db, contract_id)


@router.patch("/{contract_id}", response_model=ContractResponse)
async def update_contract(
    contract_id: int,
    data: ContractUpdate,
    current_user: User = Depends(require_roles(*CONTRACT_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    """Update contract fields (HR/Admin only)."""
    return await ContractController.update(db, contract_id, data)


@router.delete("/{contract_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_contract(
    contract_id: int,
    current_user: User = Depends(require_roles(*CONTRACT_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    """Delete a contract (HR/Admin only)."""
    await ContractController.delete(db, contract_id)
    return None
