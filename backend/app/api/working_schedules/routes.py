from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.core.database import get_db
from app.api.working_schedules.controller import WorkingScheduleController
from app.schemas.working_schedule import WorkingScheduleCreate, WorkingScheduleUpdate, WorkingScheduleResponse

router = APIRouter(prefix="/working-schedules", tags=["Working Schedules"])

@router.get("/", response_model=List[WorkingScheduleResponse])
async def get_working_schedules(db: AsyncSession = Depends(get_db)):
    return await WorkingScheduleController.get_all(db)

@router.post("/", response_model=WorkingScheduleResponse)
async def create_working_schedule(data: WorkingScheduleCreate, db: AsyncSession = Depends(get_db)):
    return await WorkingScheduleController.create(db, data)

@router.get("/{schedule_id}", response_model=WorkingScheduleResponse)
async def get_working_schedule(schedule_id: int, db: AsyncSession = Depends(get_db)):
    return await WorkingScheduleController.get_by_id(db, schedule_id)

@router.patch("/{schedule_id}", response_model=WorkingScheduleResponse)
async def update_working_schedule(schedule_id: int, data: WorkingScheduleUpdate, db: AsyncSession = Depends(get_db)):
    return await WorkingScheduleController.update(db, schedule_id, data)
