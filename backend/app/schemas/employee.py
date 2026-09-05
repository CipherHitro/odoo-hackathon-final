from pydantic import BaseModel, ConfigDict, EmailStr
from typing import Optional
from datetime import date
from app.models.employee import EmployeeStatus

class EmployeeBase(BaseModel):
    name: str
    job_position: Optional[str] = None
    department_id: Optional[int] = None
    manager_id: Optional[int] = None
    work_location: Optional[str] = None
    work_email: Optional[EmailStr] = None
    phone: Optional[str] = None
    company: str = "My Company"
    working_schedule_id: Optional[int] = None
    status: EmployeeStatus = EmployeeStatus.ACTIVE
    user_id: Optional[int] = None
    date_of_birth: Optional[date] = None
    private_address: Optional[str] = None

class EmployeeCreate(EmployeeBase):
    pass

class EmployeeUpdate(BaseModel):
    name: Optional[str] = None
    job_position: Optional[str] = None
    department_id: Optional[int] = None
    manager_id: Optional[int] = None
    work_location: Optional[str] = None
    work_email: Optional[EmailStr] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    working_schedule_id: Optional[int] = None
    status: Optional[EmployeeStatus] = None
    user_id: Optional[int] = None
    date_of_birth: Optional[date] = None
    private_address: Optional[str] = None

class EmployeeResponse(EmployeeBase):
    id: int
    
    # Smart button counts
    contracts_count: int = 0
    attendance_count: int = 0
    time_off_count: int = 0
    department_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
