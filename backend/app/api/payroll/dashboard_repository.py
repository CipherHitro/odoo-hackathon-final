from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, case
from decimal import Decimal
from datetime import date, timedelta
from typing import List, Dict, Any

from app.models.payroll import Payslip, PayslipStatus, Payrun, PayrunStatus
from app.models.time_off import TimeOffRequest, TimeOffType, TimeOffAllocation
from app.models.employee import Employee, EmployeeStatus
from app.models.attendance import AttendanceRecord
from app.models.department import Department
from app.models.contract import Contract, ContractStatus

class DashboardRepository:
    @staticmethod
    async def get_total_payroll(db: AsyncSession) -> Decimal:
        """Sum of net wages from all existing payslips across payruns."""
        result = await db.execute(
            select(func.coalesce(func.sum(Payslip.net_wage), 0))
        )
        total = Decimal(result.scalar() or 0)
        return total

    @staticmethod
    async def get_average_salary(db: AsyncSession) -> Decimal:
        """Average net wage across all generated payslips (or active contracts if no payslips)."""
        result = await db.execute(
            select(func.coalesce(func.avg(Payslip.net_wage), 0))
            .where(Payslip.net_wage > 0)
        )
        avg_val = Decimal(result.scalar() or 0)
        if avg_val > 0:
            return round(avg_val, 2)

        # Fallback to real active contract average wage
        contract_result = await db.execute(
            select(func.coalesce(func.avg(Contract.wage_monthly), 0))
            .where(Contract.status == ContractStatus.RUNNING)
        )
        c_avg = Decimal(contract_result.scalar() or 0)
        return round(c_avg, 2)

    @staticmethod
    async def get_payslips_generated(db: AsyncSession) -> int:
        """Total count of all payslips in database."""
        result = await db.execute(select(func.count(Payslip.id)))
        return result.scalar() or 0

    @staticmethod
    async def get_paid_and_pending_counts(db: AsyncSession) -> tuple[int, int]:
        """Count paid vs pending payslips."""
        paid_res = await db.execute(
            select(func.count(Payslip.id))
            .outerjoin(Payrun, Payslip.payrun_id == Payrun.id)
            .where(or_(Payslip.status == PayslipStatus.DONE, Payrun.status == PayrunStatus.PAID))
        )
        paid = paid_res.scalar() or 0

        pending_res = await db.execute(
            select(func.count(Payslip.id))
            .outerjoin(Payrun, Payslip.payrun_id == Payrun.id)
            .where(and_(Payslip.status != PayslipStatus.DONE, Payrun.status != PayrunStatus.PAID))
        )
        pending = pending_res.scalar() or 0

        return paid, pending

    @staticmethod
    async def get_approved_time_off(db: AsyncSession) -> int:
        """Sum of approved time-off duration in days from real time_off_requests."""
        result = await db.execute(
            select(func.coalesce(func.sum(TimeOffRequest.duration_days), 0))
            .where(TimeOffRequest.status == "approved")
        )
        return int(result.scalar() or 0)

    @staticmethod
    async def get_attendance_health(db: AsyncSession) -> float:
        """Actual percentage of active employees who have logged attendance."""
        emp_result = await db.execute(
            select(func.count(Employee.id))
            .where(Employee.status == EmployeeStatus.ACTIVE)
        )
        total_active = emp_result.scalar() or 0
        if total_active == 0:
            return 0.0

        att_result = await db.execute(
            select(func.count(AttendanceRecord.employee_id.distinct()))
            .where(AttendanceRecord.worked_hours > 0)
        )
        attended = att_result.scalar() or 0
        return round((attended / total_active) * 100, 1)

    @staticmethod
    async def get_cost_by_department(db: AsyncSession) -> list[dict]:
        """Real salary cost grouped by department from payslips."""
        result = await db.execute(
            select(Department.name, func.coalesce(func.sum(Payslip.net_wage), 0))
            .select_from(Department)
            .join(Employee, Employee.department_id == Department.id)
            .join(Payslip, Payslip.employee_id == Employee.id)
            .group_by(Department.id, Department.name)
            .order_by(func.sum(Payslip.net_wage).desc())
        )
        rows = result.all()
        if rows:
            return [{"department_name": row[0], "total_cost": Decimal(row[1])} for row in rows]

        # If no payslips yet, show department salary cost from active contracts
        c_result = await db.execute(
            select(Department.name, func.coalesce(func.sum(Contract.wage_monthly), 0))
            .select_from(Department)
            .join(Employee, Employee.department_id == Department.id)
            .join(Contract, Contract.employee_id == Employee.id)
            .where(Contract.status == ContractStatus.RUNNING)
            .group_by(Department.id, Department.name)
            .order_by(func.sum(Contract.wage_monthly).desc())
        )
        return [{"department_name": row[0], "total_cost": Decimal(row[1])} for row in c_result.all() if row[1] > 0]

    @staticmethod
    async def get_monthly_trend(db: AsyncSession) -> list[dict]:
        """Real historical net salary grouped by month from payslips."""
        result = await db.execute(
            select(
                func.to_char(Payslip.date_from, 'YYYY-MM').label('month'),
                func.coalesce(func.sum(Payslip.net_wage), 0)
            )
            .group_by('month')
            .order_by('month')
        )
        return [{"month": str(row[0]), "total_net": Decimal(row[1])} for row in result.all()]

    @staticmethod
    async def get_missing_contracts(db: AsyncSession) -> int:
        """Count of active employees without a running contract."""
        result = await db.execute(
            select(func.count(Employee.id))
            .where(Employee.status == EmployeeStatus.ACTIVE)
            .where(~Employee.contracts.any(Contract.status == ContractStatus.RUNNING))
        )
        return result.scalar() or 0

    @staticmethod
    async def get_status_split(db: AsyncSession) -> dict[str, int]:
        """Real breakdown of payslips by status."""
        paid_res = await db.execute(
            select(func.count(Payslip.id))
            .outerjoin(Payrun, Payslip.payrun_id == Payrun.id)
            .where(or_(Payslip.status == PayslipStatus.DONE, Payrun.status == PayrunStatus.PAID))
        )
        validated_res = await db.execute(
            select(func.count(Payslip.id))
            .join(Payrun, Payslip.payrun_id == Payrun.id)
            .where(Payrun.status == PayrunStatus.VALIDATED)
        )
        pending_res = await db.execute(
            select(func.count(Payslip.id))
            .join(Payrun, Payslip.payrun_id == Payrun.id)
            .where(Payrun.status.in_([PayrunStatus.DRAFT, PayrunStatus.COMPUTED]))
        )
        warn_res = await db.execute(
            select(func.count(Payslip.id))
            .where(Payslip.has_warning == True)
        )

        return {
            "paid": paid_res.scalar() or 0,
            "done": validated_res.scalar() or 0,
            "pending": pending_res.scalar() or 0,
            "warning": warn_res.scalar() or 0,
        }

    @staticmethod
    async def get_current_alerts(db: AsyncSession) -> list[dict]:
        """Only return real alerts that actually exist in the database."""
        alerts = []

        # 1. Real missing active contract count
        missing_contracts = await DashboardRepository.get_missing_contracts(db)
        if missing_contracts > 0:
            alerts.append({
                "type": "warning",
                "message": f"{missing_contracts} employee(s) missing active contract / bank details",
                "color": "var(--warning)"
            })

        # 2. Real duplicate payslip warning count
        dup_res = await db.execute(
            select(func.count(Payslip.id))
            .where(
                and_(
                    Payslip.has_warning == True,
                    Payslip.warning_message.ilike("%double payment%")
                )
            )
        )
        dup_count = dup_res.scalar() or 0
        if dup_count > 0:
            alerts.append({
                "type": "danger",
                "message": f"{dup_count} duplicate payslip warning flagged",
                "color": "var(--danger)"
            })

        # 3. Real draft payruns count
        draft_res = await db.execute(
            select(func.count(Payrun.id))
            .where(Payrun.status.in_([PayrunStatus.DRAFT, PayrunStatus.COMPUTED]))
        )
        drafts = draft_res.scalar() or 0
        if drafts > 0:
            alerts.append({
                "type": "pending",
                "message": f"{drafts} draft(s) still not validated",
                "color": "var(--sky)"
            })

        # 4. Real expiring contracts within 60 days
        today = date.today()
        exp_res = await db.execute(
            select(func.count(Contract.id))
            .where(
                and_(
                    Contract.end_date != None,
                    Contract.end_date >= today,
                    Contract.end_date <= today + timedelta(days=60)
                )
            )
        )
        expiring = exp_res.scalar() or 0
        if expiring > 0:
            alerts.append({
                "type": "info",
                "message": f"{expiring} contracts expiring within 60 days",
                "color": "var(--coral)"
            })

        return alerts

    @staticmethod
    async def get_attendance_overview(db: AsyncSession) -> dict[str, Any]:
        """Pure real attendance metrics from attendance_records and employees."""
        present_cnt = await db.execute(select(func.count(AttendanceRecord.id)).where(AttendanceRecord.worked_hours >= 7.0))
        late_cnt = await db.execute(select(func.count(AttendanceRecord.id)).where(and_(AttendanceRecord.worked_hours > 0, AttendanceRecord.worked_hours < 7.0)))
        total_emp_res = await db.execute(select(func.count(Employee.id)).where(Employee.status == EmployeeStatus.ACTIVE))
        distinct_attended_res = await db.execute(select(func.count(AttendanceRecord.employee_id.distinct())).where(AttendanceRecord.worked_hours > 0))
        ot_cnt = await db.execute(select(func.count(AttendanceRecord.id)).where(AttendanceRecord.overtime_hours > 0))
        missing_co = await db.execute(select(func.count(AttendanceRecord.id)).where(AttendanceRecord.check_out == None))
        manual_cnt = await db.execute(select(func.count(AttendanceRecord.id)).where(AttendanceRecord.notes != None))

        p = present_cnt.scalar() or 0
        l = late_cnt.scalar() or 0
        tot_emp = total_emp_res.scalar() or 0
        distinct_att = distinct_attended_res.scalar() or 0
        absent = max(0, tot_emp - distinct_att)
        ot = ot_cnt.scalar() or 0
        m_co = missing_co.scalar() or 0
        m_edits = manual_cnt.scalar() or 0
        coverage = round((distinct_att / tot_emp) * 100, 1) if tot_emp > 0 else 0.0

        return {
            "present": p,
            "late": l,
            "absent": absent,
            "overtime": ot,
            "missing_checkouts": m_co,
            "manual_edits": m_edits,
            "attendance_coverage": coverage,
        }

    @staticmethod
    async def get_time_off_overview(db: AsyncSession) -> list[dict]:
        """Real time off metrics grouped by TimeOffType."""
        result = await db.execute(
            select(
                TimeOffType.id,
                TimeOffType.name,
                TimeOffType.requires_allocation,
                func.coalesce(func.sum(case((TimeOffRequest.status == 'approved', TimeOffRequest.duration_days), else_=0)), 0).label('approved'),
                func.coalesce(func.sum(case((TimeOffRequest.status == 'to_approve', 1), else_=0)), 0).label('pending')
            )
            .select_from(TimeOffType)
            .outerjoin(TimeOffRequest, TimeOffRequest.time_off_type_id == TimeOffType.id)
            .group_by(TimeOffType.id, TimeOffType.name, TimeOffType.requires_allocation)
            .order_by(TimeOffType.name)
        )
        types_data = result.all()

        # Query allocation balance per type
        alloc_res = await db.execute(
            select(
                TimeOffAllocation.time_off_type_id,
                func.coalesce(func.sum(TimeOffAllocation.allocated_days - TimeOffAllocation.taken_days), 0)
            )
            .where(TimeOffAllocation.status == 'approved')
            .group_by(TimeOffAllocation.time_off_type_id)
        )
        alloc_map = {row[0]: float(row[1]) for row in alloc_res.all()}

        output = []
        for t_id, name, req_alloc, approved, pending in types_data:
            if not req_alloc:
                balance_str = "N/A"
            else:
                rem = alloc_map.get(t_id, 0.0)
                balance_str = f"{int(rem)} Days" if rem > 0 else "0 Days"

            output.append({
                "type": name,
                "approved_days": int(approved),
                "pending": int(pending),
                "remaining_balance": balance_str,
            })
        return output

    @staticmethod
    async def get_department_overview(db: AsyncSession) -> list[dict]:
        """Real headcount and monthly salary budget by Department."""
        result = await db.execute(
            select(
                Department.name,
                func.count(Employee.id).label('headcount'),
                func.coalesce(func.sum(Contract.wage_monthly), 0).label('monthly_salary')
            )
            .select_from(Department)
            .outerjoin(Employee, Employee.department_id == Department.id)
            .outerjoin(Contract, and_(Contract.employee_id == Employee.id, Contract.status.in_([ContractStatus.RUNNING, ContractStatus.DRAFT])))
            .group_by(Department.id, Department.name)
            .order_by(Department.name)
        )
        return [
            {
                "department": r[0],
                "headcount": int(r[1]),
                "monthly_salary": Decimal(str(r[2])),
            }
            for r in result.all()
        ]
