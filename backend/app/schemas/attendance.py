# Purpose: Pydantic schemas for Attendance API requests, responses, and navbar widget state validation.
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class CheckInResponse(BaseModel):
    id: int
    check_in: datetime
    message: str = "Checked in successfully"


class CheckOutResponse(BaseModel):
    id: int
    check_out: datetime
    worked_hours: float
    message: str = "Checked out"


class AttendanceWidgetResponse(BaseModel):
    is_checked_in: bool
    check_in_time: datetime | None = None
    elapsed_hours: float = 0.0
    today_worked_hours: float = 0.0


class AttendanceCreate(BaseModel):
    employee_id: int
    check_in: datetime
    check_out: datetime | None = None
    notes: str | None = None


class AttendanceUpdate(BaseModel):
    check_in: datetime | None = None
    check_out: datetime | None = None
    notes: str | None = None


class AttendanceResponse(BaseModel):
    id: int
    employee_id: int
    employee_name: str | None = None
    check_in: datetime | None = None
    check_out: datetime | None = None
    worked_hours: float = 0.0
    overtime_hours: float = 0.0
    status: str = "Present"
    notes: str | None = None

    model_config = ConfigDict(from_attributes=True)


class AttendanceListResponse(BaseModel):
    items: list[AttendanceResponse]
    total: int
