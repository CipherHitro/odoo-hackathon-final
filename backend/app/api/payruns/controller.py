from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from typing import List
from app.schemas.payrun import PayrunCreate, PayrunUpdate, PayrunResponse, PayrunComputePayload
from app.api.payruns.service import PayrunService
from app.models.employee import Employee
from app.models.user import User, UserRole

class PayrunController:
    @staticmethod
    async def get_payruns(db: AsyncSession, current_user: User | None = None) -> List[PayrunResponse]:
        payruns = await PayrunService.get_payruns(db)
        if current_user and current_user.role == UserRole.EMPLOYEE:
            emp_res = await db.execute(
                select(Employee.id).where(
                    or_(Employee.user_id == current_user.id, Employee.work_email == current_user.email)
                )
            )
            emp_id = emp_res.scalar_one_or_none()
            if not emp_id:
                return []
            filtered_payruns = []
            for p in payruns:
                matching_slips = [s for s in p.payslips if s.employee_id == emp_id]
                if matching_slips:
                    p.payslips = matching_slips
                    filtered_payruns.append(p)
            return [PayrunResponse.model_validate(p) for p in filtered_payruns]

        return [PayrunResponse.model_validate(p) for p in payruns]

    @staticmethod
    async def get_payrun_by_id(db: AsyncSession, payrun_id: int, current_user: User | None = None) -> PayrunResponse:
        payrun = await PayrunService.get_payrun_by_id(db, payrun_id)
        if not payrun:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payrun not found")
        if current_user and current_user.role == UserRole.EMPLOYEE:
            emp_res = await db.execute(
                select(Employee.id).where(
                    or_(Employee.user_id == current_user.id, Employee.work_email == current_user.email)
                )
            )
            emp_id = emp_res.scalar_one_or_none()
            payrun.payslips = [s for s in payrun.payslips if s.employee_id == emp_id]
        return PayrunResponse.model_validate(payrun)

    @staticmethod
    async def create_payrun(db: AsyncSession, data: PayrunCreate) -> PayrunResponse:
        payrun = await PayrunService.create_payrun(db, data)
        return PayrunResponse.model_validate(payrun)

    @staticmethod
    async def update_payrun(db: AsyncSession, payrun_id: int, data: PayrunUpdate) -> PayrunResponse:
        try:
            payrun = await PayrunService.update_payrun(db, payrun_id, data)
            return PayrunResponse.model_validate(payrun)
        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    @staticmethod
    async def compute_payrun(db: AsyncSession, payrun_id: int, payload: PayrunComputePayload) -> PayrunResponse:
        try:
            payrun = await PayrunService.compute_payrun(db, payrun_id, payload.employee_ids)
            return PayrunResponse.model_validate(payrun)
        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    @staticmethod
    async def validate_payrun(db: AsyncSession, payrun_id: int) -> PayrunResponse:
        try:
            payrun = await PayrunService.validate_payrun(db, payrun_id)
            return PayrunResponse.model_validate(payrun)
        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    @staticmethod
    async def mark_paid(db: AsyncSession, payrun_id: int) -> PayrunResponse:
        try:
            payrun = await PayrunService.mark_paid(db, payrun_id)
            return PayrunResponse.model_validate(payrun)
        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    @staticmethod
    async def delete_payrun(db: AsyncSession, payrun_id: int) -> dict:
        try:
            await PayrunService.delete_payrun(db, payrun_id)
            return {"message": "Payrun deleted successfully"}
        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    @staticmethod
    async def delete_payslip(db: AsyncSession, payrun_id: int, payslip_id: int) -> PayrunResponse:
        try:
            payrun = await PayrunService.delete_payslip(db, payrun_id, payslip_id)
            return PayrunResponse.model_validate(payrun)
        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    @staticmethod
    async def assign_contract(db: AsyncSession, payrun_id: int, payslip_id: int, contract_id: int) -> PayrunResponse:
        try:
            payrun = await PayrunService.assign_contract(db, payrun_id, payslip_id, contract_id)
            return PayrunResponse.model_validate(payrun)
        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

