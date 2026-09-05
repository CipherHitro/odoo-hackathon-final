from sqlalchemy import String, ForeignKey, Integer, Float, Text, Boolean, Numeric, Date, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from datetime import datetime, date
from decimal import Decimal
import enum

class SalaryStructure(Base):
    __tablename__ = "salary_structures"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    salary_rules: Mapped[list["SalaryRule"]] = relationship("SalaryRule", back_populates="salary_structure", order_by="SalaryRule.sequence")

class SalaryRule(Base):
    __tablename__ = "salary_rules"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    salary_structure_id: Mapped[int] = mapped_column(ForeignKey("salary_structures.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    code: Mapped[str] = mapped_column(String(50), nullable=False)  # e.g. BASIC, HRA, PF
    category: Mapped[str] = mapped_column(String(50), nullable=False)  # basic, allowance, deduction, gross, net
    sequence: Mapped[int] = mapped_column(Integer, nullable=False, default=10)
    computation: Mapped[str] = mapped_column(String(20), nullable=False, default="fixed")  # fixed, percentage, python
    fixed_amount: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    percentage: Mapped[float | None] = mapped_column(Float, nullable=True)
    percentage_base: Mapped[str | None] = mapped_column(String(50), nullable=True)  # e.g. "BASIC", "GROSS"
    python_code: Mapped[str | None] = mapped_column(Text, nullable=True)

    salary_structure: Mapped["SalaryStructure"] = relationship("SalaryStructure", back_populates="salary_rules")

class PayrunStatus(str, enum.Enum):
    DRAFT = "draft"
    COMPUTED = "computed"
    VALIDATED = "validated"
    PAID = "paid"

class Payrun(Base):
    __tablename__ = "payruns"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)  # e.g. "February 2026"
    salary_structure_id: Mapped[int] = mapped_column(ForeignKey("salary_structures.id"), nullable=False)
    date_from: Mapped[date] = mapped_column(nullable=False)
    date_to: Mapped[date] = mapped_column(nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default=PayrunStatus.DRAFT)

    salary_structure: Mapped["SalaryStructure"] = relationship("SalaryStructure")
    payslips: Mapped[list["Payslip"]] = relationship("Payslip", back_populates="payrun")

class PayslipStatus(str, enum.Enum):
    DRAFT = "draft"
    DONE = "done"

class Payslip(Base):
    __tablename__ = "payslips"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    payrun_id: Mapped[int] = mapped_column(ForeignKey("payruns.id"), nullable=False, index=True)
    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id"), nullable=False, index=True)
    salary_structure_id: Mapped[int] = mapped_column(ForeignKey("salary_structures.id"), nullable=False)
    contract_id: Mapped[int | None] = mapped_column(ForeignKey("contracts.id"), nullable=True)
    date_from: Mapped[date] = mapped_column(nullable=False)
    date_to: Mapped[date] = mapped_column(nullable=False)
    worked_days: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    basic_wage: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=Decimal("0"))
    gross_wage: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=Decimal("0"))
    net_wage: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=Decimal("0"))
    status: Mapped[str] = mapped_column(String(20), nullable=False, default=PayslipStatus.DRAFT)
    has_warning: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    warning_message: Mapped[str | None] = mapped_column(String(500), nullable=True)

    payrun: Mapped["Payrun"] = relationship("Payrun", back_populates="payslips")
    employee: Mapped["Employee"] = relationship("Employee")
    contract: Mapped["Contract | None"] = relationship("Contract")
    lines: Mapped[list["PayslipLine"]] = relationship("PayslipLine", back_populates="payslip", order_by="PayslipLine.sequence")

class PayslipLine(Base):
    __tablename__ = "payslip_lines"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    payslip_id: Mapped[int] = mapped_column(ForeignKey("payslips.id"), nullable=False, index=True)
    rule_name: Mapped[str] = mapped_column(String(255), nullable=False)
    code: Mapped[str] = mapped_column(String(50), nullable=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    sequence: Mapped[int] = mapped_column(Integer, nullable=False, default=10)

    payslip: Mapped["Payslip"] = relationship("Payslip", back_populates="lines")
