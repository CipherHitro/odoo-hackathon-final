from datetime import date
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field, model_validator
from app.models.contract import ContractStatus


class ContractBase(BaseModel):
    employee_id: int
    department_id: Optional[int] = None
    job_position: Optional[str] = None
    start_date: date
    end_date: Optional[date] = None
    working_schedule_id: Optional[int] = None
    salary_structure_id: Optional[int] = None
    status: ContractStatus = ContractStatus.DRAFT
    notes: Optional[str] = None


class ContractCreate(BaseModel):
    employee_id: int
    start_date: date
    department_id: Optional[int] = None
    job_position: Optional[str] = None
    end_date: Optional[date] = None
    working_schedule_id: Optional[int] = None
    salary_structure_id: Optional[int] = None
    status: ContractStatus = ContractStatus.DRAFT
    notes: Optional[str] = None

    @model_validator(mode="after")
    def validate_dates(self) -> "ContractCreate":
        if self.end_date is not None:
            if self.end_date <= self.start_date:
                raise ValueError("End date cannot be on or before start date.")
        return self


class ContractUpdate(BaseModel):
    department_id: Optional[int] = None
    job_position: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    working_schedule_id: Optional[int] = None
    salary_structure_id: Optional[int] = None
    status: Optional[ContractStatus] = None
    notes: Optional[str] = None

    @model_validator(mode="after")
    def validate_dates(self) -> "ContractUpdate":
        if self.start_date is not None and self.end_date is not None:
            if self.end_date <= self.start_date:
                raise ValueError("End date cannot be on or before start date.")
        return self


class ContractResponse(ContractBase):
    id: int
    reference: str
    employee_name: Optional[str] = None
    department_name: Optional[str] = None
    working_schedule_name: Optional[str] = None
    salary_structure_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ContractListResponse(BaseModel):
    items: List[ContractResponse]
    total: int
