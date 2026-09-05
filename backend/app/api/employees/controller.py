from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.api.employees.service import EmployeeService
from app.models.employee import Employee
from app.schemas.employee import EmployeeCreate, EmployeeUpdate, EmployeeResponse

class EmployeeController:

    @staticmethod
    def _to_response(emp: Employee) -> EmployeeResponse:
        resp = EmployeeResponse.model_validate(emp)
        resp.contracts_count = len(emp.contracts) if emp.contracts else 0
        resp.attendance_count = len(emp.attendance_records) if emp.attendance_records else 0
        resp.time_off_count = len(emp.time_off_requests) if emp.time_off_requests else 0
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
        emp = await EmployeeService.create(db, data)
        fresh = await EmployeeService.get_by_id(db, emp.id)
        return cls._to_response(fresh or emp)

    @classmethod
    async def update(cls, db: AsyncSession, employee_id: int, data: EmployeeUpdate) -> EmployeeResponse:
        emp = await EmployeeService.update(db, employee_id, data)
        if not emp:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Employee not found",
            )
        fresh = await EmployeeService.get_by_id(db, employee_id)
        return cls._to_response(fresh or emp)
