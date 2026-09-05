from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.api.working_schedules.service import WorkingScheduleService
from app.schemas.working_schedule import WorkingScheduleCreate, WorkingScheduleUpdate, WorkingScheduleResponse

class WorkingScheduleController:

    @staticmethod
    async def get_all(db: AsyncSession) -> List[WorkingScheduleResponse]:
        schedules = await WorkingScheduleService.get_all(db)
        return [WorkingScheduleResponse.model_validate(sch) for sch in schedules]

    @staticmethod
    async def get_by_id(db: AsyncSession, schedule_id: int) -> WorkingScheduleResponse:
        sch = await WorkingScheduleService.get_by_id(db, schedule_id)
        if not sch:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Working Schedule not found",
            )
        return WorkingScheduleResponse.model_validate(sch)

    @staticmethod
    async def create(db: AsyncSession, data: WorkingScheduleCreate) -> WorkingScheduleResponse:
        sch = await WorkingScheduleService.create(db, data)
        return WorkingScheduleResponse.model_validate(sch)

    @staticmethod
    async def update(db: AsyncSession, schedule_id: int, data: WorkingScheduleUpdate) -> WorkingScheduleResponse:
        sch = await WorkingScheduleService.update(db, schedule_id, data)
        if not sch:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Working Schedule not found",
            )
        return WorkingScheduleResponse.model_validate(sch)
