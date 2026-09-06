from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from typing import List

from app.models.employee import Employee, EmployeeStatus
from app.schemas.employee import EmployeeCreate, EmployeeUpdate

class EmployeeRepository:

    @staticmethod
    async def get_all(db: AsyncSession, include_archived: bool = False) -> List[Employee]:
        query = select(Employee).options(
            selectinload(Employee.department),
            selectinload(Employee.contracts),
            selectinload(Employee.attendance_records),
            selectinload(Employee.time_off_requests),
        )
        if not include_archived:
            query = query.where(Employee.status != EmployeeStatus.ARCHIVED.value)
        result = await db.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def get_by_id(db: AsyncSession, employee_id: int) -> Employee | None:
        result = await db.execute(
            select(Employee)
            .where(Employee.id == employee_id)
            .options(
                selectinload(Employee.department),
                selectinload(Employee.contracts),
                selectinload(Employee.attendance_records),
                selectinload(Employee.time_off_requests),
            )
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def get_by_user_id(db: AsyncSession, user_id: int) -> Employee | None:
        result = await db.execute(
            select(Employee)
            .where(Employee.user_id == user_id)
            .options(
                selectinload(Employee.department),
                selectinload(Employee.contracts),
                selectinload(Employee.attendance_records),
                selectinload(Employee.time_off_requests),
            )
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def create(db: AsyncSession, data: EmployeeCreate) -> Employee:
        from app.models.user import User, UserRole
        from app.core.security import hash_password
        from app.models.time_off import TimeOffType, TimeOffAllocation

        db_employee = Employee(**data.model_dump())

        # If work_email is provided, ensure a User login exists and is linked
        if db_employee.work_email:
            user_result = await db.execute(select(User).where(User.email == db_employee.work_email))
            existing_user = user_result.scalar_one_or_none()
            if existing_user:
                db_employee.user_id = existing_user.id
            elif not db_employee.user_id:
                new_user = User(
                    name=db_employee.name,
                    email=db_employee.work_email,
                    password_hash=hash_password("Password123!"),
                    role=UserRole.EMPLOYEE.value,
                    is_active=True,
                )
                db.add(new_user)
                await db.flush()
                db_employee.user_id = new_user.id

        db.add(db_employee)
        await db.flush()

        # Auto-provision standard time-off allocations (PTO, Sick, Casual) if types exist
        try:
            types_result = await db.execute(select(TimeOffType).where(TimeOffType.is_active == True))
            types = types_result.scalars().all()
            for t in types:
                days = 20.0 if "pto" in t.name.lower() or "paid" in t.name.lower() else (10.0 if "sick" in t.name.lower() else 12.0)
                alloc = TimeOffAllocation(
                    employee_id=db_employee.id,
                    time_off_type_id=t.id,
                    allocated_days=days,
                    taken_days=0.0,
                    status="approved",
                    validity_label="2026 Annual Leave Balance",
                    description="Standard new hire leave allocation",
                )
                db.add(alloc)
            await db.flush()
        except Exception:
            pass

        await db.commit()
        await db.refresh(db_employee)
        return db_employee

    @staticmethod
    async def update(db: AsyncSession, db_employee: Employee, data: EmployeeUpdate) -> Employee:
        from app.models.user import User, UserRole
        from app.core.security import hash_password

        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_employee, key, value)

        # If employee has work_email but no user_id, link or create user
        if not db_employee.user_id and db_employee.work_email:
            user_result = await db.execute(select(User).where(User.email == db_employee.work_email))
            existing_user = user_result.scalar_one_or_none()
            if existing_user:
                db_employee.user_id = existing_user.id
            else:
                new_user = User(
                    name=db_employee.name,
                    email=db_employee.work_email,
                    password_hash=hash_password("Password123!"),
                    role=UserRole.EMPLOYEE.value,
                    is_active=True,
                )
                db.add(new_user)
                await db.flush()
                db_employee.user_id = new_user.id
            
        # Also synchronize is_active with linked user if status was updated
        if "status" in update_data and db_employee.user_id:
            user_result = await db.execute(select(User).where(User.id == db_employee.user_id))
            linked_user = user_result.scalar_one_or_none()
            if linked_user:
                status_str = db_employee.status.value if hasattr(db_employee.status, "value") else str(db_employee.status)
                linked_user.is_active = (status_str == EmployeeStatus.ACTIVE.value)
                db.add(linked_user)

        await db.commit()
        await db.refresh(db_employee)
        return db_employee
