from datetime import date
from sqlalchemy import String, ForeignKey, Integer, Float, Text, Date, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

class TimeOffType(Base):
    __tablename__ = "time_off_types"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    unit: Mapped[str] = mapped_column(String(20), nullable=False, default="days")  # "days" or "hours"
    requires_allocation: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    approval: Mapped[str] = mapped_column(String(20), nullable=False, default="manager")  # "manager" or "officer"
    display_color: Mapped[str | None] = mapped_column(String(30), nullable=True, default="blue")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

class TimeOffAllocation(Base):
    __tablename__ = "time_off_allocations"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id"), nullable=False, index=True)
    time_off_type_id: Mapped[int] = mapped_column(ForeignKey("time_off_types.id"), nullable=False, index=True)
    allocated_days: Mapped[float] = mapped_column(Float, nullable=False)
    taken_days: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    approver_id: Mapped[int | None] = mapped_column(ForeignKey("employees.id"), nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="to_approve")  # to_approve, approved, refused
    validity_label: Mapped[str | None] = mapped_column(String(100), nullable=True)  # e.g. "2026 Annual Balance"
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    employee: Mapped["Employee"] = relationship("Employee", back_populates="time_off_allocations", foreign_keys=[employee_id])
    time_off_type: Mapped["TimeOffType"] = relationship("TimeOffType")

class TimeOffRequest(Base):
    __tablename__ = "time_off_requests"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id"), nullable=False, index=True)
    time_off_type_id: Mapped[int] = mapped_column(ForeignKey("time_off_types.id"), nullable=False, index=True)
    allocation_id: Mapped[int | None] = mapped_column(ForeignKey("time_off_allocations.id"), nullable=True)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    duration_days: Mapped[float] = mapped_column(Float, nullable=False)
    approver_id: Mapped[int | None] = mapped_column(ForeignKey("employees.id"), nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="to_approve")  # to_approve, approved, refused
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    employee: Mapped["Employee"] = relationship("Employee", back_populates="time_off_requests", foreign_keys=[employee_id])
    time_off_type: Mapped["TimeOffType"] = relationship("TimeOffType")
    allocation: Mapped["TimeOffAllocation | None"] = relationship("TimeOffAllocation")
