from sqlalchemy import String, Float, Integer, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

class WorkingSchedule(Base):
    __tablename__ = "working_schedules"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    company: Mapped[str] = mapped_column(String(255), nullable=False, default="My Company")
    days_per_week: Mapped[int] = mapped_column(Integer, nullable=False, default=5)
    hours_per_week: Mapped[float] = mapped_column(Float, nullable=False, default=40.0)
    timezone: Mapped[str] = mapped_column(String(100), nullable=False, default="Company timezone")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    schedule_lines: Mapped[list["ScheduleLine"]] = relationship("ScheduleLine", back_populates="schedule", cascade="all, delete-orphan")


class ScheduleLine(Base):
    __tablename__ = "schedule_lines"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    schedule_id: Mapped[int] = mapped_column(ForeignKey("working_schedules.id"), nullable=False, index=True)
    day_of_week: Mapped[str] = mapped_column(String(10), nullable=False)  # "Monday", "Tuesday", etc.
    start_time: Mapped[str] = mapped_column(String(10), nullable=False)   # "09:00"
    end_time: Mapped[str] = mapped_column(String(10), nullable=False)     # "18:00"
    break_hours: Mapped[float] = mapped_column(Float, nullable=False, default=1.0)
    work_hours: Mapped[float] = mapped_column(Float, nullable=False, default=8.0)

    schedule: Mapped["WorkingSchedule"] = relationship("WorkingSchedule", back_populates="schedule_lines")
