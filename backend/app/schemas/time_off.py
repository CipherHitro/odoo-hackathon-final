# Purpose: Pydantic schemas for Time Off types, allocations, requests, and balance responses.
from datetime import date
from pydantic import BaseModel, ConfigDict, Field


class TimeOffTypeCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    unit: str = "days"
    requires_allocation: bool = True
    approval: str = "manager"
    display_color: str | None = "blue"
    is_active: bool = True
    notes: str | None = None


class TimeOffTypeUpdate(BaseModel):
    name: str | None = None
    unit: str | None = None
    requires_allocation: bool | None = None
    approval: str | None = None
    display_color: str | None = None
    is_active: bool | None = None
    notes: str | None = None


class TimeOffTypeResponse(BaseModel):
    id: int
    name: str
    unit: str
    requires_allocation: bool
    approval: str
    display_color: str | None = None
    is_active: bool
    notes: str | None = None

    model_config = ConfigDict(from_attributes=True)


class TimeOffTypeListResponse(BaseModel):
    items: list[TimeOffTypeResponse]
    total: int


class TimeOffAllocationCreate(BaseModel):
    employee_id: int
    time_off_type_id: int
    allocated_days: float = Field(gt=0)
    validity_label: str | None = None
    description: str | None = None


class TimeOffAllocationResponse(BaseModel):
    id: int
    employee_id: int
    employee_name: str | None = None
    time_off_type_id: int
    type_name: str | None = None
    allocated_days: float
    taken_days: float
    remaining_days: float
    status: str
    approver_id: int | None = None
    validity_label: str | None = None
    description: str | None = None

    model_config = ConfigDict(from_attributes=True)


class TimeOffAllocationListResponse(BaseModel):
    items: list[TimeOffAllocationResponse]
    total: int


class TimeOffRequestCreate(BaseModel):
    employee_id: int | None = None
    time_off_type_id: int
    start_date: date
    end_date: date
    reason: str | None = None


class TimeOffRequestResponse(BaseModel):
    id: int
    employee_id: int
    employee_name: str | None = None
    time_off_type_id: int
    type_name: str | None = None
    allocation_id: int | None = None
    start_date: date
    end_date: date
    duration_days: float
    status: str
    approver_id: int | None = None
    reason: str | None = None

    model_config = ConfigDict(from_attributes=True)


class TimeOffRequestListResponse(BaseModel):
    items: list[TimeOffRequestResponse]
    total: int


class MessageResponse(BaseModel):
    message: str
