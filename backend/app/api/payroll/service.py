from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.api.payroll.repository import PayrollRepository
from app.models.payroll import SalaryStructure, SalaryRule
from app.schemas.payroll import (
    SalaryStructureCreate, SalaryStructureUpdate,
    SalaryRuleCreate, SalaryRuleUpdate
)

VALID_COMPUTATIONS = {"fixed", "percentage", "python"}
VALID_CATEGORIES = {"BASIC", "GROSS", "NET", "ALLOWANCE", "DEDUCTION"}

class PayrollService:
    # --- Salary Structure ---
    @staticmethod
    async def get_structures(db: AsyncSession) -> List[SalaryStructure]:
        return await PayrollRepository.get_structures(db)

    @staticmethod
    async def get_structure_by_id(db: AsyncSession, structure_id: int) -> SalaryStructure | None:
        return await PayrollRepository.get_structure_by_id(db, structure_id)

    @staticmethod
    async def create_structure(db: AsyncSession, data: SalaryStructureCreate) -> SalaryStructure:
        return await PayrollRepository.create_structure(db, **data.model_dump())

    @staticmethod
    async def update_structure(db: AsyncSession, structure_id: int, data: SalaryStructureUpdate) -> SalaryStructure | None:
        structure = await PayrollRepository.get_structure_by_id(db, structure_id)
        if not structure:
            return None
        return await PayrollRepository.update_structure(db, structure, **data.model_dump(exclude_unset=True))
        
    @staticmethod
    async def delete_structure(db: AsyncSession, structure_id: int) -> bool:
        structure = await PayrollRepository.get_structure_by_id(db, structure_id)
        if not structure:
            return False
        # Prevent deletion if it has rules
        if structure.salary_rules:
            raise ValueError("Cannot delete structure with existing rules. Delete rules first.")
        await PayrollRepository.delete_structure(db, structure)
        return True

    # --- Salary Rule ---
    @staticmethod
    def _validate_rule_data(data: dict):
        if "computation" in data and data["computation"] not in VALID_COMPUTATIONS:
            raise ValueError(f"Invalid computation type. Must be one of {VALID_COMPUTATIONS}")
        if "category" in data and data["category"].upper() not in VALID_CATEGORIES:
            raise ValueError(f"Invalid category. Must be one of {VALID_CATEGORIES}")
        if "sequence" in data and data["sequence"] < 0:
            raise ValueError("Sequence must be a positive integer")

    @staticmethod
    async def create_rule(db: AsyncSession, structure_id: int, data: SalaryRuleCreate) -> SalaryRule:
        structure = await PayrollRepository.get_structure_by_id(db, structure_id)
        if not structure:
            raise ValueError("Salary structure does not exist")
            
        dump = data.model_dump()
        PayrollService._validate_rule_data(dump)
        dump["salary_structure_id"] = structure_id
        
        return await PayrollRepository.create_rule(db, **dump)

    @staticmethod
    async def update_rule(db: AsyncSession, rule_id: int, data: SalaryRuleUpdate) -> SalaryRule | None:
        rule = await PayrollRepository.get_rule_by_id(db, rule_id)
        if not rule:
            return None
            
        dump = data.model_dump(exclude_unset=True)
        PayrollService._validate_rule_data(dump)
            
        return await PayrollRepository.update_rule(db, rule, **dump)
        
    @staticmethod
    async def delete_rule(db: AsyncSession, rule_id: int) -> bool:
        rule = await PayrollRepository.get_rule_by_id(db, rule_id)
        if not rule:
            return False
        await PayrollRepository.delete_rule(db, rule)
        return True
