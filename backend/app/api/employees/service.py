from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.api.employees.repository import EmployeeRepository
from app.models.employee import Employee
from app.schemas.employee import EmployeeCreate, EmployeeUpdate

class EmployeeService:

    @staticmethod
    async def get_all(db: AsyncSession) -> List[Employee]:
        return await EmployeeRepository.get_all(db)

    @staticmethod
    async def get_by_id(db: AsyncSession, employee_id: int) -> Employee | None:
        return await EmployeeRepository.get_by_id(db, employee_id)

    @staticmethod
    async def create(db: AsyncSession, data: EmployeeCreate) -> Employee:
        return await EmployeeRepository.create(db, data)

    @staticmethod
    async def update(db: AsyncSession, employee_id: int, data: EmployeeUpdate) -> Employee | None:
        db_employee = await EmployeeRepository.get_by_id(db, employee_id)
        if not db_employee:
            return None
        return await EmployeeRepository.update(db, db_employee, data)
