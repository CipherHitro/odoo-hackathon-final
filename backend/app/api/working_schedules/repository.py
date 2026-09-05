from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from typing import List

from app.models.working_schedule import WorkingSchedule, ScheduleLine
from app.schemas.working_schedule import WorkingScheduleCreate, WorkingScheduleUpdate

class WorkingScheduleRepository:

    @staticmethod
    async def get_all(db: AsyncSession) -> List[WorkingSchedule]:
        result = await db.execute(select(WorkingSchedule).options(selectinload(WorkingSchedule.schedule_lines)))
        return list(result.scalars().all())

    @staticmethod
    async def get_by_id(db: AsyncSession, schedule_id: int) -> WorkingSchedule | None:
        result = await db.execute(
            select(WorkingSchedule)
            .options(selectinload(WorkingSchedule.schedule_lines))
            .where(WorkingSchedule.id == schedule_id)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def create(db: AsyncSession, data: WorkingScheduleCreate) -> WorkingSchedule:
        dump = data.model_dump()
        lines_data = dump.pop("schedule_lines", [])
        
        db_schedule = WorkingSchedule(**dump)
        for line_data in lines_data:
            db_schedule.schedule_lines.append(ScheduleLine(**line_data))
            
        db.add(db_schedule)
        await db.commit()
        await db.refresh(db_schedule)
        
        # Reload with relationships
        result = await db.execute(
            select(WorkingSchedule)
            .options(selectinload(WorkingSchedule.schedule_lines))
            .where(WorkingSchedule.id == db_schedule.id)
        )
        return result.scalar_one()

    @staticmethod
    async def update(db: AsyncSession, db_schedule: WorkingSchedule, data: WorkingScheduleUpdate) -> WorkingSchedule:
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_schedule, key, value)
            
        await db.commit()
        
        # Refresh to return full relationship
        result = await db.execute(
            select(WorkingSchedule)
            .options(selectinload(WorkingSchedule.schedule_lines))
            .where(WorkingSchedule.id == db_schedule.id)
        )
        return result.scalar_one()
