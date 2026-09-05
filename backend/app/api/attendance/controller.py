# Purpose: Controller layer translating attendance domain errors into appropriate HTTP exceptions (400, 404, 409).
from datetime import datetime
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.attendance.service import (
    AlreadyCheckedInError,
    AttendanceRecordNotFoundError,
    AttendanceService,
    EmployeeNotFoundError,
    InvalidTimeRangeError,
    NotCheckedInError,
)
from app.models.user import User
from app.schemas.attendance import (
    AttendanceCreate,
    AttendanceListResponse,
    AttendanceResponse,
    AttendanceUpdate,
    AttendanceWidgetResponse,
    CheckInResponse,
    CheckOutResponse,
)


class AttendanceController:

    @staticmethod
    async def check_in(db: AsyncSession, user: User) -> CheckInResponse:
        try:
            return await AttendanceService.check_in(db, user)
        except AlreadyCheckedInError as exc:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=str(exc),
            ) from exc

    @staticmethod
    async def check_out(db: AsyncSession, user: User) -> CheckOutResponse:
        try:
            return await AttendanceService.check_out(db, user)
        except NotCheckedInError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(exc),
            ) from exc
        except InvalidTimeRangeError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(exc),
            ) from exc

    @staticmethod
    async def get_widget_state(db: AsyncSession, user: User) -> AttendanceWidgetResponse:
        return await AttendanceService.get_widget_state(db, user)

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
        return await AttendanceService.list_attendance(
            db=db,
            user=user,
            skip=skip,
            limit=limit,
            employee_id=employee_id,
            date_from=date_from,
            date_to=date_to,
        )

    @staticmethod
    async def get_by_id(
        db: AsyncSession,
        record_id: int,
        user: User,
    ) -> AttendanceResponse:
        try:
            return await AttendanceService.get_by_id(db, record_id, user)
        except AttendanceRecordNotFoundError as exc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(exc),
            ) from exc

    @staticmethod
    async def admin_create(
        db: AsyncSession,
        data: AttendanceCreate,
    ) -> AttendanceResponse:
        try:
            return await AttendanceService.admin_create(db, data)
        except EmployeeNotFoundError as exc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(exc),
            ) from exc
        except InvalidTimeRangeError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(exc),
            ) from exc

    @staticmethod
    async def admin_update(
        db: AsyncSession,
        record_id: int,
        data: AttendanceUpdate,
    ) -> AttendanceResponse:
        try:
            return await AttendanceService.admin_update(db, record_id, data)
        except AttendanceRecordNotFoundError as exc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(exc),
            ) from exc
        except InvalidTimeRangeError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(exc),
            ) from exc
