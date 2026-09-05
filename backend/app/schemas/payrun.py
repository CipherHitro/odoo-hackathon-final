from pydantic import BaseModel, ConfigDict
from datetime import date
from typing import List, Optional
from decimal import Decimal
from app.models.payroll import PayrunStatus, PayslipStatus

# Employee Minimal
class EmployeeMinimal(BaseModel):
    id: int
    name: str
    model_config = ConfigDict(from_attributes=True)

# Payslip Line
class PayslipLineBase(BaseModel):
    rule_name: str
    code: str
    category: str
    amount: Decimal
    sequence: int

class PayslipLineResponse(PayslipLineBase):
    id: int
    payslip_id: int
    model_config = ConfigDict(from_attributes=True)

# Payslip
class PayslipBase(BaseModel):
    payrun_id: int
    employee_id: int
    salary_structure_id: int
    contract_id: Optional[int]
    date_from: date
    date_to: date
    worked_days: int
    basic_wage: Decimal
    gross_wage: Decimal
    net_wage: Decimal
    status: str
    has_warning: bool
    warning_message: Optional[str]

class PayslipResponse(PayslipBase):
    id: int
    employee: Optional[EmployeeMinimal] = None
    lines: List[PayslipLineResponse] = []
    model_config = ConfigDict(from_attributes=True)

# Payrun
class PayrunBase(BaseModel):
    name: str
    salary_structure_id: int
    date_from: date
    date_to: date

class PayrunCreate(PayrunBase):
    pass

class PayrunUpdate(BaseModel):
    name: Optional[str] = None
    salary_structure_id: Optional[int] = None
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    status: Optional[str] = None

class PayrunResponse(PayrunBase):
    id: int
    status: str
    payslips: List[PayslipResponse] = []
    model_config = ConfigDict(from_attributes=True)

class PayrunComputePayload(BaseModel):
    employee_ids: Optional[List[int]] = None

class AssignContractPayload(BaseModel):
    contract_id: int
