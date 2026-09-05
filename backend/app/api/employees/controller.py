from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.api.employees.service import EmployeeService
from app.schemas.employee import EmployeeCreate, EmployeeUpdate, EmployeeResponse

class EmployeeController:

    @staticmethod
    async def get_all(db: AsyncSession) -> List[EmployeeResponse]:
        employees = await EmployeeService.get_all(db)
        return [EmployeeResponse.model_validate(emp) for emp in employees]

    @staticmethod
    async def get_by_id(db: AsyncSession, employee_id: int) -> EmployeeResponse:
        emp = await EmployeeService.get_by_id(db, employee_id)
        if not emp:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Employee not found",
            )
        return EmployeeResponse.model_validate(emp)

    @staticmethod
    async def create(db: AsyncSession, data: EmployeeCreate) -> EmployeeResponse:
        emp = await EmployeeService.create(db, data)
        return EmployeeResponse.model_validate(emp)

    @staticmethod
    async def update(db: AsyncSession, employee_id: int, data: EmployeeUpdate) -> EmployeeResponse:
        emp = await EmployeeService.update(db, employee_id, data)
        if not emp:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Employee not found",
            )
        return EmployeeResponse.model_validate(emp)
