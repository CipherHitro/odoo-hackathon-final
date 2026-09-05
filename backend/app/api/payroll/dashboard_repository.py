from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from decimal import Decimal

from app.models.payroll import Payslip, PayslipStatus
from app.models.time_off import TimeOffRequest
from app.models.employee import Employee, EmployeeStatus
from app.models.attendance import AttendanceRecord
from app.models.department import Department
from app.models.contract import Contract, ContractStatus

class DashboardRepository:
    @staticmethod
    async def get_total_payroll(db: AsyncSession) -> Decimal:
        result = await db.execute(
            select(func.coalesce(func.sum(Payslip.net_wage), 0))
            .where(Payslip.status == PayslipStatus.DONE)
        )
        return Decimal(result.scalar() or 0)

    @staticmethod
    async def get_average_salary(db: AsyncSession) -> Decimal:
        result = await db.execute(
            select(func.coalesce(func.avg(Payslip.net_wage), 0))
            .where(Payslip.status == PayslipStatus.DONE)
        )
        return Decimal(result.scalar() or 0)

    @staticmethod
    async def get_payslips_generated(db: AsyncSession) -> int:
        result = await db.execute(
            select(func.count(Payslip.id))
            .where(Payslip.status == PayslipStatus.DONE)
        )
        return result.scalar() or 0

    @staticmethod
    async def get_approved_time_off(db: AsyncSession) -> int:
        result = await db.execute(
            select(func.count(TimeOffRequest.id))
            .where(TimeOffRequest.status == "approved")
        )
        return result.scalar() or 0

    @staticmethod
    async def get_attendance_health(db: AsyncSession) -> float:
        emp_result = await db.execute(
            select(func.count(Employee.id))
            .where(Employee.status == EmployeeStatus.ACTIVE)
        )
        total_active = emp_result.scalar() or 0
        
        if total_active == 0:
            return 0.0
            
        att_result = await db.execute(
            select(func.count(AttendanceRecord.employee_id.distinct()))
            .where(AttendanceRecord.check_out == None)
        )
        checked_in = att_result.scalar() or 0
        
        return round((checked_in / total_active) * 100, 2)

    @staticmethod
    async def get_cost_by_department(db: AsyncSession) -> list[dict]:
        result = await db.execute(
            select(Department.name, func.coalesce(func.sum(Payslip.net_wage), 0))
            .select_from(Department)
            .outerjoin(Employee, Employee.department_id == Department.id)
            .outerjoin(Payslip, Payslip.employee_id == Employee.id)
            .where(Payslip.status == PayslipStatus.DONE)
            .group_by(Department.id, Department.name)
        )
        return [{"department_name": row[0], "total_cost": Decimal(row[1])} for row in result.all()]

    @staticmethod
    async def get_monthly_trend(db: AsyncSession) -> list[dict]:
        result = await db.execute(
            select(
                func.to_char(Payslip.date_from, 'YYYY-MM').label('month'),
                func.coalesce(func.sum(Payslip.net_wage), 0)
            )
            .where(Payslip.status == PayslipStatus.DONE)
            .group_by('month')
            .order_by('month')
        )
        return [{"month": str(row[0]), "total_net": Decimal(row[1])} for row in result.all()]

    @staticmethod
    async def get_missing_contracts(db: AsyncSession) -> int:
        result = await db.execute(
            select(func.count(Employee.id))
            .where(Employee.status == EmployeeStatus.ACTIVE)
            .where(~Employee.contracts.any(Contract.status == ContractStatus.RUNNING))
        )
        return result.scalar() or 0
