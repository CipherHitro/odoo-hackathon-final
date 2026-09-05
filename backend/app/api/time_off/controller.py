# Purpose: Controller translating Time Off domain exceptions into HTTP error codes (400, 404, 409).
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.time_off.service import TimeOffService
from app.core.exceptions import (
    AllocationNotFoundError,
    EmployeeProfileNotFoundError,
    InsufficientBalanceError,
    InvalidDateRangeError,
    InvalidStatusTransitionError,
    RequestNotFoundError,
    TimeOffTypeAlreadyExistsError,
    TimeOffTypeNotFoundError,
)
from app.models.user import User
from app.schemas.time_off import (
    MessageResponse,
    TimeOffAllocationCreate,
    TimeOffAllocationListResponse,
    TimeOffAllocationResponse,
    TimeOffRequestCreate,
    TimeOffRequestListResponse,
    TimeOffRequestResponse,
    TimeOffTypeCreate,
    TimeOffTypeListResponse,
    TimeOffTypeResponse,
    TimeOffTypeUpdate,
)


class TimeOffController:

    # -------------------------------------------------------------------------
    # Types
    # -------------------------------------------------------------------------

    @staticmethod
    async def create_type(
        db: AsyncSession,
        data: TimeOffTypeCreate,
    ) -> TimeOffTypeResponse:
        try:
            return await TimeOffService.create_type(db, data)
        except TimeOffTypeAlreadyExistsError as exc:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=str(exc),
            ) from exc

    @staticmethod
    async def list_types(
        db: AsyncSession,
        is_active: bool | None = None,
    ) -> TimeOffTypeListResponse:
        return await TimeOffService.list_types(db, is_active=is_active)

    @staticmethod
    async def update_type(
        db: AsyncSession,
        type_id: int,
        data: TimeOffTypeUpdate,
    ) -> TimeOffTypeResponse:
        try:
            return await TimeOffService.update_type(db, type_id, data)
        except TimeOffTypeNotFoundError as exc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(exc),
            ) from exc

    # -------------------------------------------------------------------------
    # Allocations
    # -------------------------------------------------------------------------

    @staticmethod
    async def create_allocation(
        db: AsyncSession,
        data: TimeOffAllocationCreate,
    ) -> TimeOffAllocationResponse:
        try:
            return await TimeOffService.create_allocation(db, data)
        except (EmployeeProfileNotFoundError, TimeOffTypeNotFoundError) as exc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(exc),
            ) from exc

    @staticmethod
    async def list_allocations(
        db: AsyncSession,
        user: User,
        skip: int = 0,
        limit: int = 50,
        employee_id: int | None = None,
        type_id: int | None = None,
        status_filter: str | None = None,
    ) -> TimeOffAllocationListResponse:
        return await TimeOffService.list_allocations(
            db,
            user=user,
            skip=skip,
            limit=limit,
            employee_id=employee_id,
            type_id=type_id,
            status=status_filter,
        )

    @staticmethod
    async def approve_allocation(
        db: AsyncSession,
        allocation_id: int,
        current_user: User,
    ) -> MessageResponse:
        try:
            return await TimeOffService.approve_allocation(db, allocation_id, current_user)
        except AllocationNotFoundError as exc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(exc),
            ) from exc

    @staticmethod
    async def refuse_allocation(
        db: AsyncSession,
        allocation_id: int,
    ) -> MessageResponse:
        try:
            return await TimeOffService.refuse_allocation(db, allocation_id)
        except AllocationNotFoundError as exc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(exc),
            ) from exc

    # -------------------------------------------------------------------------
    # Requests
    # -------------------------------------------------------------------------

    @staticmethod
    async def create_request(
        db: AsyncSession,
        user: User,
        data: TimeOffRequestCreate,
    ) -> TimeOffRequestResponse:
        try:
            return await TimeOffService.create_request(db, user, data)
        except (InvalidDateRangeError, InsufficientBalanceError) as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(exc),
            ) from exc
        except (TimeOffTypeNotFoundError, EmployeeProfileNotFoundError) as exc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(exc),
            ) from exc

    @staticmethod
    async def approve_request(
        db: AsyncSession,
        request_id: int,
        current_user: User,
    ) -> MessageResponse:
        try:
            return await TimeOffService.approve_request(db, request_id, current_user)
        except RequestNotFoundError as exc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(exc),
            ) from exc
        except InvalidStatusTransitionError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(exc),
            ) from exc

    @staticmethod
    async def refuse_request(
        db: AsyncSession,
        request_id: int,
    ) -> MessageResponse:
        try:
            return await TimeOffService.refuse_request(db, request_id)
        except RequestNotFoundError as exc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(exc),
            ) from exc

    @staticmethod
    async def list_requests(
        db: AsyncSession,
        user: User,
        skip: int = 0,
        limit: int = 50,
        employee_id: int | None = None,
        type_id: int | None = None,
        status_filter: str | None = None,
        my_team: bool = False,
    ) -> TimeOffRequestListResponse:
        return await TimeOffService.list_requests(
            db,
            user=user,
            skip=skip,
            limit=limit,
            employee_id=employee_id,
            type_id=type_id,
            status=status_filter,
            my_team=my_team,
        )
