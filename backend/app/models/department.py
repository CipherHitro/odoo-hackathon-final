from sqlalchemy import String, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

class Department(Base):
    __tablename__ = "departments"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    manager_id: Mapped[int | None] = mapped_column(ForeignKey("employees.id", use_alter=True, name="fk_dept_manager"), nullable=True)

    employees: Mapped[list["Employee"]] = relationship("Employee", back_populates="department", foreign_keys="Employee.department_id")
