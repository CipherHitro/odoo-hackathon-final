from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.api.departments.service import DepartmentService
from app.schemas.department import DepartmentCreate, DepartmentUpdate, DepartmentResponse

class DepartmentController:

    @staticmethod
    async def get_all(db: AsyncSession) -> List[DepartmentResponse]:
        departments = await DepartmentService.get_all(db)
        return [DepartmentResponse.model_validate(dept) for dept in departments]

    @staticmethod
    async def get_by_id(db: AsyncSession, dept_id: int) -> DepartmentResponse:
        dept = await DepartmentService.get_by_id(db, dept_id)
        if not dept:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Department not found",
            )
        return DepartmentResponse.model_validate(dept)

    @staticmethod
    async def create(db: AsyncSession, data: DepartmentCreate) -> DepartmentResponse:
        dept = await DepartmentService.create(db, data)
        return DepartmentResponse.model_validate(dept)

    @staticmethod
    async def update(db: AsyncSession, dept_id: int, data: DepartmentUpdate) -> DepartmentResponse:
        dept = await DepartmentService.update(db, dept_id, data)
        if not dept:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Department not found",
            )
        return DepartmentResponse.model_validate(dept)
