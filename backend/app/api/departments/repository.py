from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.models.department import Department
from app.schemas.department import DepartmentCreate, DepartmentUpdate

class DepartmentRepository:

    @staticmethod
    async def get_all(db: AsyncSession) -> List[Department]:
        result = await db.execute(select(Department))
        return list(result.scalars().all())

    @staticmethod
    async def get_by_id(db: AsyncSession, dept_id: int) -> Department | None:
        return await db.get(Department, dept_id)

    @staticmethod
    async def create(db: AsyncSession, data: DepartmentCreate) -> Department:
        db_dept = Department(**data.model_dump())
        db.add(db_dept)
        await db.commit()
        await db.refresh(db_dept)
        return db_dept

    @staticmethod
    async def update(db: AsyncSession, db_dept: Department, data: DepartmentUpdate) -> Department:
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_dept, key, value)
        
        await db.commit()
        await db.refresh(db_dept)
        return db_dept
