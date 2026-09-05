from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.api.payroll.service import PayrollService
from app.schemas.payroll import (
    SalaryStructureCreate, SalaryStructureUpdate, SalaryStructureResponse,
    SalaryRuleCreate, SalaryRuleUpdate, SalaryRuleResponse
)
from app.schemas.dashboard import DashboardResponse

class PayrollController:
    # --- Dashboard ---
    @staticmethod
    async def get_dashboard_metrics(db: AsyncSession) -> DashboardResponse:
        metrics = await PayrollService.get_dashboard_metrics(db)
        return DashboardResponse(**metrics)

    # --- Salary Structure ---
    @staticmethod
    async def get_structures(db: AsyncSession) -> List[SalaryStructureResponse]:
        structures = await PayrollService.get_structures(db)
        return [SalaryStructureResponse.model_validate(s) for s in structures]

    @staticmethod
    async def get_structure_by_id(db: AsyncSession, structure_id: int) -> SalaryStructureResponse:
        structure = await PayrollService.get_structure_by_id(db, structure_id)
        if not structure:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Salary Structure not found")
        return SalaryStructureResponse.model_validate(structure)

    @staticmethod
    async def create_structure(db: AsyncSession, data: SalaryStructureCreate) -> SalaryStructureResponse:
        structure = await PayrollService.create_structure(db, data)
        return SalaryStructureResponse.model_validate(structure)

    @staticmethod
    async def update_structure(db: AsyncSession, structure_id: int, data: SalaryStructureUpdate) -> SalaryStructureResponse:
        structure = await PayrollService.update_structure(db, structure_id, data)
        if not structure:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Salary Structure not found")
        return SalaryStructureResponse.model_validate(structure)

    @staticmethod
    async def delete_structure(db: AsyncSession, structure_id: int) -> dict:
        try:
            success = await PayrollService.delete_structure(db, structure_id)
            if not success:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Salary Structure not found")
            return {"message": "Salary structure deleted successfully"}
        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    # --- Salary Rule ---
    @staticmethod
    async def create_rule(db: AsyncSession, structure_id: int, data: SalaryRuleCreate) -> SalaryRuleResponse:
        try:
            rule = await PayrollService.create_rule(db, structure_id, data)
            return SalaryRuleResponse.model_validate(rule)
        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    @staticmethod
    async def update_rule(db: AsyncSession, rule_id: int, data: SalaryRuleUpdate) -> SalaryRuleResponse:
        try:
            rule = await PayrollService.update_rule(db, rule_id, data)
            if not rule:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Salary Rule not found")
            return SalaryRuleResponse.model_validate(rule)
        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    @staticmethod
    async def delete_rule(db: AsyncSession, rule_id: int) -> dict:
        success = await PayrollService.delete_rule(db, rule_id)
        if not success:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Salary Rule not found")
        return {"message": "Salary rule deleted successfully"}
