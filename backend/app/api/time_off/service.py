# Purpose: Business logic service for Time Off management (balance calculation, validation, and approval deduction).
from datetime import date
from typing import Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.api.employees.repository import EmployeeRepository
from app.api.time_off.repository import TimeOffRepository
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
from app.models.employee import Employee
from app.models.time_off import TimeOffAllocation, TimeOffRequest, TimeOffType
from app.models.user import User, UserRole
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


def _type_to_response(type_obj: TimeOffType) -> TimeOffTypeResponse:
    return TimeOffTypeResponse.model_validate(type_obj)


def _allocation_to_response(alloc: TimeOffAllocation) -> TimeOffAllocationResponse:
    employee_name = alloc.employee.name if alloc.employee else None
    type_name = alloc.time_off_type.name if alloc.time_off_type else None
    remaining_days = round(max(0.0, alloc.allocated_days - alloc.taken_days), 2)
    return TimeOffAllocationResponse(
        id=alloc.id,
        employee_id=alloc.employee_id,
        employee_name=employee_name,
        time_off_type_id=alloc.time_off_type_id,
        type_name=type_name,
        allocated_days=alloc.allocated_days,
        taken_days=alloc.taken_days,
        remaining_days=remaining_days,
        status=alloc.status,
        approver_id=alloc.approver_id,
        validity_label=alloc.validity_label,
        description=alloc.description,
    )


def _request_to_response(req: TimeOffRequest) -> TimeOffRequestResponse:
    employee_name = req.employee.name if req.employee else None
    type_name = req.time_off_type.name if req.time_off_type else None
    return TimeOffRequestResponse(
        id=req.id,
        employee_id=req.employee_id,
        employee_name=employee_name,
        time_off_type_id=req.time_off_type_id,
        type_name=type_name,
        allocation_id=req.allocation_id,
        start_date=req.start_date,
        end_date=req.end_date,
        duration_days=req.duration_days,
        status=req.status,
        approver_id=req.approver_id,
        reason=req.reason,
    )


