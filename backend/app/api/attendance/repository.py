# Purpose: Database access layer for attendance records (CRUD queries, active session lookup, user-employee linking).
from datetime import datetime
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.models.attendance import AttendanceRecord
from app.models.employee import Employee, EmployeeStatus
from app.models.user import User


class AttendanceRepository:

    @staticmethod
    async def get_or_create_employee_for_user(
        db: AsyncSession,
        user: User,
    ) -> Employee:
        """Find the employee profile associated with the user, or automatically create one."""
        # 1. Try to find by user_id
        result = await db.execute(
            select(Employee).where(Employee.user_id == user.id)
        )
        employee = result.scalar_one_or_none()
        if employee:
            return employee

        # 2. Try to find by work_email
        result = await db.execute(
            select(Employee).where(Employee.work_email == user.email)
        )
        employee = result.scalar_one_or_none()
        if employee:
            employee.user_id = user.id
            db.add(employee)
            await db.commit()
            await db.refresh(employee)
            return employee

        # 3. Create default employee profile for this user
        employee = Employee(
            name=user.name,
            work_email=user.email,
            user_id=user.id,
            company="My Company",
            status=EmployeeStatus.ACTIVE,
        )
        db.add(employee)
        await db.commit()
        await db.refresh(employee)
        return employee

    @staticmethod
    async def get_employee_by_id(
        db: AsyncSession,
        employee_id: int,
    ) -> Employee | None:
        result = await db.execute(
            select(Employee).where(Employee.id == employee_id)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def get_active_record(
        db: AsyncSession,
        employee_id: int,
    ) -> AttendanceRecord | None:
        """Find the current open attendance record (check_in present, check_out is None)."""
        result = await db.execute(
            select(AttendanceRecord)
            .where(
                AttendanceRecord.employee_id == employee_id,
                AttendanceRecord.check_out.is_(None),
            )
            .order_by(AttendanceRecord.check_in.desc())
        )
        return result.scalars().first()

    @staticmethod
    async def get_records_between(
        db: AsyncSession,
        employee_id: int,
        start_time: datetime,
        end_time: datetime,
    ) -> list[AttendanceRecord]:
        """Fetch all attendance records for an employee between two timestamps."""
        result = await db.execute(
            select(AttendanceRecord)
            .where(
                AttendanceRecord.employee_id == employee_id,
                AttendanceRecord.check_in >= start_time,
                AttendanceRecord.check_in <= end_time,
            )
            .order_by(AttendanceRecord.check_in.asc())
        )
        return list(result.scalars().all())

    @staticmethod
    async def get_by_id(
        db: AsyncSession,
        record_id: int,
    ) -> AttendanceRecord | None:
        result = await db.execute(
            select(AttendanceRecord)
            .options(joinedload(AttendanceRecord.employee))
            .where(AttendanceRecord.id == record_id)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def list_records(
        db: AsyncSession,
        skip: int = 0,
        limit: int = 50,
        employee_id: int | None = None,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
    ) -> tuple[list[AttendanceRecord], int]:
        conditions = []
        if employee_id is not None:
            conditions.append(AttendanceRecord.employee_id == employee_id)
        if date_from is not None:
            conditions.append(AttendanceRecord.check_in >= date_from)
        if date_to is not None:
            conditions.append(AttendanceRecord.check_in <= date_to)

        # Count total
        count_stmt = select(func.count(AttendanceRecord.id))
        if conditions:
            count_stmt = count_stmt.where(*conditions)
        total_res = await db.execute(count_stmt)
        total = total_res.scalar_one()

        # Fetch records
        stmt = (
            select(AttendanceRecord)
            .options(joinedload(AttendanceRecord.employee))
            .order_by(AttendanceRecord.check_in.desc())
            .offset(skip)
            .limit(limit)
        )
        if conditions:
            stmt = stmt.where(*conditions)

        result = await db.execute(stmt)
        records = list(result.scalars().all())
        return records, total

    @staticmethod
    async def create(
        db: AsyncSession,
        employee_id: int,
        check_in: datetime,
        check_out: datetime | None = None,
        worked_hours: float = 0.0,
        overtime_hours: float = 0.0,
        notes: str | None = None,
    ) -> AttendanceRecord:
        record = AttendanceRecord(
            employee_id=employee_id,
            check_in=check_in,
            check_out=check_out,
            worked_hours=worked_hours,
            overtime_hours=overtime_hours,
            notes=notes,
        )
        db.add(record)
        await db.commit()
        await db.refresh(record)

        # Ensure employee is loaded for response serialisation
        return await AttendanceRepository.get_by_id(db, record.id) or record

    @staticmethod
    async def save(
        db: AsyncSession,
        record: AttendanceRecord,
    ) -> AttendanceRecord:
        db.add(record)
        await db.commit()
        await db.refresh(record)
        return await AttendanceRepository.get_by_id(db, record.id) or record

    @staticmethod
    async def delete(
        db: AsyncSession,
        record: AttendanceRecord,
    ) -> None:
        await db.delete(record)
        await db.commit()
