from datetime import date
from sqlalchemy import func, or_, and_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from typing import List, Tuple

from app.models.contract import Contract, ContractStatus
from app.models.employee import Employee
from app.schemas.contract import ContractCreate, ContractUpdate


class ContractRepository:

    @classmethod
    async def find_overlapping_running_contract(
        cls,
        db: AsyncSession,
        employee_id: int,
        start_date: date,
        end_date: date | None,
        exclude_contract_id: int | None = None,
    ) -> Contract | None:
        """Find any existing active/running contract for this employee that overlaps with the given period."""
        today = date.today()

        conditions = [
            Contract.employee_id == employee_id,
            Contract.status == ContractStatus.RUNNING.value,
            or_(Contract.end_date == None, Contract.end_date >= today),
        ]

        if exclude_contract_id is not None:
            conditions.append(Contract.id != exclude_contract_id)

        # 1. New start <= Existing end (or existing end is None)
        conditions.append(or_(Contract.end_date == None, Contract.end_date >= start_date))

        # 2. Existing start <= New end (if new end is not None)
        if end_date is not None:
            conditions.append(Contract.start_date <= end_date)

        query = select(Contract).where(and_(*conditions)).limit(1)
        result = await db.execute(query)
        return result.scalar_one_or_none()

    @staticmethod
    async def has_associated_payslips(db: AsyncSession, contract_id: int) -> bool:
        from app.models.payroll import Payslip
        result = await db.execute(
            select(func.count(Payslip.id)).where(Payslip.contract_id == contract_id)
        )
        count = result.scalar() or 0
        return count > 0

    @staticmethod
    async def generate_reference(db: AsyncSession, start_date: date) -> str:
        """Auto-generate unique contract reference formatted as CON/YYYY/0001."""
        year = start_date.year
        prefix = f"CON/{year}/"

        result = await db.execute(
            select(Contract.reference)
            .where(Contract.reference.like(f"{prefix}%"))
            .order_by(Contract.reference.desc())
        )
        existing_refs = result.scalars().all()

        max_seq = 0
        for ref in existing_refs:
            parts = ref.split("/")
            if len(parts) == 3 and parts[2].isdigit():
                seq = int(parts[2])
                if seq > max_seq:
                    max_seq = seq

        next_seq = max_seq + 1
        return f"{prefix}{next_seq:04d}"

    @staticmethod
    def _check_and_update_expired(contract: Contract) -> bool:
        """If end_date is in the past and status is running, mark as expired."""
        today = date.today()
        if (
            contract.end_date
            and contract.end_date < today
            and contract.status == ContractStatus.RUNNING.value
        ):
            contract.status = ContractStatus.EXPIRED.value
            return True
        return False

    @classmethod
    async def get_all(
        cls,
        db: AsyncSession,
        skip: int = 0,
        limit: int = 50,
        search: str | None = None,
        employee_id: int | None = None,
        status: str | None = None,
    ) -> Tuple[List[Contract], int]:
        query = (
            select(Contract)
            .options(
                selectinload(Contract.employee),
                selectinload(Contract.department),
                selectinload(Contract.working_schedule),
                selectinload(Contract.salary_structure),
            )
        )

        count_query = select(func.count(Contract.id))

        filters = []
        if employee_id is not None:
            filters.append(Contract.employee_id == employee_id)

        if status:
            filters.append(Contract.status == status)

        if search:
            search_filter = or_(
                Contract.reference.ilike(f"%{search}%"),
                Contract.job_position.ilike(f"%{search}%"),
                Contract.employee.has(Employee.name.ilike(f"%{search}%")),
            )
            filters.append(search_filter)

        if filters:
            for f in filters:
                query = query.where(f)
                count_query = count_query.where(f)

        total_res = await db.execute(count_query)
        total = total_res.scalar() or 0

        query = query.order_by(Contract.id.desc()).offset(skip).limit(limit)
        result = await db.execute(query)
        contracts = list(result.scalars().all())

        # Update any expired contracts
        has_updates = False
        for c in contracts:
            if cls._check_and_update_expired(c):
                has_updates = True

        if has_updates:
            await db.commit()

        return contracts, total

    @classmethod
    async def get_by_id(cls, db: AsyncSession, contract_id: int) -> Contract | None:
        query = (
            select(Contract)
            .where(Contract.id == contract_id)
            .options(
                selectinload(Contract.employee),
                selectinload(Contract.department),
                selectinload(Contract.working_schedule),
                selectinload(Contract.salary_structure),
            )
        )
        result = await db.execute(query)
        contract = result.scalar_one_or_none()

        if contract and cls._check_and_update_expired(contract):
            await db.commit()

        return contract

    @classmethod
    async def get_by_employee_id(
        cls, db: AsyncSession, employee_id: int
    ) -> List[Contract]:
        query = (
            select(Contract)
            .where(Contract.employee_id == employee_id)
            .options(
                selectinload(Contract.employee),
                selectinload(Contract.department),
                selectinload(Contract.working_schedule),
                selectinload(Contract.salary_structure),
            )
            .order_by(Contract.id.desc())
        )
        result = await db.execute(query)
        contracts = list(result.scalars().all())

        has_updates = False
        for c in contracts:
            if cls._check_and_update_expired(c):
                has_updates = True
        if has_updates:
            await db.commit()

        return contracts

    @classmethod
    async def create(cls, db: AsyncSession, data: ContractCreate) -> Contract:
        # Inherit defaults from employee if not provided
        employee = await db.get(Employee, data.employee_id)
        department_id = data.department_id
        job_position = data.job_position
        working_schedule_id = data.working_schedule_id

        if employee:
            if department_id is None:
                department_id = employee.department_id
            if job_position is None:
                job_position = employee.job_position
            if working_schedule_id is None:
                working_schedule_id = employee.working_schedule_id

        status_val = (
            data.status.value
            if isinstance(data.status, ContractStatus)
            else str(data.status)
        )

        for attempt in range(5):
            reference = await cls.generate_reference(db, data.start_date)
            contract = Contract(
                reference=reference,
                employee_id=data.employee_id,
                department_id=department_id,
                job_position=job_position,
                start_date=data.start_date,
                end_date=data.end_date,
                wage_monthly=data.wage_monthly,
                working_schedule_id=working_schedule_id,
                salary_structure_id=data.salary_structure_id,
                status=status_val,
                notes=data.notes,
            )

            cls._check_and_update_expired(contract)

            db.add(contract)
            try:
                await db.commit()
                await db.refresh(contract)
                return await cls.get_by_id(db, contract.id)  # type: ignore
            except IntegrityError as e:
                await db.rollback()
                if "reference" in str(e).lower() and attempt < 4:
                    continue
                raise

    @classmethod
    async def update(
        cls, db: AsyncSession, contract: Contract, data: ContractUpdate
    ) -> Contract:
        update_data = data.model_dump(exclude_unset=True)

        for key, value in update_data.items():
            if key == "status" and isinstance(value, ContractStatus):
                setattr(contract, key, value.value)
            else:
                setattr(contract, key, value)

        cls._check_and_update_expired(contract)

        await db.commit()
        await db.refresh(contract)

        return await cls.get_by_id(db, contract.id)  # type: ignore

    @staticmethod
    async def delete(db: AsyncSession, contract: Contract) -> None:
        await db.delete(contract)
        await db.commit()
