# Purpose: Database access layer for Time Off types, allocations, and requests using SQLAlchemy async sessions.
from datetime import date
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.models.employee import Employee
from app.models.time_off import TimeOffAllocation, TimeOffRequest, TimeOffType


class TimeOffRepository:

    # -------------------------------------------------------------------------
    # Time Off Types
    # -------------------------------------------------------------------------

    @staticmethod
    async def get_type_by_id(
        db: AsyncSession,
        type_id: int,
    ) -> TimeOffType | None:
        result = await db.execute(
            select(TimeOffType).where(TimeOffType.id == type_id)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def get_type_by_name(
        db: AsyncSession,
        name: str,
    ) -> TimeOffType | None:
        result = await db.execute(
            select(TimeOffType).where(TimeOffType.name == name)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def list_types(
        db: AsyncSession,
        is_active: bool | None = None,
    ) -> list[TimeOffType]:
        stmt = select(TimeOffType).order_by(TimeOffType.id.asc())
        if is_active is not None:
            stmt = stmt.where(TimeOffType.is_active == is_active)
        result = await db.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def create_type(
        db: AsyncSession,
        **kwargs,
    ) -> TimeOffType:
        type_obj = TimeOffType(**kwargs)
        db.add(type_obj)
        await db.commit()
        await db.refresh(type_obj)
        return type_obj

    @staticmethod
    async def save_type(
        db: AsyncSession,
        type_obj: TimeOffType,
    ) -> TimeOffType:
        db.add(type_obj)
        await db.commit()
        await db.refresh(type_obj)
        return type_obj

    # -------------------------------------------------------------------------
    # Time Off Allocations
    # -------------------------------------------------------------------------

    @staticmethod
    async def get_allocation_by_id(
        db: AsyncSession,
        allocation_id: int,
    ) -> TimeOffAllocation | None:
        result = await db.execute(
            select(TimeOffAllocation)
            .options(
                joinedload(TimeOffAllocation.employee),
                joinedload(TimeOffAllocation.time_off_type),
            )
            .where(TimeOffAllocation.id == allocation_id)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def get_approved_allocations(
        db: AsyncSession,
        employee_id: int,
        type_id: int,
    ) -> list[TimeOffAllocation]:
        """Fetch all approved allocations for an employee and leave type."""
        result = await db.execute(
            select(TimeOffAllocation)
            .where(
                TimeOffAllocation.employee_id == employee_id,
                TimeOffAllocation.time_off_type_id == type_id,
                TimeOffAllocation.status == "approved",
            )
            .order_by(TimeOffAllocation.id.asc())
        )
        return list(result.scalars().all())

    @staticmethod
    async def list_allocations(
        db: AsyncSession,
        skip: int = 0,
        limit: int = 50,
        employee_id: int | None = None,
        type_id: int | None = None,
        status: str | None = None,
    ) -> tuple[list[TimeOffAllocation], int]:
        conditions = []
        if employee_id is not None:
            conditions.append(TimeOffAllocation.employee_id == employee_id)
        if type_id is not None:
            conditions.append(TimeOffAllocation.time_off_type_id == type_id)
        if status is not None:
            conditions.append(TimeOffAllocation.status == status)

        count_stmt = select(func.count(TimeOffAllocation.id))
        if conditions:
            count_stmt = count_stmt.where(*conditions)
        total_res = await db.execute(count_stmt)
        total = total_res.scalar_one()

        stmt = (
            select(TimeOffAllocation)
            .options(
                joinedload(TimeOffAllocation.employee),
                joinedload(TimeOffAllocation.time_off_type),
            )
            .order_by(TimeOffAllocation.id.desc())
            .offset(skip)
            .limit(limit)
        )
        if conditions:
            stmt = stmt.where(*conditions)

        result = await db.execute(stmt)
        records = list(result.scalars().all())
        return records, total

    @staticmethod
    async def create_allocation(
        db: AsyncSession,
        **kwargs,
    ) -> TimeOffAllocation:
        allocation = TimeOffAllocation(**kwargs)
        db.add(allocation)
        await db.commit()
        await db.refresh(allocation)
        return await TimeOffRepository.get_allocation_by_id(db, allocation.id) or allocation

    @staticmethod
    async def save_allocation(
        db: AsyncSession,
        allocation: TimeOffAllocation,
    ) -> TimeOffAllocation:
        db.add(allocation)
        await db.commit()
        await db.refresh(allocation)
        return await TimeOffRepository.get_allocation_by_id(db, allocation.id) or allocation

    # -------------------------------------------------------------------------
    # Time Off Requests
    # -------------------------------------------------------------------------

    @staticmethod
    async def get_request_by_id(
        db: AsyncSession,
        request_id: int,
    ) -> TimeOffRequest | None:
        result = await db.execute(
            select(TimeOffRequest)
            .options(
                joinedload(TimeOffRequest.employee),
                joinedload(TimeOffRequest.time_off_type),
                joinedload(TimeOffRequest.allocation),
            )
            .where(TimeOffRequest.id == request_id)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def list_requests(
        db: AsyncSession,
        skip: int = 0,
        limit: int = 50,
        employee_id: int | None = None,
        type_id: int | None = None,
        status: str | None = None,
        manager_id: int | None = None,
    ) -> tuple[list[TimeOffRequest], int]:
        conditions = []
        if employee_id is not None:
            conditions.append(TimeOffRequest.employee_id == employee_id)
        if type_id is not None:
            conditions.append(TimeOffRequest.time_off_type_id == type_id)
        if status is not None:
            conditions.append(TimeOffRequest.status == status)
        if manager_id is not None:
            conditions.append(Employee.manager_id == manager_id)

        count_stmt = select(func.count(TimeOffRequest.id))
        if manager_id is not None:
            count_stmt = count_stmt.join(TimeOffRequest.employee)
        if conditions:
            count_stmt = count_stmt.where(*conditions)
        total_res = await db.execute(count_stmt)
        total = total_res.scalar_one()

        stmt = (
            select(TimeOffRequest)
            .options(
                joinedload(TimeOffRequest.employee),
                joinedload(TimeOffRequest.time_off_type),
                joinedload(TimeOffRequest.allocation),
            )
            .order_by(TimeOffRequest.id.desc())
            .offset(skip)
            .limit(limit)
        )
        if manager_id is not None:
            stmt = stmt.join(TimeOffRequest.employee)
        if conditions:
            stmt = stmt.where(*conditions)

        result = await db.execute(stmt)
        records = list(result.scalars().all())
        return records, total

    @staticmethod
    async def create_request(
        db: AsyncSession,
        **kwargs,
    ) -> TimeOffRequest:
        req = TimeOffRequest(**kwargs)
        db.add(req)
        await db.commit()
        await db.refresh(req)
        return await TimeOffRepository.get_request_by_id(db, req.id) or req

    @staticmethod
    async def save_request(
        db: AsyncSession,
        request_obj: TimeOffRequest,
    ) -> TimeOffRequest:
        db.add(request_obj)
        await db.commit()
        await db.refresh(request_obj)
        return await TimeOffRepository.get_request_by_id(db, request_obj.id) or request_obj
