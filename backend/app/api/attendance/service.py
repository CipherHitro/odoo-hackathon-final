# Purpose: Business logic service for attendance (check-in/out rules, time difference math, overtime, and widget calculations).
from datetime import datetime, timezone
from typing import Sequence

from sqlalchemy.ext.asyncio import AsyncSession

from app.api.attendance.repository import AttendanceRepository
from app.core.exceptions import AppError
from app.models.attendance import AttendanceRecord
from app.models.employee import Employee
from app.models.user import User, UserRole
from app.schemas.attendance import (
    AttendanceCreate,
    AttendanceListResponse,
    AttendanceResponse,
    AttendanceUpdate,
    AttendanceWidgetResponse,
    CheckInResponse,
    CheckOutResponse,
)


class AlreadyCheckedInError(AppError):
    """Raised when an employee tries to check in while an active check-in session already exists."""


class NotCheckedInError(AppError):
    """Raised when an employee tries to check out without an active check-in session."""


class AttendanceRecordNotFoundError(AppError):
    """Raised when an attendance record is not found."""


class EmployeeNotFoundError(AppError):
    """Raised when the specified employee does not exist."""


class InvalidTimeRangeError(AppError):
    """Raised when check_out is earlier than check_in."""


STANDARD_WORK_HOURS_PER_DAY = 8.0


