from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.core.database import get_db
from app.api.deps import require_roles
from app.models.user import UserRole
from app.api.payroll.controller import PayrollController
from app.schemas.payroll import (
    SalaryStructureCreate, SalaryStructureUpdate, SalaryStructureResponse,
    SalaryRuleCreate, SalaryRuleUpdate, SalaryRuleResponse
)
from app.schemas.dashboard import DashboardResponse

router = APIRouter(prefix="/payroll", tags=["Payroll Configuration"])

# RBAC groups
READ_ROLES = [UserRole.HR_PAYROLL_USER, UserRole.HR_PAYROLL_ADMIN, UserRole.ADMIN]
WRITE_ROLES = [UserRole.HR_PAYROLL_ADMIN, UserRole.ADMIN]

# --- Dashboard ---
@router.get("/dashboard", response_model=DashboardResponse, dependencies=[Depends(require_roles(*READ_ROLES))])
async def get_dashboard_metrics(db: AsyncSession = Depends(get_db)):
    """Retrieve aggregations for the Payroll Dashboard."""
    return await PayrollController.get_dashboard_metrics(db)

# --- Salary Structure ---
@router.get("/structures", response_model=List[SalaryStructureResponse], dependencies=[Depends(require_roles(*READ_ROLES))])
async def get_structures(db: AsyncSession = Depends(get_db)):
    return await PayrollController.get_structures(db)

@router.get("/structures/{structure_id}", response_model=SalaryStructureResponse, dependencies=[Depends(require_roles(*READ_ROLES))])
async def get_structure_by_id(structure_id: int, db: AsyncSession = Depends(get_db)):
    return await PayrollController.get_structure_by_id(db, structure_id)

@router.post("/structures", response_model=SalaryStructureResponse, dependencies=[Depends(require_roles(*WRITE_ROLES))])
async def create_structure(data: SalaryStructureCreate, db: AsyncSession = Depends(get_db)):
    return await PayrollController.create_structure(db, data)

@router.patch("/structures/{structure_id}", response_model=SalaryStructureResponse, dependencies=[Depends(require_roles(*WRITE_ROLES))])
async def update_structure(structure_id: int, data: SalaryStructureUpdate, db: AsyncSession = Depends(get_db)):
    return await PayrollController.update_structure(db, structure_id, data)

@router.delete("/structures/{structure_id}", dependencies=[Depends(require_roles(*WRITE_ROLES))])
async def delete_structure(structure_id: int, db: AsyncSession = Depends(get_db)):
    return await PayrollController.delete_structure(db, structure_id)

# --- Salary Rule ---
@router.post("/structures/{structure_id}/rules", response_model=SalaryRuleResponse, dependencies=[Depends(require_roles(*WRITE_ROLES))])
async def create_rule(structure_id: int, data: SalaryRuleCreate, db: AsyncSession = Depends(get_db)):
    return await PayrollController.create_rule(db, structure_id, data)

@router.patch("/rules/{rule_id}", response_model=SalaryRuleResponse, dependencies=[Depends(require_roles(*WRITE_ROLES))])
async def update_rule(rule_id: int, data: SalaryRuleUpdate, db: AsyncSession = Depends(get_db)):
    return await PayrollController.update_rule(db, rule_id, data)

@router.delete("/rules/{rule_id}", dependencies=[Depends(require_roles(*WRITE_ROLES))])
async def delete_rule(rule_id: int, db: AsyncSession = Depends(get_db)):
    return await PayrollController.delete_rule(db, rule_id)
