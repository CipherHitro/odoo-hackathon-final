from pydantic import BaseModel
from typing import List
from decimal import Decimal

class DepartmentCost(BaseModel):
    department_name: str
    total_cost: Decimal

class MonthlyTrend(BaseModel):
    month: str  # YYYY-MM
    total_net: Decimal

class DashboardResponse(BaseModel):
    total_payroll: Decimal
    average_salary: Decimal
    payslips_generated: int
    approved_time_off: int
    attendance_health: float
    cost_by_department: List[DepartmentCost]
    monthly_trend: List[MonthlyTrend]
    missing_contracts: int
