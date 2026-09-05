from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.api.contracts.service import ContractService
from app.core.exceptions import (
    ContractNotFoundError,
    EmployeeNotFoundError,
    InvalidDateRangeError,
    ContractOverlapError,
    ContractValidationError,
    ContractInUseError,
    AppError,
)
from app.models.contract import Contract
from app.schemas.contract import (
    ContractCreate,
    ContractListResponse,
    ContractResponse,
    ContractUpdate,
)


class ContractController:

    @staticmethod
    def _to_response(contract: Contract) -> ContractResponse:
        return ContractResponse(
            id=contract.id,
            reference=contract.reference,
            employee_id=contract.employee_id,
            employee_name=contract.employee.name if contract.employee else None,
            department_id=contract.department_id,
            department_name=contract.department.name if contract.department else None,
            job_position=contract.job_position,
            start_date=contract.start_date,
            end_date=contract.end_date,
            wage_monthly=contract.wage_monthly,
            working_schedule_id=contract.working_schedule_id,
            working_schedule_name=contract.working_schedule.name if contract.working_schedule else None,
            salary_structure_id=contract.salary_structure_id,
            salary_structure_name=contract.salary_structure.name if contract.salary_structure else None,
            status=contract.status,
            notes=contract.notes,
        )

    @classmethod
    async def get_all(
        cls,
        db: AsyncSession,
        skip: int = 0,
        limit: int = 50,
        search: str | None = None,
        employee_id: int | None = None,
        status_filter: str | None = None,
    ) -> ContractListResponse:
        contracts, total = await ContractService.get_all(
            db=db,
            skip=skip,
            limit=limit,
            search=search,
            employee_id=employee_id,
            status=status_filter,
        )
        items = [cls._to_response(c) for c in contracts]
        return ContractListResponse(items=items, total=total)

    @classmethod
    async def get_by_id(cls, db: AsyncSession, contract_id: int) -> ContractResponse:
        try:
            contract = await ContractService.get_by_id(db, contract_id)
            return cls._to_response(contract)
        except ContractNotFoundError as exc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(exc),
            ) from exc

    @classmethod
    async def get_by_employee_id(
        cls, db: AsyncSession, employee_id: int
    ) -> ContractListResponse:
        try:
            contracts = await ContractService.get_by_employee_id(db, employee_id)
            items = [cls._to_response(c) for c in contracts]
            return ContractListResponse(items=items, total=len(items))
        except EmployeeNotFoundError as exc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(exc),
            ) from exc

    @classmethod
    async def create(
        cls, db: AsyncSession, data: ContractCreate
    ) -> ContractResponse:
        try:
            contract = await ContractService.create(db, data)
            return cls._to_response(contract)
        except EmployeeNotFoundError as exc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(exc),
            ) from exc
        except (InvalidDateRangeError, ContractOverlapError, ContractValidationError, AppError) as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(exc),
            ) from exc

    @classmethod
    async def update(
        cls, db: AsyncSession, contract_id: int, data: ContractUpdate
    ) -> ContractResponse:
        try:
            contract = await ContractService.update(db, contract_id, data)
            return cls._to_response(contract)
        except ContractNotFoundError as exc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(exc),
            ) from exc
        except (InvalidDateRangeError, ContractOverlapError, ContractValidationError, AppError) as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(exc),
            ) from exc

    @classmethod
    async def delete(cls, db: AsyncSession, contract_id: int) -> None:
        try:
            await ContractService.delete(db, contract_id)
        except ContractNotFoundError as exc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(exc),
            ) from exc
        except (ContractInUseError, ContractValidationError, AppError) as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(exc),
            ) from exc
