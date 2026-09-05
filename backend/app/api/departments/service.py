from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.api.departments.repository import DepartmentRepository
from app.models.department import Department
from app.schemas.department import DepartmentCreate, DepartmentUpdate

class DepartmentService:

    @staticmethod
    async def get_all(db: AsyncSession) -> List[Department]:
        return await DepartmentRepository.get_all(db)

    @staticmethod
    async def get_by_id(db: AsyncSession, dept_id: int) -> Department | None:
        return await DepartmentRepository.get_by_id(db, dept_id)

    @staticmethod
    async def create(db: AsyncSession, data: DepartmentCreate) -> Department:
        return await DepartmentRepository.create(db, data)

    @staticmethod
    async def update(db: AsyncSession, dept_id: int, data: DepartmentUpdate) -> Department | None:
        db_dept = await DepartmentRepository.get_by_id(db, dept_id)
        if not db_dept:
            return None
        return await DepartmentRepository.update(db, db_dept, data)
