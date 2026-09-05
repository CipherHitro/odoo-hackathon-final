from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.models.employee import Employee
from app.schemas.employee import EmployeeCreate, EmployeeUpdate

class EmployeeRepository:

    @staticmethod
    async def get_all(db: AsyncSession) -> List[Employee]:
        result = await db.execute(select(Employee))
        return list(result.scalars().all())

    @staticmethod
    async def get_by_id(db: AsyncSession, employee_id: int) -> Employee | None:
        return await db.get(Employee, employee_id)

    @staticmethod
    async def create(db: AsyncSession, data: EmployeeCreate) -> Employee:
        db_employee = Employee(**data.model_dump())
        db.add(db_employee)
        await db.commit()
        await db.refresh(db_employee)
        return db_employee

    @staticmethod
    async def update(db: AsyncSession, db_employee: Employee, data: EmployeeUpdate) -> Employee:
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_employee, key, value)
            
        await db.commit()
        await db.refresh(db_employee)
        return db_employee
