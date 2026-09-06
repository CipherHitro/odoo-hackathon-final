import enum
from datetime import date
from sqlalchemy import String, ForeignKey, Date, Text, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

class ContractStatus(str, enum.Enum):
    DRAFT = "draft"
    RUNNING = "running"
    EXPIRED = "expired"
    CANCELLED = "cancelled"

class Contract(Base):
    __tablename__ = "contracts"
    __table_args__ = (
        CheckConstraint("end_date IS NULL OR end_date > start_date", name="check_contract_dates"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    reference: Mapped[str] = mapped_column(String(50), nullable=False, unique=True, index=True)  # e.g. CON/2026/0042
    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id"), nullable=False, index=True)
    department_id: Mapped[int | None] = mapped_column(ForeignKey("departments.id"), nullable=True)
    job_position: Mapped[str | None] = mapped_column(String(255), nullable=True)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    working_schedule_id: Mapped[int | None] = mapped_column(ForeignKey("working_schedules.id"), nullable=True)
    salary_structure_id: Mapped[int | None] = mapped_column(ForeignKey("salary_structures.id", use_alter=True, name="fk_contract_salary_structure"), nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default=ContractStatus.DRAFT)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    employee: Mapped["Employee"] = relationship("Employee", back_populates="contracts")
    department: Mapped["Department | None"] = relationship("Department")
    working_schedule: Mapped["WorkingSchedule | None"] = relationship("WorkingSchedule")
    salary_structure: Mapped["SalaryStructure | None"] = relationship("SalaryStructure")
