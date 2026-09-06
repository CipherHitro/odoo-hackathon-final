from pydantic import BaseModel
from typing import List, Optional, Dict, Any
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
    paid_count: Optional[int] = 0
    pending_count: Optional[int] = 0
    status_split: Optional[Dict[str, int]] = None
    current_alerts: Optional[List[Dict[str, Any]]] = None
    attendance_overview: Optional[Dict[str, Any]] = None
    time_off_overview: Optional[List[Dict[str, Any]]] = None
    department_overview: Optional[List[Dict[str, Any]]] = None

