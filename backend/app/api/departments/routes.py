from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.core.database import get_db
from app.api.departments.controller import DepartmentController
from app.schemas.department import DepartmentCreate, DepartmentUpdate, DepartmentResponse

router = APIRouter(prefix="/departments", tags=["Departments"])

@router.get("/", response_model=List[DepartmentResponse])
async def get_departments(db: AsyncSession = Depends(get_db)):
    return await DepartmentController.get_all(db)

@router.post("/", response_model=DepartmentResponse)
async def create_department(data: DepartmentCreate, db: AsyncSession = Depends(get_db)):
    return await DepartmentController.create(db, data)

@router.get("/{dept_id}", response_model=DepartmentResponse)
async def get_department(dept_id: int, db: AsyncSession = Depends(get_db)):
    return await DepartmentController.get_by_id(db, dept_id)

@router.patch("/{dept_id}", response_model=DepartmentResponse)
async def update_department(dept_id: int, data: DepartmentUpdate, db: AsyncSession = Depends(get_db)):
    return await DepartmentController.update(db, dept_id, data)
