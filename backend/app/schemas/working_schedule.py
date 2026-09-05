from pydantic import BaseModel, ConfigDict
from typing import Optional, List

class ScheduleLineBase(BaseModel):
    day_of_week: str
    start_time: str
    end_time: str
    break_hours: float = 1.0
    work_hours: float = 8.0

class ScheduleLineCreate(ScheduleLineBase):
    pass

class ScheduleLineResponse(ScheduleLineBase):
    id: int
    schedule_id: int

    model_config = ConfigDict(from_attributes=True)

class WorkingScheduleBase(BaseModel):
    name: str
    company: str = "My Company"
    days_per_week: int = 5
    hours_per_week: float = 40.0
    timezone: str = "Company timezone"
    is_active: bool = True

class WorkingScheduleCreate(WorkingScheduleBase):
    schedule_lines: Optional[List[ScheduleLineCreate]] = []

class WorkingScheduleUpdate(BaseModel):
    name: Optional[str] = None
    company: Optional[str] = None
    days_per_week: Optional[int] = None
    hours_per_week: Optional[float] = None
    timezone: Optional[str] = None
    is_active: Optional[bool] = None

class WorkingScheduleResponse(WorkingScheduleBase):
    id: int
    schedule_lines: List[ScheduleLineResponse] = []

    model_config = ConfigDict(from_attributes=True)
