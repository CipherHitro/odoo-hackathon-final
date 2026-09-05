from pydantic import BaseModel
from typing import Optional, List
from decimal import Decimal

# Salary Rule Schemas
class SalaryRuleBase(BaseModel):
    name: str
    code: str
    category: str  # BASIC, GROSS, NET, etc.
    sequence: int = 10
    computation: str = "fixed"  # fixed, percentage, python
    fixed_amount: Optional[Decimal] = None
    percentage: Optional[float] = None
    percentage_base: Optional[str] = None
    python_code: Optional[str] = None

class SalaryRuleCreate(SalaryRuleBase):
    pass

class SalaryRuleUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    category: Optional[str] = None
    sequence: Optional[int] = None
    computation: Optional[str] = None
    fixed_amount: Optional[Decimal] = None
    percentage: Optional[float] = None
    percentage_base: Optional[str] = None
    python_code: Optional[str] = None

class SalaryRuleResponse(SalaryRuleBase):
    id: int
    salary_structure_id: int

    class Config:
        from_attributes = True

# Salary Structure Schemas
class SalaryStructureBase(BaseModel):
    name: str
    is_active: bool = True
    notes: Optional[str] = None

class SalaryStructureCreate(SalaryStructureBase):
    pass

class SalaryStructureUpdate(BaseModel):
    name: Optional[str] = None
    is_active: Optional[bool] = None
    notes: Optional[str] = None

class SalaryStructureResponse(SalaryStructureBase):
    id: int
    salary_rules: List[SalaryRuleResponse] = []

    class Config:
        from_attributes = True
