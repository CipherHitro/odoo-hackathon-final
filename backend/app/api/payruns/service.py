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
    async def update_payrun(db: AsyncSession, payrun_id: int, data: PayrunUpdate) -> Payrun:
        payrun = await PayrunRepository.get_payrun_by_id(db, payrun_id)
        if not payrun:
            raise ValueError("Payrun not found")
        if payrun.status == PayrunStatus.PAID:
            raise ValueError("Cannot edit a payrun that has already been marked as PAID.")
        
        update_data = data.model_dump(exclude_unset=True)
        # If dates or structure change on a computed/validated payrun, reset status to draft so it can be recomputed
        if any(k in update_data for k in ['salary_structure_id', 'date_from', 'date_to']) and payrun.status != PayrunStatus.DRAFT:
            update_data['status'] = PayrunStatus.DRAFT
            
        return await PayrunRepository.update_payrun(db, payrun, **update_data)

    @staticmethod
    async def compute_payrun(db: AsyncSession, payrun_id: int, employee_ids: List[int] | None = None) -> Payrun:
        payrun = await PayrunRepository.get_payrun_by_id(db, payrun_id)
        if not payrun:
            raise ValueError("Payrun not found")
        
        if payrun.status not in (PayrunStatus.DRAFT, PayrunStatus.COMPUTED):
            raise ValueError(f"Cannot compute payrun in {payrun.status} status")

        # Resolve employee_ids if None:
        # If payrun already has payslips, re-compute for existing payslip employees.
        # Otherwise, select all employees.
        if not employee_ids:
            if payrun.payslips:
                employee_ids = [p.employee_id for p in payrun.payslips]
            else:
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
    async def delete_payslip(db: AsyncSession, payrun_id: int, payslip_id: int) -> Payrun:
        payrun = await PayrunRepository.get_payrun_by_id(db, payrun_id)
        if not payrun:
            raise ValueError("Payrun not found")
        if payrun.status in (PayrunStatus.VALIDATED, PayrunStatus.PAID):
            raise ValueError("Cannot remove payslips from a validated or paid payrun.")
        
        target_slip = next((s for s in payrun.payslips if s.id == payslip_id), None)
        if not target_slip:
            raise ValueError("Payslip not found in this payrun")
            
        if target_slip.lines:
            for line in target_slip.lines:
                await db.delete(line)
        await db.delete(target_slip)
        await db.flush()
        await db.commit()
        return await PayrunRepository.get_payrun_by_id(db, payrun_id)

    @staticmethod
    async def assign_contract(db: AsyncSession, payrun_id: int, payslip_id: int, contract_id: int) -> Payrun:
        payrun = await PayrunRepository.get_payrun_by_id(db, payrun_id)
        if not payrun:
            raise ValueError("Payrun not found")
        if payrun.status in (PayrunStatus.VALIDATED, PayrunStatus.PAID):
            raise ValueError("Cannot modify payslips in a validated or paid payrun.")
            
        target_slip = next((s for s in payrun.payslips if s.id == payslip_id), None)
        if not target_slip:
            raise ValueError("Payslip not found in this payrun")
            
        target_slip.contract_id = contract_id
        await db.commit()
        # Re-compute this employee
        await PayrollEngine.compute_payrun(db, payrun, [target_slip.employee_id])
        await db.commit()
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

        # Double payment safeguard: check if any employee was already paid for overlapping dates in another payrun
        for p in payrun.payslips:
            overlaps = await PayrunRepository.find_overlapping_payslips(
                db, p.employee_id, payrun.date_from, payrun.date_to, payrun.id
            )
            paid_overlaps = [o for o in overlaps if o.payrun.status == PayrunStatus.PAID]
            if paid_overlaps:
                other_p = paid_overlaps[0].payrun
                emp_name = p.employee.name if p.employee else f"Employee #{p.employee_id}"
                raise ValueError(
                    f"Double payment blocked: {emp_name} was already paid for overlapping dates in Payrun "
                    f"'{other_p.name}' ({paid_overlaps[0].date_from} to {paid_overlaps[0].date_to}). "
                    f"Please remove this duplicate employee from the payrun before validating."
                )
            
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

    @staticmethod
    async def delete_payrun(db: AsyncSession, payrun_id: int) -> bool:
        payrun = await PayrunRepository.get_payrun_by_id(db, payrun_id)
        if not payrun:
            raise ValueError("Payrun not found")
        if payrun.status == PayrunStatus.PAID:
            raise ValueError("Cannot delete a payrun that has already been marked as PAID.")
        await PayrunRepository.delete_payrun(db, payrun)
        return True

