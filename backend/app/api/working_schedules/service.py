from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.api.working_schedules.repository import WorkingScheduleRepository
from app.models.working_schedule import WorkingSchedule
from app.schemas.working_schedule import WorkingScheduleCreate, WorkingScheduleUpdate

class WorkingScheduleService:

    @staticmethod
    async def get_all(db: AsyncSession) -> List[WorkingSchedule]:
        return await WorkingScheduleRepository.get_all(db)

    @staticmethod
    async def get_by_id(db: AsyncSession, schedule_id: int) -> WorkingSchedule | None:
        return await WorkingScheduleRepository.get_by_id(db, schedule_id)

    @staticmethod
    async def create(db: AsyncSession, data: WorkingScheduleCreate) -> WorkingSchedule:
        return await WorkingScheduleRepository.create(db, data)

    @staticmethod
    async def update(db: AsyncSession, schedule_id: int, data: WorkingScheduleUpdate) -> WorkingSchedule | None:
        db_schedule = await WorkingScheduleRepository.get_by_id(db, schedule_id)
        if not db_schedule:
            return None
        return await WorkingScheduleRepository.update(db, db_schedule, data)

    @staticmethod
    async def delete(db: AsyncSession, schedule_id: int) -> bool:
        db_schedule = await WorkingScheduleRepository.get_by_id(db, schedule_id)
        if not db_schedule:
            return False
        return await WorkingScheduleRepository.delete(db, db_schedule)

