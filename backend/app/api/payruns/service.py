from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Sequence

from app.models.payroll import Payrun, PayslipStatus, PayrunStatus
from app.models.employee import Employee
from sqlalchemy import select
from app.api.payruns.repository import PayrunRepository
from app.services.payroll_engine import PayrollEngine
from app.schemas.payrun import PayrunCreate, PayrunUpdate

class PayrunService:
    @staticmethod
    async def get_payruns(db: AsyncSession) -> Sequence[Payrun]:
        return await PayrunRepository.get_payruns(db)

    @staticmethod
    async def get_payrun_by_id(db: AsyncSession, payrun_id: int) -> Payrun | None:
        return await PayrunRepository.get_payrun_by_id(db, payrun_id)

    @staticmethod
    async def create_payrun(db: AsyncSession, data: PayrunCreate) -> Payrun:
        payrun = Payrun(**data.model_dump())
        return await PayrunRepository.create_payrun(db, payrun)

    @staticmethod
    async def compute_payrun(db: AsyncSession, payrun_id: int, employee_ids: List[int] | None = None) -> Payrun:
        payrun = await PayrunRepository.get_payrun_by_id(db, payrun_id)
        if not payrun:
            raise ValueError("Payrun not found")
        
        if payrun.status not in (PayrunStatus.DRAFT, PayrunStatus.COMPUTED):
            raise ValueError(f"Cannot compute payrun in {payrun.status} status")

        # Resolve employee_ids if None
        if not employee_ids:
            result = await db.execute(select(Employee.id))
            employee_ids = list(result.scalars().all())
            
        await PayrollEngine.compute_payrun(db, payrun, employee_ids)
        
        payrun.status = PayrunStatus.COMPUTED
        await db.commit()
        
        # reload payrun to get new payslips
        await db.refresh(payrun, ["payslips"])
        # We also need to refresh the nested lines for the response schema
        return await PayrunRepository.get_payrun_by_id(db, payrun_id)

    @staticmethod
    async def validate_payrun(db: AsyncSession, payrun_id: int) -> Payrun:
        payrun = await PayrunRepository.get_payrun_by_id(db, payrun_id)
        if not payrun:
            raise ValueError("Payrun not found")
            
        if payrun.status != PayrunStatus.COMPUTED:
            raise ValueError(f"Can only validate COMPUTED payruns. Current status is {payrun.status}")
            
        if not payrun.payslips:
            raise ValueError("Cannot validate a payrun with no payslips.")
            
        # Check for errors/warnings
        errors = [p for p in payrun.payslips if p.has_warning]
        if errors:
            raise ValueError(f"Cannot validate payrun. {len(errors)} payslips have warnings/errors.")
            
        payrun.status = PayrunStatus.VALIDATED
        for p in payrun.payslips:
            p.status = PayslipStatus.DONE
            
        await db.commit()
        return payrun

    @staticmethod
    async def mark_paid(db: AsyncSession, payrun_id: int) -> Payrun:
        payrun = await PayrunRepository.get_payrun_by_id(db, payrun_id)
        if not payrun:
            raise ValueError("Payrun not found")
            
        if payrun.status != PayrunStatus.VALIDATED:
            raise ValueError(f"Can only pay VALIDATED payruns. Current status is {payrun.status}")
            
        payrun.status = PayrunStatus.PAID
        await db.commit()
        return payrun
