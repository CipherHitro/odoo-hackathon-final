from pydantic import BaseModel
from typing import Optional

class DepartmentBase(BaseModel):
    name: str
    manager_id: Optional[int] = None

class DepartmentCreate(DepartmentBase):
    pass

class DepartmentUpdate(BaseModel):
    name: Optional[str] = None
    manager_id: Optional[int] = None

class DepartmentResponse(DepartmentBase):
    id: int

    class Config:
        orm_mode = True
        from_attributes = True
