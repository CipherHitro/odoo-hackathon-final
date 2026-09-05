from sqlalchemy import select, and_, or_, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from typing import List, Sequence
from datetime import date

from app.models.payroll import Payrun, Payslip, PayslipLine, SalaryStructure, SalaryRule
from app.models.contract import Contract, ContractStatus
from app.models.working_schedule import WorkingSchedule, ScheduleLine
from app.models.attendance import AttendanceRecord
from app.models.time_off import TimeOffRequest

class PayrunRepository:
    @staticmethod
    async def get_payruns(db: AsyncSession) -> Sequence[Payrun]:
        result = await db.execute(
            select(Payrun).order_by(Payrun.date_from.desc())
        )
        return result.scalars().all()

    @staticmethod
    async def get_payrun_by_id(db: AsyncSession, payrun_id: int) -> Payrun | None:
        result = await db.execute(
            select(Payrun)
            .options(
                selectinload(Payrun.payslips).selectinload(Payslip.lines)
            )
            .where(Payrun.id == payrun_id)
            .execution_options(populate_existing=True)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def create_payrun(db: AsyncSession, payrun: Payrun) -> Payrun:
        db.add(payrun)
        await db.commit()
        return await PayrunRepository.get_payrun_by_id(db, payrun.id)

    @staticmethod
    async def update_payrun(db: AsyncSession, payrun: Payrun, **kwargs) -> Payrun:
        for key, value in kwargs.items():
            setattr(payrun, key, value)
        await db.commit()
        return payrun

    @staticmethod
    async def delete_payrun(db: AsyncSession, payrun: Payrun) -> None:
        await db.delete(payrun)
        await db.commit()

    @staticmethod
    async def get_applicable_contract(
        db: AsyncSession, employee_id: int, date_from: date, date_to: date
    ) -> tuple[Contract | None, str | None]:
        from app.models.employee import Employee
        employee = await db.get(Employee, employee_id)
        emp_name = employee.name if employee else f"Employee #{employee_id}"

        result = await db.execute(
            select(Contract)
            .options(
                selectinload(Contract.working_schedule).selectinload(WorkingSchedule.schedule_lines)
            )
            .where(
                and_(
                    Contract.employee_id == employee_id,
                    Contract.status.in_([ContractStatus.RUNNING.value, ContractStatus.EXPIRED.value]),
                    Contract.start_date <= date_to,
                    or_(Contract.end_date == None, Contract.end_date >= date_from)
                )
            )
        )
        contracts = result.scalars().all()
        if len(contracts) == 0:
            return None, f"No applicable contract found for {emp_name} for this payroll period."
        if len(contracts) > 1:
            return None, f"Multiple applicable contracts found for {emp_name} for this payroll period."
        return contracts[0], None

    @staticmethod
    async def get_active_contract(db: AsyncSession, employee_id: int, date_from: date, date_to: date) -> Contract | None:
        contract, _ = await PayrunRepository.get_applicable_contract(db, employee_id, date_from, date_to)
        return contract

    @staticmethod
    async def get_attendance_hours(db: AsyncSession, employee_id: int, date_from: date, date_to: date) -> float:
        result = await db.execute(
            select(func.sum(AttendanceRecord.worked_hours))
            .where(
                and_(
                    AttendanceRecord.employee_id == employee_id,
                    func.date(AttendanceRecord.check_in) >= date_from,
                    func.date(AttendanceRecord.check_in) <= date_to
                )
            )
        )
        val = result.scalar_one_or_none()
        return float(val) if val else 0.0

    @staticmethod
    async def get_approved_time_off_days(db: AsyncSession, employee_id: int, date_from: date, date_to: date) -> float:
        result = await db.execute(
            select(func.sum(TimeOffRequest.duration_days))
            .where(
                and_(
                    TimeOffRequest.employee_id == employee_id,
                    TimeOffRequest.status == "approved",
                    TimeOffRequest.start_date <= date_to,
                    TimeOffRequest.end_date >= date_from
                )
            )
        )
        val = result.scalar_one_or_none()
        return float(val) if val else 0.0
        
    @staticmethod
    async def clear_payslips(db: AsyncSession, payrun_id: int, employee_ids: List[int] | None = None) -> None:
        query = select(Payslip).where(Payslip.payrun_id == payrun_id)
        if employee_ids is not None and len(employee_ids) > 0:
            query = query.where(Payslip.employee_id.in_(employee_ids))
        result = await db.execute(query.options(selectinload(Payslip.lines)))
        payslips = result.scalars().all()
        for p in payslips:
            await db.delete(p)
        await db.commit()

    @staticmethod
    async def save_payslips(db: AsyncSession, payslips: List[Payslip]) -> None:
        db.add_all(payslips)
        await db.commit()
