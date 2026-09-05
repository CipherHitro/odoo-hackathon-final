# Purpose: Central models package entrypoint that registers all database entities into SQLAlchemy Base.registry.
from app.models.attendance import AttendanceRecord
from app.models.contract import Contract
from app.models.department import Department
from app.models.employee import Employee
from app.models.payroll import (
    Payrun,
    Payslip,
    PayslipLine,
    SalaryRule,
    SalaryStructure,
)
from app.models.time_off import (
    TimeOffAllocation,
    TimeOffRequest,
    TimeOffType,
)
from app.models.user import User, UserRole
from app.models.working_schedule import ScheduleLine, WorkingSchedule

__all__ = [
    "AttendanceRecord",
    "Contract",
    "Department",
    "Employee",
    "Payrun",
    "Payslip",
    "PayslipLine",
    "SalaryRule",
    "SalaryStructure",
    "ScheduleLine",
    "TimeOffAllocation",
    "TimeOffRequest",
    "TimeOffType",
    "User",
    "UserRole",
    "WorkingSchedule",
]
