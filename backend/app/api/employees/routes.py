from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.core.database import get_db
from app.api.employees.controller import EmployeeController
from app.schemas.employee import EmployeeCreate, EmployeeUpdate, EmployeeResponse

router = APIRouter(prefix="/employees", tags=["Employees"])

@router.get("/", response_model=List[EmployeeResponse])
async def get_employees(db: AsyncSession = Depends(get_db)):
    return await EmployeeController.get_all(db)

@router.post("/", response_model=EmployeeResponse)
async def create_employee(data: EmployeeCreate, db: AsyncSession = Depends(get_db)):
    return await EmployeeController.create(db, data)

@router.get("/{employee_id}", response_model=EmployeeResponse)
async def get_employee(employee_id: int, db: AsyncSession = Depends(get_db)):
    return await EmployeeController.get_by_id(db, employee_id)

@router.patch("/{employee_id}", response_model=EmployeeResponse)
async def update_employee(employee_id: int, data: EmployeeUpdate, db: AsyncSession = Depends(get_db)):
    return await EmployeeController.update(db, employee_id, data)
