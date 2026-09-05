from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from typing import List

from app.models.payroll import SalaryStructure, SalaryRule

class PayrollRepository:
    # --- Salary Structure ---
    @staticmethod
    async def get_structures(db: AsyncSession) -> List[SalaryStructure]:
        result = await db.execute(select(SalaryStructure).options(selectinload(SalaryStructure.salary_rules)))
        return list(result.scalars().all())

    @staticmethod
    async def get_structure_by_id(db: AsyncSession, structure_id: int) -> SalaryStructure | None:
        result = await db.execute(
            select(SalaryStructure)
            .options(selectinload(SalaryStructure.salary_rules))
            .where(SalaryStructure.id == structure_id)
            .execution_options(populate_existing=True)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def create_structure(db: AsyncSession, **kwargs) -> SalaryStructure:
        structure = SalaryStructure(**kwargs)
        db.add(structure)
        await db.commit()
        await db.refresh(structure)
        
        # Load rules (empty but consistent return)
        result = await db.execute(
            select(SalaryStructure)
            .options(selectinload(SalaryStructure.salary_rules))
            .where(SalaryStructure.id == structure.id)
        )
        return result.scalar_one()

    @staticmethod
    async def update_structure(db: AsyncSession, structure: SalaryStructure, **kwargs) -> SalaryStructure:
        for key, value in kwargs.items():
            setattr(structure, key, value)
        await db.commit()
        
        result = await db.execute(
            select(SalaryStructure)
            .options(selectinload(SalaryStructure.salary_rules))
            .where(SalaryStructure.id == structure.id)
        )
        return result.scalar_one()

    @staticmethod
    async def delete_structure(db: AsyncSession, structure: SalaryStructure) -> None:
        await db.delete(structure)
        await db.commit()

    # --- Salary Rule ---
    @staticmethod
    async def get_rule_by_id(db: AsyncSession, rule_id: int) -> SalaryRule | None:
        return await db.get(SalaryRule, rule_id)

    @staticmethod
    async def create_rule(db: AsyncSession, **kwargs) -> SalaryRule:
        rule = SalaryRule(**kwargs)
        db.add(rule)
        await db.commit()
        await db.refresh(rule)
        return rule

    @staticmethod
    async def update_rule(db: AsyncSession, rule: SalaryRule, **kwargs) -> SalaryRule:
        for key, value in kwargs.items():
            setattr(rule, key, value)
        await db.commit()
        await db.refresh(rule)
        return rule
        
    @staticmethod
    async def delete_rule(db: AsyncSession, rule: SalaryRule) -> None:
        await db.delete(rule)
        await db.commit()
