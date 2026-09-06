from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Tuple

from app.api.contracts.repository import ContractRepository
from app.api.employees.repository import EmployeeRepository
from app.core.exceptions import (
    ContractNotFoundError,
    EmployeeNotFoundError,
    InvalidDateRangeError,
    ContractOverlapError,
    ContractValidationError,
    ContractInUseError,
)
from app.models.contract import Contract, ContractStatus
from app.models.department import Department
from app.models.working_schedule import WorkingSchedule
from app.models.payroll import SalaryStructure
from app.schemas.contract import ContractCreate, ContractUpdate


class ContractService:

    @staticmethod
    async def get_all(
        db: AsyncSession,
        skip: int = 0,
        limit: int = 50,
        search: str | None = None,
        employee_id: int | None = None,
        status: str | None = None,
    ) -> Tuple[List[Contract], int]:
        return await ContractRepository.get_all(
            db=db,
            skip=skip,
            limit=limit,
            search=search,
            employee_id=employee_id,
            status=status,
        )

    @staticmethod
    async def get_by_id(db: AsyncSession, contract_id: int) -> Contract:
        contract = await ContractRepository.get_by_id(db, contract_id)
        if not contract:
            raise ContractNotFoundError(f"Contract with id {contract_id} not found")
        return contract

    @staticmethod
    async def get_by_employee_id(
        db: AsyncSession, employee_id: int
    ) -> List[Contract]:
        employee = await EmployeeRepository.get_by_id(db, employee_id)
        if not employee:
            raise EmployeeNotFoundError(f"Employee with id {employee_id} not found")
        return await ContractRepository.get_by_employee_id(db, employee_id)

    @staticmethod
    async def _validate_foreign_keys(
        db: AsyncSession,
        department_id: int | None = None,
        working_schedule_id: int | None = None,
        salary_structure_id: int | None = None,
    ) -> None:
        if department_id is not None:
            dept = await db.get(Department, department_id)
            if not dept:
                raise ContractValidationError(f"Department with id {department_id} does not exist.")

        if working_schedule_id is not None:
            sched = await db.get(WorkingSchedule, working_schedule_id)
            if not sched:
                raise ContractValidationError(f"Working schedule with id {working_schedule_id} does not exist.")

        if salary_structure_id is not None:
            struct = await db.get(SalaryStructure, salary_structure_id)
            if not struct:
                raise ContractValidationError(f"Salary structure with id {salary_structure_id} does not exist.")

    @classmethod
    async def create(cls, db: AsyncSession, data: ContractCreate) -> Contract:
        # 1. Validate employee
        employee = await EmployeeRepository.get_by_id(db, data.employee_id)
        if not employee:
            raise EmployeeNotFoundError(f"Employee with id {data.employee_id} not found")

        # 2. Validate foreign keys
        await cls._validate_foreign_keys(
            db,
            department_id=data.department_id,
            working_schedule_id=data.working_schedule_id,
            salary_structure_id=data.salary_structure_id,
        )

        # 3. Validate dates
        if data.end_date is not None and data.end_date <= data.start_date:
            raise InvalidDateRangeError("End date cannot be on or before start date.")

        # 4. Overlap validation for RUNNING contracts
        status_val = (
            data.status.value
            if isinstance(data.status, ContractStatus)
            else str(data.status).lower()
        )
        if status_val == ContractStatus.RUNNING.value:
            overlap = await ContractRepository.find_overlapping_running_contract(
                db=db,
                employee_id=data.employee_id,
                start_date=data.start_date,
                end_date=data.end_date,
            )
            if overlap:
                raise ContractOverlapError(
                    f"Contract overlaps an existing running contract ({overlap.reference}) for this employee."
                )

        return await ContractRepository.create(db, data)

    @classmethod
    async def update(
        cls, db: AsyncSession, contract_id: int, data: ContractUpdate
    ) -> Contract:
        contract = await ContractRepository.get_by_id(db, contract_id)
        if not contract:
            raise ContractNotFoundError(f"Contract with id {contract_id} not found")

        # 1. Validate foreign keys if provided
        await cls._validate_foreign_keys(
            db,
            department_id=data.department_id,
            working_schedule_id=data.working_schedule_id,
            salary_structure_id=data.salary_structure_id,
        )

        # 2. Determine effective dates and validate
        effective_start = data.start_date if data.start_date is not None else contract.start_date
        raw_update = data.model_dump(exclude_unset=True)
        effective_end = data.end_date if "end_date" in raw_update else contract.end_date

        if effective_end is not None and effective_end <= effective_start:
            raise InvalidDateRangeError("End date cannot be on or before start date.")

        # 4. Overlap validation if effective status is RUNNING
        new_status = (
            data.status.value
            if isinstance(data.status, ContractStatus)
            else (str(data.status).lower() if data.status is not None else contract.status)
        )

        if new_status == ContractStatus.RUNNING.value:
            overlap = await ContractRepository.find_overlapping_running_contract(
                db=db,
                employee_id=contract.employee_id,
                start_date=effective_start,
                end_date=effective_end,
                exclude_contract_id=contract.id,
            )
            if overlap:
                raise ContractOverlapError(
                    f"Contract overlaps an existing running contract ({overlap.reference}) for this employee."
                )

        return await ContractRepository.update(db, contract, data)

    @staticmethod
    async def delete(db: AsyncSession, contract_id: int) -> None:
        contract = await ContractRepository.get_by_id(db, contract_id)
        if not contract:
            raise ContractNotFoundError(f"Contract with id {contract_id} not found")

        # Guard deletion if referenced by payslips/payroll history
        if await ContractRepository.has_associated_payslips(db, contract_id):
            raise ContractInUseError(
                f"Cannot delete contract {contract.reference}: it is referenced by existing payslips or payroll records."
            )

        await ContractRepository.delete(db, contract)
