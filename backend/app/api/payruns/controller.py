from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from app.schemas.payrun import PayrunCreate, PayrunResponse, PayrunComputePayload
from app.api.payruns.service import PayrunService

class PayrunController:
    @staticmethod
    async def get_payruns(db: AsyncSession) -> List[PayrunResponse]:
        payruns = await PayrunService.get_payruns(db)
        return [PayrunResponse.model_validate(p) for p in payruns]

    @staticmethod
    async def get_payrun_by_id(db: AsyncSession, payrun_id: int) -> PayrunResponse:
        payrun = await PayrunService.get_payrun_by_id(db, payrun_id)
        if not payrun:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payrun not found")
        return PayrunResponse.model_validate(payrun)

    @staticmethod
    async def create_payrun(db: AsyncSession, data: PayrunCreate) -> PayrunResponse:
        payrun = await PayrunService.create_payrun(db, data)
        return PayrunResponse.model_validate(payrun)

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
