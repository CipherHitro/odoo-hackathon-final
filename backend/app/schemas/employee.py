from pydantic import BaseModel, ConfigDict, EmailStr, model_validator
from typing import Optional, Any
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
    personal_email: Optional[EmailStr] = None
    gender: Optional[str] = "not_specified"

    @model_validator(mode="before")
    @classmethod
    def handle_address_alias(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "address" in data and not data.get("private_address"):
                data["private_address"] = data["address"]
        return data

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
    personal_email: Optional[EmailStr] = None
    gender: Optional[str] = None

    @model_validator(mode="before")
    @classmethod
    def handle_address_alias(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "address" in data and not data.get("private_address"):
                data["private_address"] = data["address"]
        return data

class EmployeeResponse(EmployeeBase):
    id: int
    department_name: Optional[str] = None
    address: Optional[str] = None

    @model_validator(mode="after")
    def sync_address(self) -> "EmployeeResponse":
        if not self.address and self.private_address:
            self.address = self.private_address
        return self
    
    # Smart button counts
    contracts_count: int = 0
    attendance_count: int = 0
    time_off_count: int = 0

    model_config = ConfigDict(from_attributes=True)
