from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.core.database import get_db
from app.api.deps import require_roles
from app.models.user import UserRole
from app.api.payruns.controller import PayrunController
from app.schemas.payrun import (
    PayrunCreate, PayrunResponse, PayrunComputePayload
)

router = APIRouter(prefix="/payruns", tags=["Payruns & Payroll Engine"])

READ_ROLES = [UserRole.HR_PAYROLL_USER, UserRole.HR_PAYROLL_ADMIN, UserRole.ADMIN]
WRITE_ROLES = [UserRole.HR_PAYROLL_ADMIN, UserRole.ADMIN]

@router.get("/", response_model=List[PayrunResponse], dependencies=[Depends(require_roles(*READ_ROLES))])
async def get_payruns(db: AsyncSession = Depends(get_db)):
    return await PayrunController.get_payruns(db)

@router.get("/{payrun_id}", response_model=PayrunResponse, dependencies=[Depends(require_roles(*READ_ROLES))])
async def get_payrun(payrun_id: int, db: AsyncSession = Depends(get_db)):
    return await PayrunController.get_payrun_by_id(db, payrun_id)

@router.post("/", response_model=PayrunResponse, dependencies=[Depends(require_roles(*WRITE_ROLES))])
async def create_payrun(data: PayrunCreate, db: AsyncSession = Depends(get_db)):
    return await PayrunController.create_payrun(db, data)

@router.post("/{payrun_id}/compute", response_model=PayrunResponse, dependencies=[Depends(require_roles(*WRITE_ROLES))])
async def compute_payrun(payrun_id: int, payload: PayrunComputePayload, db: AsyncSession = Depends(get_db)):
    return await PayrunController.compute_payrun(db, payrun_id, payload)

@router.post("/{payrun_id}/validate", response_model=PayrunResponse, dependencies=[Depends(require_roles(*WRITE_ROLES))])
async def validate_payrun(payrun_id: int, db: AsyncSession = Depends(get_db)):
    return await PayrunController.validate_payrun(db, payrun_id)

@router.post("/{payrun_id}/mark-paid", response_model=PayrunResponse, dependencies=[Depends(require_roles(*WRITE_ROLES))])
async def mark_paid(payrun_id: int, db: AsyncSession = Depends(get_db)):
    return await PayrunController.mark_paid(db, payrun_id)