class TimeOffService:

    # -------------------------------------------------------------------------
    # Time Off Types
    # -------------------------------------------------------------------------

    @staticmethod
    async def create_type(
        db: AsyncSession,
        data: TimeOffTypeCreate,
    ) -> TimeOffTypeResponse:
        existing = await TimeOffRepository.get_type_by_name(db, data.name)
        if existing:
            raise TimeOffTypeAlreadyExistsError(f"Time off type '{data.name}' already exists")

        type_obj = await TimeOffRepository.create_type(
            db,
            name=data.name,
            unit=data.unit,
            requires_allocation=data.requires_allocation,
            approval=data.approval,
            display_color=data.display_color,
            is_active=data.is_active,
            notes=data.notes,
        )
        return _type_to_response(type_obj)

    @staticmethod
    async def list_types(
        db: AsyncSession,
        is_active: bool | None = None,
    ) -> TimeOffTypeListResponse:
        types = await TimeOffRepository.list_types(db, is_active=is_active)
        items = [_type_to_response(t) for t in types]
        return TimeOffTypeListResponse(items=items, total=len(items))

    @staticmethod
    async def update_type(
        db: AsyncSession,
        type_id: int,
        data: TimeOffTypeUpdate,
    ) -> TimeOffTypeResponse:
        type_obj = await TimeOffRepository.get_type_by_id(db, type_id)
        if not type_obj:
            raise TimeOffTypeNotFoundError(f"Time off type #{type_id} not found")

        update_dict = data.model_dump(exclude_unset=True)
        for key, value in update_dict.items():
            setattr(type_obj, key, value)

        saved = await TimeOffRepository.save_type(db, type_obj)
        return _type_to_response(saved)

    # -------------------------------------------------------------------------
    # Time Off Allocations
    # -------------------------------------------------------------------------

    @staticmethod
    async def create_allocation(
        db: AsyncSession,
        data: TimeOffAllocationCreate,
    ) -> TimeOffAllocationResponse:
        emp = await EmployeeRepository.get_by_id(db, data.employee_id)
        if not emp:
            raise EmployeeProfileNotFoundError(f"Employee #{data.employee_id} not found")

        type_obj = await TimeOffRepository.get_type_by_id(db, data.time_off_type_id)
        if not type_obj:
            raise TimeOffTypeNotFoundError(f"Time off type #{data.time_off_type_id} not found")

        # Check if an existing allocation already exists for this employee and leave type
        result = await db.execute(
            select(TimeOffAllocation)
            .options(
                joinedload(TimeOffAllocation.employee),
                joinedload(TimeOffAllocation.time_off_type),
            )
            .where(
                TimeOffAllocation.employee_id == data.employee_id,
                TimeOffAllocation.time_off_type_id == data.time_off_type_id,
            )
            .order_by(TimeOffAllocation.id.asc())
        )
        existing_allocations = list(result.scalars().all())

        if existing_allocations:
            # Add on to existing allocation!
            primary = existing_allocations[0]
            primary.allocated_days += data.allocated_days
            primary.status = "approved"
            if data.validity_label:
                primary.validity_label = data.validity_label
            if data.description:
                primary.description = f"{primary.description or ''} | {data.description}".strip(" |")
            await TimeOffRepository.save_allocation(db, primary)
            return _allocation_to_response(primary)

        allocation = await TimeOffRepository.create_allocation(
            db,
            employee_id=data.employee_id,
            time_off_type_id=data.time_off_type_id,
            allocated_days=data.allocated_days,
            taken_days=0.0,
            status="approved",
            validity_label=data.validity_label,
            description=data.description,
        )
        return _allocation_to_response(allocation)

    @staticmethod
    async def list_allocations(
        db: AsyncSession,
        user: User,
        skip: int = 0,
        limit: int = 50,
        employee_id: int | None = None,
        type_id: int | None = None,
        status: str | None = None,
    ) -> TimeOffAllocationListResponse:
        is_hr_or_admin = user.role != UserRole.EMPLOYEE.value

        effective_emp_id = employee_id
        if not is_hr_or_admin:
            emp = await EmployeeRepository.get_by_user_id(db, user.id)
            effective_emp_id = emp.id if emp else -1

        records, total = await TimeOffRepository.list_allocations(
            db,
            skip=skip,
            limit=limit,
            employee_id=effective_emp_id,
            type_id=type_id,
            status=status,
        )
        items = [_allocation_to_response(a) for a in records]
        return TimeOffAllocationListResponse(items=items, total=total)

    @staticmethod
    async def approve_allocation(
        db: AsyncSession,
        allocation_id: int,
        current_user: User,
    ) -> MessageResponse:
        alloc = await TimeOffRepository.get_allocation_by_id(db, allocation_id)
        if not alloc:
            raise AllocationNotFoundError(f"Allocation #{allocation_id} not found")

        approver_emp = await EmployeeRepository.get_by_user_id(db, current_user.id)
        alloc.status = "approved"
        alloc.approver_id = approver_emp.id if approver_emp else None

        await TimeOffRepository.save_allocation(db, alloc)
        return MessageResponse(message="Allocation approved")

    @staticmethod
    async def refuse_allocation(
        db: AsyncSession,
        allocation_id: int,
    ) -> MessageResponse:
        alloc = await TimeOffRepository.get_allocation_by_id(db, allocation_id)
        if not alloc:
            raise AllocationNotFoundError(f"Allocation #{allocation_id} not found")

        alloc.status = "refused"
        await TimeOffRepository.save_allocation(db, alloc)
        return MessageResponse(message="Allocation refused")

    # -------------------------------------------------------------------------
    # Time Off Requests
    # -------------------------------------------------------------------------

    @staticmethod
    async def create_request(
        db: AsyncSession,
        user: User,
        data: TimeOffRequestCreate,
    ) -> TimeOffRequestResponse:
        if data.end_date < data.start_date:
            raise InvalidDateRangeError("End date cannot be earlier than start date")

        duration_days = float((data.end_date - data.start_date).days + 1)

        is_hr_or_admin = user.role != UserRole.EMPLOYEE.value

        # Resolve employee
        if not is_hr_or_admin or data.employee_id is None:
            emp = await EmployeeRepository.get_by_user_id(db, user.id)
            if not emp:
                raise EmployeeProfileNotFoundError("No employee profile found for current user")
            effective_emp_id = emp.id
        else:
            effective_emp_id = data.employee_id
            emp = await EmployeeRepository.get_by_id(db, effective_emp_id)
            if not emp:
                raise EmployeeProfileNotFoundError(f"Employee #{effective_emp_id} not found")

        # Validate leave type
        type_obj = await TimeOffRepository.get_type_by_id(db, data.time_off_type_id)
        if not type_obj:
            raise TimeOffTypeNotFoundError(f"Time off type #{data.time_off_type_id} not found")

        linked_allocation_id: int | None = None

        # Exact Balance Validation (Task 3 in P-05)
        if type_obj.requires_allocation:
            approved_allocs = await TimeOffRepository.get_approved_allocations(
                db, effective_emp_id, data.time_off_type_id
            )
            total_available = sum(max(0.0, a.allocated_days - a.taken_days) for a in approved_allocs)

            if total_available < duration_days:
                raise InsufficientBalanceError(
                    f"Insufficient time off balance. Required: {duration_days} day(s), "
                    f"Available: {total_available} day(s)."
                )

            # Link to the first approved allocation that has balance remaining
            for a in approved_allocs:
                if (a.allocated_days - a.taken_days) >= duration_days:
                    linked_allocation_id = a.id
                    break
            if linked_allocation_id is None and approved_allocs:
                linked_allocation_id = approved_allocs[0].id

        req = await TimeOffRepository.create_request(
            db,
            employee_id=effective_emp_id,
            time_off_type_id=data.time_off_type_id,
            allocation_id=linked_allocation_id,
            start_date=data.start_date,
            end_date=data.end_date,
            duration_days=duration_days,
            status="to_approve",
            reason=data.reason,
        )
        return _request_to_response(req)

    @staticmethod
    async def approve_request(
        db: AsyncSession,
        request_id: int,
        current_user: User,
    ) -> MessageResponse:
        req = await TimeOffRepository.get_request_id(db, request_id) if hasattr(TimeOffRepository, "get_request_id") else await TimeOffRepository.get_request_by_id(db, request_id)
        if not req:
            raise RequestNotFoundError(f"Time off request #{request_id} not found")

        if req.status == "approved":
            raise InvalidStatusTransitionError("Request is already approved")

        approver_emp = await EmployeeRepository.get_by_user_id(db, current_user.id)
        req.status = "approved"
        req.approver_id = approver_emp.id if approver_emp else None

        # Approval Deduction Logic (Task 4 in P-05): increment taken_days
        if req.allocation_id is not None:
            alloc = await TimeOffRepository.get_allocation_by_id(db, req.allocation_id)
            if alloc:
                alloc.taken_days = round(alloc.taken_days + req.duration_days, 2)
                await TimeOffRepository.save_allocation(db, alloc)
        elif req.time_off_type and req.time_off_type.requires_allocation:
            # Fallback: search for approved allocation and deduct
            allocs = await TimeOffRepository.get_approved_allocations(
                db, req.employee_id, req.time_off_type_id
            )
            if allocs:
                allocs[0].taken_days = round(allocs[0].taken_days + req.duration_days, 2)
                req.allocation_id = allocs[0].id
                await TimeOffRepository.save_allocation(db, allocs[0])

        await TimeOffRepository.save_request(db, req)
        return MessageResponse(message="Request approved")

    @staticmethod
    async def refuse_request(
        db: AsyncSession,
        request_id: int,
    ) -> MessageResponse:
        req = await TimeOffRepository.get_request_by_id(db, request_id)
        if not req:
            raise RequestNotFoundError(f"Time off request #{request_id} not found")

        # If previously approved, reverse the deducted balance
        if req.status == "approved" and req.allocation_id is not None:
            alloc = await TimeOffRepository.get_allocation_by_id(db, req.allocation_id)
            if alloc:
                alloc.taken_days = round(max(0.0, alloc.taken_days - req.duration_days), 2)
                await TimeOffRepository.save_allocation(db, alloc)

        req.status = "refused"
        await TimeOffRepository.save_request(db, req)
        return MessageResponse(message="Request refused")

    @staticmethod
    async def list_requests(
        db: AsyncSession,
        user: User,
        skip: int = 0,
        limit: int = 50,
        employee_id: int | None = None,
        type_id: int | None = None,
        status: str | None = None,
        my_team: bool = False,
    ) -> TimeOffRequestListResponse:
        is_hr_or_admin = user.role != UserRole.EMPLOYEE.value

        effective_emp_id = employee_id
        manager_id: int | None = None

        if my_team:
            emp = await EmployeeRepository.get_by_user_id(db, user.id)
            manager_id = emp.id if emp else -1
        elif not is_hr_or_admin:
            emp = await EmployeeRepository.get_by_user_id(db, user.id)
            effective_emp_id = emp.id if emp else -1

        records, total = await TimeOffRepository.list_requests(
            db,
            skip=skip,
            limit=limit,
            employee_id=effective_emp_id,
            type_id=type_id,
            status=status,
            manager_id=manager_id,
        )
        items = [_request_to_response(r) for r in records]
        return TimeOffRequestListResponse(items=items, total=total)
