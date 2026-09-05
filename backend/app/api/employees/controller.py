from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.api.employees.service import EmployeeService
from app.models.employee import Employee
from app.schemas.employee import EmployeeCreate, EmployeeUpdate, EmployeeResponse

from sqlalchemy.exc import IntegrityError

class EmployeeController:

    @classmethod
    def _to_response(cls, emp: Employee) -> EmployeeResponse:
        resp = EmployeeResponse.model_validate(emp)
        resp.contracts_count = len(emp.contracts) if emp.contracts else 0
        resp.department_name = emp.department.name if emp.department else None
        return resp

    @classmethod
    async def get_all(cls, db: AsyncSession) -> List[EmployeeResponse]:
        employees = await EmployeeService.get_all(db)
        return [cls._to_response(emp) for emp in employees]

    @classmethod
    async def get_by_id(cls, db: AsyncSession, employee_id: int) -> EmployeeResponse:
        emp = await EmployeeService.get_by_id(db, employee_id)
        if not emp:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Employee not found",
            )
        return cls._to_response(emp)

    @classmethod
    async def create(cls, db: AsyncSession, data: EmployeeCreate) -> EmployeeResponse:
        try:
            emp = await EmployeeService.create(db, data)
        except IntegrityError:
            await db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"An employee with email '{data.work_email}' already exists.",
            )
        # Fetch with eager loading to get department name
        full_emp = await EmployeeService.get_by_id(db, emp.id)
        return cls._to_response(full_emp or emp)

    @classmethod
    async def update(cls, db: AsyncSession, employee_id: int, data: EmployeeUpdate) -> EmployeeResponse:
        try:
            emp = await EmployeeService.update(db, employee_id, data)
        except IntegrityError:
            await db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"An employee with email '{data.work_email}' already exists.",
            )
        if not emp:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Employee not found",
            )
        full_emp = await EmployeeService.get_by_id(db, emp.id)
        return cls._to_response(full_emp or emp)