def _ensure_utc(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _compute_hours(check_in: datetime, check_out: datetime) -> tuple[float, float]:
    ci = _ensure_utc(check_in)
    co = _ensure_utc(check_out)
    if co < ci:
        raise InvalidTimeRangeError("Check-out time cannot be earlier than check-in time")
    total_seconds = max(0.0, (co - ci).total_seconds())
    worked_hours = round(total_seconds / 3600.0, 2)
    overtime_hours = round(max(0.0, worked_hours - STANDARD_WORK_HOURS_PER_DAY), 2)
    return worked_hours, overtime_hours


def _record_to_response(record: AttendanceRecord) -> AttendanceResponse:
    employee_name = record.employee.name if record.employee else None
    status = "Present" if record.check_in else "Absent"
    return AttendanceResponse(
        id=record.id,
        employee_id=record.employee_id,
        employee_name=employee_name,
        check_in=record.check_in,
        check_out=record.check_out,
        worked_hours=record.worked_hours,
        overtime_hours=record.overtime_hours,
        status=status,
        notes=record.notes,
    )


class AttendanceService:

    @staticmethod
    async def check_in(db: AsyncSession, user: User) -> CheckInResponse:
        employee = await AttendanceRepository.get_or_create_employee_for_user(db, user)
        active_record = await AttendanceRepository.get_active_record(db, employee.id)
        if active_record is not None:
            raise AlreadyCheckedInError("Already checked in. Please check out first.")

        now = datetime.now(timezone.utc)
        record = await AttendanceRepository.create(
            db,
            employee_id=employee.id,
            check_in=now,
            check_out=None,
            worked_hours=0.0,
            overtime_hours=0.0,
        )
        return CheckInResponse(
            id=record.id,
            check_in=record.check_in,
            message="Checked in successfully",
        )

    @staticmethod
    async def check_out(db: AsyncSession, user: User) -> CheckOutResponse:
        employee = await AttendanceRepository.get_or_create_employee_for_user(db, user)
        active_record = await AttendanceRepository.get_active_record(db, employee.id)
        if active_record is None:
            raise NotCheckedInError("Not currently checked in. Please check in first.")

        now = datetime.now(timezone.utc)
        worked_hours, overtime_hours = _compute_hours(active_record.check_in, now)

        active_record.check_out = now
        active_record.worked_hours = worked_hours
        active_record.overtime_hours = overtime_hours

        saved_record = await AttendanceRepository.save(db, active_record)
        return CheckOutResponse(
            id=saved_record.id,
            check_out=saved_record.check_out,
            worked_hours=saved_record.worked_hours,
            message="Checked out successfully",
        )

    @staticmethod
    async def get_widget_state(db: AsyncSession, user: User) -> AttendanceWidgetResponse:
        employee = await AttendanceRepository.get_or_create_employee_for_user(db, user)
        active_record = await AttendanceRepository.get_active_record(db, employee.id)

        now = datetime.now(timezone.utc)
        today_start = datetime(now.year, now.month, now.day, 0, 0, 0, tzinfo=timezone.utc)
        today_end = datetime(now.year, now.month, now.day, 23, 59, 59, 999999, tzinfo=timezone.utc)

        today_records = await AttendanceRepository.get_records_between(
            db, employee.id, today_start, today_end
        )

        today_worked_hours = 0.0
        for rec in today_records:
            if rec.check_out is not None:
                today_worked_hours += rec.worked_hours

        is_checked_in = False
        check_in_time = None
        elapsed_hours = 0.0

        if active_record is not None:
            is_checked_in = True
            check_in_time = active_record.check_in
            ci = _ensure_utc(active_record.check_in)
            elapsed_seconds = max(0.0, (now - ci).total_seconds())
            elapsed_hours = round(elapsed_seconds / 3600.0, 2)
            today_worked_hours += elapsed_hours

        return AttendanceWidgetResponse(
            is_checked_in=is_checked_in,
            check_in_time=check_in_time,
            elapsed_hours=elapsed_hours,
            today_worked_hours=round(today_worked_hours, 2),
        )

    @staticmethod
    async def list_attendance(
        db: AsyncSession,
        user: User,
        skip: int = 0,
        limit: int = 50,
        employee_id: int | None = None,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
    ) -> AttendanceListResponse:
        # Regular employees may only inspect their own attendance
        is_admin_or_hr = user.role in (
            UserRole.HR_MANAGER.value,
            UserRole.HR_PAYROLL_ADMIN.value,
            UserRole.ADMIN.value,
        )

        effective_emp_id = employee_id
        if not is_admin_or_hr:
            employee = await AttendanceRepository.get_or_create_employee_for_user(db, user)
            effective_emp_id = employee.id

        records, total = await AttendanceRepository.list_records(
            db,
            skip=skip,
            limit=limit,
            employee_id=effective_emp_id,
            date_from=date_from,
            date_to=date_to,
        )

        items = [_record_to_response(r) for r in records]
        return AttendanceListResponse(items=items, total=total)

    @staticmethod
    async def get_by_id(
        db: AsyncSession,
        record_id: int,
        user: User,
    ) -> AttendanceResponse:
        record = await AttendanceRepository.get_by_id(db, record_id)
        if record is None:
            raise AttendanceRecordNotFoundError(f"Attendance record #{record_id} not found")

        is_admin_or_hr = user.role in (
            UserRole.HR_MANAGER.value,
            UserRole.HR_PAYROLL_ADMIN.value,
            UserRole.ADMIN.value,
        )
        if not is_admin_or_hr:
            employee = await AttendanceRepository.get_or_create_employee_for_user(db, user)
            if record.employee_id != employee.id:
                raise AttendanceRecordNotFoundError(f"Attendance record #{record_id} not found")

        return _record_to_response(record)

    @staticmethod
    async def admin_create(
        db: AsyncSession,
        data: AttendanceCreate,
    ) -> AttendanceResponse:
        emp = await AttendanceRepository.get_employee_by_id(db, data.employee_id)
        if emp is None:
            raise EmployeeNotFoundError(f"Employee #{data.employee_id} not found")

        worked_hours = 0.0
        overtime_hours = 0.0
        if data.check_out is not None:
            worked_hours, overtime_hours = _compute_hours(data.check_in, data.check_out)

        record = await AttendanceRepository.create(
            db,
            employee_id=data.employee_id,
            check_in=data.check_in,
            check_out=data.check_out,
            worked_hours=worked_hours,
            overtime_hours=overtime_hours,
            notes=data.notes,
        )
        return _record_to_response(record)

    @staticmethod
    async def admin_update(
        db: AsyncSession,
        record_id: int,
        data: AttendanceUpdate,
    ) -> AttendanceResponse:
        record = await AttendanceRepository.get_by_id(db, record_id)
        if record is None:
            raise AttendanceRecordNotFoundError(f"Attendance record #{record_id} not found")

        new_check_in = data.check_in if data.check_in is not None else record.check_in
        new_check_out = data.check_out if data.check_out is not None else record.check_out

        if new_check_in is not None and new_check_out is not None:
            worked_hours, overtime_hours = _compute_hours(new_check_in, new_check_out)
            record.worked_hours = worked_hours
            record.overtime_hours = overtime_hours
        elif new_check_out is None:
            record.worked_hours = 0.0
            record.overtime_hours = 0.0

        if data.check_in is not None:
            record.check_in = data.check_in
        if data.check_out is not None:
            record.check_out = data.check_out
        if data.notes is not None:
            record.notes = data.notes

        saved = await AttendanceRepository.save(db, record)
        return _record_to_response(saved)
