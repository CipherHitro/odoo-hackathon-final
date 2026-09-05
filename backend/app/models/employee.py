from sqlalchemy import String, ForeignKey, Date
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
from datetime import date
import enum

class EmployeeStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    ARCHIVED = "archived"

class Employee(Base):
    __tablename__ = "employees"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    job_position: Mapped[str | None] = mapped_column(String(255), nullable=True)
    department_id: Mapped[int | None] = mapped_column(ForeignKey("departments.id"), nullable=True, index=True)
    manager_id: Mapped[int | None] = mapped_column(ForeignKey("employees.id"), nullable=True)
    work_location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    work_email: Mapped[str | None] = mapped_column(String(255), nullable=True, unique=True, index=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    company: Mapped[str] = mapped_column(String(255), nullable=False, default="My Company")
    working_schedule_id: Mapped[int | None] = mapped_column(ForeignKey("working_schedules.id"), nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default=EmployeeStatus.ACTIVE)
    # user account link (optional — not every employee has a login)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True, unique=True, index=True)
    
    # Private info
    date_of_birth: Mapped[date | None] = mapped_column(Date, nullable=True)
    private_address: Mapped[str | None] = mapped_column(String(512), nullable=True)

    department: Mapped["Department"] = relationship("Department", back_populates="employees", foreign_keys=[department_id])
    manager: Mapped["Employee | None"] = relationship("Employee", remote_side=[id], foreign_keys=[manager_id])
    working_schedule: Mapped["WorkingSchedule | None"] = relationship("WorkingSchedule")
    user: Mapped["User | None"] = relationship("User")
    
    contracts: Mapped[list["Contract"]] = relationship("Contract", back_populates="employee")
    attendance_records: Mapped[list["AttendanceRecord"]] = relationship("AttendanceRecord", back_populates="employee")
    time_off_requests: Mapped[list["TimeOffRequest"]] = relationship("TimeOffRequest", back_populates="employee", foreign_keys="TimeOffRequest.employee_id")
    time_off_allocations: Mapped[list["TimeOffAllocation"]] = relationship("TimeOffAllocation", back_populates="employee", foreign_keys="TimeOffAllocation.employee_id")
