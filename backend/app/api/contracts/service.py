from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Tuple

from app.api.contracts.repository import ContractRepository
from app.api.employees.repository import EmployeeRepository
from app.core.exceptions import AppError
from app.models.contract import Contract
from app.schemas.contract import ContractCreate, ContractUpdate


class ContractNotFoundError(AppError):
    """Raised when a contract is not found."""


class EmployeeNotFoundError(AppError):
    """Raised when the specified employee does not exist."""


class InvalidDateRangeError(AppError):
    """Raised when contract end_date is earlier than start_date."""


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
    async def create(db: AsyncSession, data: ContractCreate) -> Contract:
        employee = await EmployeeRepository.get_by_id(db, data.employee_id)
        if not employee:
            raise EmployeeNotFoundError(f"Employee with id {data.employee_id} not found")

        if data.end_date and data.end_date < data.start_date:
            raise InvalidDateRangeError("Contract end_date cannot be earlier than start_date")

        return await ContractRepository.create(db, data)

    @staticmethod
    async def update(
        db: AsyncSession, contract_id: int, data: ContractUpdate
    ) -> Contract:
        contract = await ContractRepository.get_by_id(db, contract_id)
        if not contract:
            raise ContractNotFoundError(f"Contract with id {contract_id} not found")

        start_date = data.start_date or contract.start_date
        end_date = data.end_date if data.end_date is not None else contract.end_date

        if end_date and end_date < start_date:
            raise InvalidDateRangeError("Contract end_date cannot be earlier than start_date")

        return await ContractRepository.update(db, contract, data)

    @staticmethod
    async def delete(db: AsyncSession, contract_id: int) -> None:
        contract = await ContractRepository.get_by_id(db, contract_id)
        if not contract:
            raise ContractNotFoundError(f"Contract with id {contract_id} not found")

        await ContractRepository.delete(db, contract)
