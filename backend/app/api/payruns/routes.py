from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from app.core.database import get_db
from app.api.deps import require_roles, get_current_user
from app.models.user import User, UserRole
from app.api.payruns.controller import PayrunController
from app.schemas.payrun import (
    PayrunCreate, PayrunUpdate, PayrunResponse, PayrunComputePayload, AssignContractPayload, SendPayslipsPayload
)


router = APIRouter(prefix="/payruns", tags=["Payruns & Payroll Engine"])

# Per permission.txt:
# Employees can view their own payslips.
# HR Payroll User has "Manage" access: View, Create, Compute, Validate, Mark Paid, Edit.
# HR Payroll Manager and Admin have Full CRUD: View, Create, Compute, Validate, Mark Paid, Edit, Delete.
READ_ROLES = [UserRole.EMPLOYEE, UserRole.HR_PAYROLL_USER, UserRole.HR_PAYROLL_ADMIN, UserRole.ADMIN]
MANAGE_ROLES = [UserRole.HR_PAYROLL_USER, UserRole.HR_PAYROLL_ADMIN, UserRole.ADMIN]
DELETE_ROLES = [UserRole.HR_PAYROLL_ADMIN, UserRole.ADMIN]

@router.get("/", response_model=List[PayrunResponse], dependencies=[Depends(require_roles(*READ_ROLES))])
async def get_payruns(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    return await PayrunController.get_payruns(db, current_user)

@router.get("/{payrun_id}", response_model=PayrunResponse, dependencies=[Depends(require_roles(*READ_ROLES))])
async def get_payrun(payrun_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    return await PayrunController.get_payrun_by_id(db, payrun_id, current_user)

@router.post("/", response_model=PayrunResponse, dependencies=[Depends(require_roles(*MANAGE_ROLES))])
async def create_payrun(data: PayrunCreate, db: AsyncSession = Depends(get_db)):
    return await PayrunController.create_payrun(db, data)

@router.patch("/{payrun_id}", response_model=PayrunResponse, dependencies=[Depends(require_roles(*MANAGE_ROLES))])
async def update_payrun(payrun_id: int, data: PayrunUpdate, db: AsyncSession = Depends(get_db)):
    return await PayrunController.update_payrun(db, payrun_id, data)

@router.post("/{payrun_id}/compute", response_model=PayrunResponse, dependencies=[Depends(require_roles(*MANAGE_ROLES))])
async def compute_payrun(payrun_id: int, payload: PayrunComputePayload, db: AsyncSession = Depends(get_db)):
    return await PayrunController.compute_payrun(db, payrun_id, payload)

@router.post("/{payrun_id}/validate", response_model=PayrunResponse, dependencies=[Depends(require_roles(*MANAGE_ROLES))])
async def validate_payrun(payrun_id: int, db: AsyncSession = Depends(get_db)):
    return await PayrunController.validate_payrun(db, payrun_id)

@router.post("/{payrun_id}/mark-paid", response_model=PayrunResponse, dependencies=[Depends(require_roles(*MANAGE_ROLES))])
async def mark_paid(payrun_id: int, db: AsyncSession = Depends(get_db)):
    return await PayrunController.mark_paid(db, payrun_id)

@router.delete("/{payrun_id}", dependencies=[Depends(require_roles(*DELETE_ROLES))])
async def delete_payrun(payrun_id: int, db: AsyncSession = Depends(get_db)):
    return await PayrunController.delete_payrun(db, payrun_id)

@router.delete("/{payrun_id}/payslips/{payslip_id}", response_model=PayrunResponse, dependencies=[Depends(require_roles(*MANAGE_ROLES))])
async def delete_payslip(payrun_id: int, payslip_id: int, db: AsyncSession = Depends(get_db)):
    return await PayrunController.delete_payslip(db, payrun_id, payslip_id)

@router.post("/{payrun_id}/payslips/{payslip_id}/assign-contract", response_model=PayrunResponse, dependencies=[Depends(require_roles(*MANAGE_ROLES))])
async def assign_contract(payrun_id: int, payslip_id: int, payload: AssignContractPayload, db: AsyncSession = Depends(get_db)):
    return await PayrunController.assign_contract(db, payrun_id, payslip_id, payload.contract_id)

@router.post("/{payrun_id}/send-payslips", dependencies=[Depends(require_roles(*MANAGE_ROLES))])
async def send_payrun_payslips(
    payrun_id: int,
    payload: Optional[SendPayslipsPayload] = None,
    db: AsyncSession = Depends(get_db),
):
    return await PayrunController.send_payslips(db, payrun_id, payload)


