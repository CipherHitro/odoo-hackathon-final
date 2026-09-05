"""
Database Seeding Script for PeoplePay ERP
Populates the database with rich, realistic enterprise demo data across all modules:
- Users (Admin, HR Manager, Payroll Admins, Employees)
- Working Schedules & Schedule Lines
- Departments & Managers
- Employees with reporting hierarchies
- Salary Structures & Calculation Rules (Odoo-like)
- Contracts with official references (CON/2026/0001...)
- Attendance Records (historical + live active check-in for today)
- Time Off Types, Allocations, and Requests
- Payruns, Payslips, and Line Calculations

Usage:
    uv run python seed.py          # Seeds data (clears old data first for a pristine state)
    uv run python seed.py --no-clean # Adds records without clearing existing tables
"""

import asyncio
import sys
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal
from app.core.security import hash_password
from app.models.user import User, UserRole
from app.models.department import Department
from app.models.working_schedule import WorkingSchedule, ScheduleLine
from app.models.employee import Employee, EmployeeStatus
from app.models.contract import Contract, ContractStatus
from app.models.attendance import AttendanceRecord
from app.models.time_off import TimeOffType, TimeOffAllocation, TimeOffRequest
from app.models.payroll import (
    SalaryStructure,
    SalaryRule,
    Payrun,
    PayrunStatus,
    Payslip,
    PayslipStatus,
    PayslipLine,
)

DEFAULT_PASSWORD = "Password123!"

async def clean_database(db: AsyncSession):
    """Clean all tables in reverse foreign-key order using TRUNCATE CASCADE."""
    print("🧹 Cleaning existing database tables...")
    tables = [
        "payslip_lines",
        "payslips",
        "payruns",
        "salary_rules",
        "contracts",
        "salary_structures",
        "attendance_records",
        "time_off_requests",
        "time_off_allocations",
        "time_off_types",
        "employees",
        "departments",
        "schedule_lines",
        "working_schedules",
        "users",
    ]
    for table in tables:
        await db.execute(text(f"TRUNCATE TABLE {table} CASCADE;"))
    await db.commit()
    print("✨ Database tables truncated cleanly.")

async def seed_data():
    clean = True
    if "--no-clean" in sys.argv:
        clean = False

    async with AsyncSessionLocal() as db:
        if clean:
            await clean_database(db)

        hashed_pwd = hash_password(DEFAULT_PASSWORD)
        print("🌱 Seeding PeoplePay ERP database with enterprise demo data...\n")

        # ---------------------------------------------------------------------
        # 1. Users
        # ---------------------------------------------------------------------
        print("👤 1/9 Creating Users...")
        users_data = [
            {"email": "admin@oxp.com", "name": "System Admin", "role": UserRole.ADMIN.value},
            {"email": "hr@oxp.com", "name": "Sara Khan", "role": UserRole.HR_MANAGER.value},
            {"email": "payroll@oxp.com", "name": "Rahul Verma", "role": UserRole.HR_PAYROLL_ADMIN.value},
            {"email": "payroll.user@oxp.com", "name": "Pooja Joshi", "role": UserRole.HR_PAYROLL_USER.value},
            {"email": "aarav@oxp.com", "name": "Aarav Mehta", "role": UserRole.EMPLOYEE.value},
            {"email": "john@oxp.com", "name": "John Dsouza", "role": UserRole.EMPLOYEE.value},
            {"email": "neha@oxp.com", "name": "Neha Patel", "role": UserRole.EMPLOYEE.value},
            {"email": "priya@oxp.com", "name": "Priya Sharma", "role": UserRole.EMPLOYEE.value},
            {"email": "vikram@oxp.com", "name": "Vikram Malhotra", "role": UserRole.EMPLOYEE.value},
        ]
        users = {}
        for u in users_data:
            user = User(
                email=u["email"],
                name=u["name"],
                password_hash=hashed_pwd,
                role=u["role"],
                is_active=True,
            )
            db.add(user)
            users[u["email"]] = user
        await db.flush()

        # ---------------------------------------------------------------------
        # 2. Working Schedules & Schedule Lines
        # ---------------------------------------------------------------------
        print("⏱️  2/9 Creating Working Schedules...")
        std_schedule = WorkingSchedule(
            name="Standard 40 Hours/Week",
            company="OXP Pvt Ltd",
            days_per_week=5,
            hours_per_week=40.0,
            timezone="Asia/Kolkata",
            is_active=True,
        )
        part_schedule = WorkingSchedule(
            name="Part-Time 20 Hours/Week",
            company="OXP Pvt Ltd",
            days_per_week=5,
            hours_per_week=20.0,
            timezone="Asia/Kolkata",
            is_active=True,
        )
        db.add_all([std_schedule, part_schedule])
        await db.flush()

        days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
        for day in days:
            db.add(
                ScheduleLine(
                    schedule_id=std_schedule.id,
                    day_of_week=day,
                    start_time="09:00",
                    end_time="18:00",
                    break_hours=1.0,
                    work_hours=8.0,
                )
            )
            db.add(
                ScheduleLine(
                    schedule_id=part_schedule.id,
                    day_of_week=day,
                    start_time="09:00",
                    end_time="13:00",
                    break_hours=0.0,
                    work_hours=4.0,
                )
            )
        await db.flush()

        # ---------------------------------------------------------------------
        # 3. Departments
        # ---------------------------------------------------------------------
        print("🏢 3/9 Creating Departments...")
        dept_names = ["Human Resources", "Engineering", "Finance", "Sales & Marketing", "Operations"]
        depts = {}
        for name in dept_names:
            dept = Department(name=name)
            db.add(dept)
            depts[name] = dept
        await db.flush()

        # ---------------------------------------------------------------------
        # 4. Employees
        # ---------------------------------------------------------------------
        print("👥 4/9 Creating Employees...")
        # Sara Khan (HR Manager) first so others can report to her
        sara = Employee(
            name="Sara Khan",
            job_position="Head of HR",
            department_id=depts["Human Resources"].id,
            work_email="hr@oxp.com",
            phone="+91 98765 11001",
            work_location="Mumbai",
            company="OXP Pvt Ltd",
            working_schedule_id=std_schedule.id,
            status=EmployeeStatus.ACTIVE.value,
            user_id=users["hr@oxp.com"].id,
            date_of_birth=date(1989, 4, 12),
            private_address="402 Sea View Apts, Bandra West, Mumbai",
        )
        db.add(sara)
        await db.flush()

        # Update HR dept manager
        depts["Human Resources"].manager_id = sara.id

        # Aarav Mehta (matching design mockup)
        aarav = Employee(
            name="Aarav Mehta",
            job_position="Payroll Specialist",
            department_id=depts["Finance"].id,
            manager_id=sara.id,
            work_email="aarav@oxp.com",
            phone="+91 98765 43210",
            work_location="Mumbai",
            company="OXP Pvt Ltd",
            working_schedule_id=std_schedule.id,
            status=EmployeeStatus.ACTIVE.value,
            user_id=users["aarav@oxp.com"].id,
            date_of_birth=date(1994, 8, 22),
            private_address="Flat 101, Palm Heights, Andheri East, Mumbai",
        )

        # John Dsouza (matching design mockup)
        john = Employee(
            name="John Dsouza",
            job_position="Lead Developer",
            department_id=depts["Engineering"].id,
            manager_id=sara.id,
            work_email="john@oxp.com",
            phone="+91 98765 22002",
            work_location="Bengaluru",
            company="OXP Pvt Ltd",
            working_schedule_id=std_schedule.id,
            status=EmployeeStatus.ACTIVE.value,
            user_id=users["john@oxp.com"].id,
            date_of_birth=date(1992, 11, 5),
            private_address="304 Lakefront Towers, Indiranagar, Bengaluru",
        )

        # Neha Patel (matching design mockup)
        neha = Employee(
            name="Neha Patel",
            job_position="Technical Recruiter",
            department_id=depts["Human Resources"].id,
            manager_id=sara.id,
            work_email="neha@oxp.com",
            phone="+91 98765 33003",
            work_location="Mumbai",
            company="OXP Pvt Ltd",
            working_schedule_id=std_schedule.id,
            status=EmployeeStatus.ACTIVE.value,
            user_id=users["neha@oxp.com"].id,
            date_of_birth=date(1996, 2, 18),
            private_address="B-12 Hill View Society, Powai, Mumbai",
        )

        # Priya Sharma
        priya = Employee(
            name="Priya Sharma",
            job_position="Financial Analyst",
            department_id=depts["Finance"].id,
            manager_id=sara.id,
            work_email="priya@oxp.com",
            phone="+91 98765 55005",
            work_location="Delhi",
            company="OXP Pvt Ltd",
            working_schedule_id=std_schedule.id,
            status=EmployeeStatus.ACTIVE.value,
            user_id=users["priya@oxp.com"].id,
            date_of_birth=date(1995, 6, 30),
            private_address="21 Greater Kailash 1, New Delhi",
        )

        # Vikram Malhotra
        vikram = Employee(
            name="Vikram Malhotra",
            job_position="DevOps Specialist",
            department_id=depts["Engineering"].id,
            manager_id=john.id,
            work_email="vikram@oxp.com",
            phone="+91 98765 77007",
            work_location="Bengaluru",
            company="OXP Pvt Ltd",
            working_schedule_id=std_schedule.id,
            status=EmployeeStatus.ACTIVE.value,
            user_id=users["vikram@oxp.com"].id,
            date_of_birth=date(1993, 9, 14),
            private_address="12 Koramangala 4th Block, Bengaluru",
        )

        # Rahul Verma
        rahul = Employee(
            name="Rahul Verma",
            job_position="Payroll Controller",
            department_id=depts["Finance"].id,
            manager_id=sara.id,
            work_email="payroll@oxp.com",
            phone="+91 98765 66006",
            work_location="Mumbai",
            company="OXP Pvt Ltd",
            working_schedule_id=std_schedule.id,
            status=EmployeeStatus.ACTIVE.value,
            user_id=users["payroll@oxp.com"].id,
            date_of_birth=date(1990, 1, 15),
            private_address="501 Skyline Apts, Malad West, Mumbai",
        )

        employees_list = [aarav, john, neha, priya, vikram, rahul]
        db.add_all(employees_list)
        await db.flush()

        # Update department managers
        depts["Engineering"].manager_id = john.id
        depts["Finance"].manager_id = aarav.id

        # ---------------------------------------------------------------------
        # 5. Salary Structures & Rules
        # ---------------------------------------------------------------------
        print("💰 5/9 Creating Salary Structures & Rules...")
        std_salary_struct = SalaryStructure(
            name="Standard Indian Tech Structure",
            is_active=True,
            notes="Standard structure including Basic, HRA, Special Allowance, PF, and Professional Tax",
        )
        exec_salary_struct = SalaryStructure(
            name="Executive Leadership Structure",
            is_active=True,
            notes="Executive structure with leadership allowances and performance incentives",
        )
        db.add_all([std_salary_struct, exec_salary_struct])
        await db.flush()

        rules_data = [
            {"salary_structure_id": std_salary_struct.id, "name": "Basic Salary", "code": "BASIC", "category": "BASIC", "sequence": 10, "computation": "fixed", "fixed_amount": Decimal("50000.00")},
            {"salary_structure_id": std_salary_struct.id, "name": "House Rent Allowance", "code": "HRA", "category": "ALLOWANCE", "sequence": 20, "computation": "percentage", "percentage": 40.0, "percentage_base": "BASIC"},
            {"salary_structure_id": std_salary_struct.id, "name": "Special Allowance", "code": "SPECIAL", "category": "ALLOWANCE", "sequence": 30, "computation": "fixed", "fixed_amount": Decimal("15000.00")},
            {"salary_structure_id": std_salary_struct.id, "name": "Gross Wage", "code": "GROSS", "category": "GROSS", "sequence": 40, "computation": "python", "python_code": "BASIC + HRA + SPECIAL"},
            {"salary_structure_id": std_salary_struct.id, "name": "Provident Fund", "code": "PF", "category": "DEDUCTION", "sequence": 50, "computation": "percentage", "percentage": 12.0, "percentage_base": "BASIC"},
            {"salary_structure_id": std_salary_struct.id, "name": "Professional Tax", "code": "PT", "category": "DEDUCTION", "sequence": 60, "computation": "fixed", "fixed_amount": Decimal("200.00")},
            {"salary_structure_id": std_salary_struct.id, "name": "Net Salary", "code": "NET", "category": "NET", "sequence": 70, "computation": "python", "python_code": "GROSS - PF - PT"},

            # Executive
            {"salary_structure_id": exec_salary_struct.id, "name": "Basic Salary", "code": "BASIC", "category": "BASIC", "sequence": 10, "computation": "fixed", "fixed_amount": Decimal("80000.00")},
            {"salary_structure_id": exec_salary_struct.id, "name": "House Rent Allowance", "code": "HRA", "category": "ALLOWANCE", "sequence": 20, "computation": "percentage", "percentage": 50.0, "percentage_base": "BASIC"},
            {"salary_structure_id": exec_salary_struct.id, "name": "Executive Allowance", "code": "EXEC", "category": "ALLOWANCE", "sequence": 30, "computation": "fixed", "fixed_amount": Decimal("30000.00")},
            {"salary_structure_id": exec_salary_struct.id, "name": "Gross Wage", "code": "GROSS", "category": "GROSS", "sequence": 40, "computation": "python", "python_code": "BASIC + HRA + EXEC"},
            {"salary_structure_id": exec_salary_struct.id, "name": "Provident Fund", "code": "PF", "category": "DEDUCTION", "sequence": 50, "computation": "percentage", "percentage": 12.0, "percentage_base": "BASIC"},
            {"salary_structure_id": exec_salary_struct.id, "name": "Professional Tax", "code": "PT", "category": "DEDUCTION", "sequence": 60, "computation": "fixed", "fixed_amount": Decimal("200.00")},
            {"salary_structure_id": exec_salary_struct.id, "name": "Net Salary", "code": "NET", "category": "NET", "sequence": 70, "computation": "python", "python_code": "GROSS - PF - PT"},
        ]
        for r in rules_data:
            db.add(SalaryRule(**r))
        await db.flush()

        # ---------------------------------------------------------------------
        # 6. Contracts
        # ---------------------------------------------------------------------
        print("📄 6/9 Creating Contracts with Official References...")
        contracts_data = [
            {
                "reference": "CON/2026/0001",
                "employee_id": aarav.id,
                "department_id": depts["Finance"].id,
                "job_position": "Payroll Specialist",
                "start_date": date(2025, 1, 1),
                "end_date": None,
                "wage_monthly": Decimal("85000.00"),
                "working_schedule_id": std_schedule.id,
                "salary_structure_id": std_salary_struct.id,
                "status": ContractStatus.RUNNING.value,
                "notes": "Permanent Full-time employment contract",
            },
            {
                "reference": "CON/2026/0002",
                "employee_id": sara.id,
                "department_id": depts["Human Resources"].id,
                "job_position": "Head of HR",
                "start_date": date(2024, 6, 1),
                "end_date": None,
                "wage_monthly": Decimal("135000.00"),
                "working_schedule_id": std_schedule.id,
                "salary_structure_id": exec_salary_struct.id,
                "status": ContractStatus.RUNNING.value,
                "notes": "Executive leadership contract",
            },
            {
                "reference": "CON/2026/0003",
                "employee_id": john.id,
                "department_id": depts["Engineering"].id,
                "job_position": "Lead Developer",
                "start_date": date(2024, 8, 1),
                "end_date": None,
                "wage_monthly": Decimal("125000.00"),
                "working_schedule_id": std_schedule.id,
                "salary_structure_id": exec_salary_struct.id,
                "status": ContractStatus.RUNNING.value,
                "notes": "Senior engineering contract",
            },
            {
                "reference": "CON/2026/0004",
                "employee_id": neha.id,
                "department_id": depts["Human Resources"].id,
                "job_position": "Technical Recruiter",
                "start_date": date(2025, 2, 1),
                "end_date": None,
                "wage_monthly": Decimal("65000.00"),
                "working_schedule_id": std_schedule.id,
                "salary_structure_id": std_salary_struct.id,
                "status": ContractStatus.RUNNING.value,
                "notes": "Standard recruitment specialist contract",
            },
            {
                "reference": "CON/2026/0005",
                "employee_id": priya.id,
                "department_id": depts["Finance"].id,
                "job_position": "Financial Analyst",
                "start_date": date(2025, 3, 1),
                "end_date": None,
                "wage_monthly": Decimal("70000.00"),
                "working_schedule_id": std_schedule.id,
                "salary_structure_id": std_salary_struct.id,
                "status": ContractStatus.RUNNING.value,
                "notes": "Finance division contract",
            },
            {
                "reference": "CON/2026/0006",
                "employee_id": vikram.id,
                "department_id": depts["Engineering"].id,
                "job_position": "DevOps Specialist",
                "start_date": date(2025, 4, 1),
                "end_date": None,
                "wage_monthly": Decimal("95000.00"),
                "working_schedule_id": std_schedule.id,
                "salary_structure_id": std_salary_struct.id,
                "status": ContractStatus.RUNNING.value,
                "notes": "Cloud & Infrastructure lead contract",
            },
            {
                "reference": "CON/2026/0007",
                "employee_id": rahul.id,
                "department_id": depts["Finance"].id,
                "job_position": "Payroll Controller",
                "start_date": date(2025, 1, 15),
                "end_date": None,
                "wage_monthly": Decimal("90000.00"),
                "working_schedule_id": std_schedule.id,
                "salary_structure_id": std_salary_struct.id,
                "status": ContractStatus.RUNNING.value,
                "notes": "Payroll operations manager contract",
            },
        ]
        created_contracts = {}
        for c in contracts_data:
            contract = Contract(**c)
            db.add(contract)
            created_contracts[c["employee_id"]] = contract
        await db.flush()

        # ---------------------------------------------------------------------
        # 7. Time Off Types, Allocations & Requests
        # ---------------------------------------------------------------------
        print("🏖️  7/9 Creating Time Off Types, Allocations & Requests...")
        pto = TimeOffType(
            name="Paid Time Off (PTO)",
            unit="days",
            requires_allocation=True,
            approval="manager",
            display_color="blue",
            is_active=True,
            notes="Annual standard paid vacation days",
        )
        sick = TimeOffType(
            name="Sick Leave",
            unit="days",
            requires_allocation=True,
            approval="manager",
            display_color="orange",
            is_active=True,
            notes="Paid medical leave for illness or appointments",
        )
        casual = TimeOffType(
            name="Casual Leave",
            unit="days",
            requires_allocation=True,
            approval="manager",
            display_color="green",
            is_active=True,
            notes="Short unplanned personal leave",
        )
        unpaid = TimeOffType(
            name="Unpaid Leave",
            unit="days",
            requires_allocation=False,
            approval="manager",
            display_color="gray",
            is_active=True,
            notes="Leave without pay",
        )
        db.add_all([pto, sick, casual, unpaid])
        await db.flush()

        # Allocations for each employee
        all_emps = [sara, aarav, john, neha, priya, vikram, rahul]
        allocations = {}
        for emp in all_emps:
            # 20 days PTO
            alloc_pto = TimeOffAllocation(
                employee_id=emp.id,
                time_off_type_id=pto.id,
                allocated_days=20.0,
                taken_days=0.0,
                approver_id=sara.id,
                status="approved",
                validity_label="2026 Annual Leave Balance",
                description="Annual PTO allocation approved by HR",
            )
            # 10 days Sick
            alloc_sick = TimeOffAllocation(
                employee_id=emp.id,
                time_off_type_id=sick.id,
                allocated_days=10.0,
                taken_days=0.0,
                approver_id=sara.id,
                status="approved",
                validity_label="2026 Medical Balance",
                description="Annual Sick Leave allocation",
            )
            db.add_all([alloc_pto, alloc_sick])
            allocations[(emp.id, pto.id)] = alloc_pto
            allocations[(emp.id, sick.id)] = alloc_sick
        await db.flush()

        # Sample Leave Requests
        # Aarav Mehta took 2 days PTO in August
        req1 = TimeOffRequest(
            employee_id=aarav.id,
            time_off_type_id=pto.id,
            allocation_id=allocations[(aarav.id, pto.id)].id,
            start_date=date(2026, 8, 11),
            end_date=date(2026, 8, 12),
            duration_days=2.0,
            approver_id=sara.id,
            status="approved",
            reason="Family summer trip to Goa",
        )
        allocations[(aarav.id, pto.id)].taken_days = 2.0

        # John Dsouza took 1 day sick leave
        req2 = TimeOffRequest(
            employee_id=john.id,
            time_off_type_id=sick.id,
            allocation_id=allocations[(john.id, sick.id)].id,
            start_date=date(2026, 8, 20),
            end_date=date(2026, 8, 20),
            duration_days=1.0,
            approver_id=sara.id,
            status="approved",
            reason="Seasonal flu recovery",
        )
        allocations[(john.id, sick.id)].taken_days = 1.0

        # Neha Patel has a pending PTO request
        req3 = TimeOffRequest(
            employee_id=neha.id,
            time_off_type_id=pto.id,
            allocation_id=allocations[(neha.id, pto.id)].id,
            start_date=date(2026, 9, 21),
            end_date=date(2026, 9, 23),
            duration_days=3.0,
            approver_id=sara.id,
            status="to_approve",
            reason="Sister's wedding celebration",
        )

        # Priya Sharma has a pending request
        req4 = TimeOffRequest(
            employee_id=priya.id,
            time_off_type_id=pto.id,
            allocation_id=allocations[(priya.id, pto.id)].id,
            start_date=date(2026, 9, 28),
            end_date=date(2026, 9, 29),
            duration_days=2.0,
            approver_id=aarav.id,
            status="to_approve",
            reason="Personal work in home town",
        )
        db.add_all([req1, req2, req3, req4])
        await db.flush()

        # ---------------------------------------------------------------------
        # 8. Attendance Records (Past days + Live active session today for Aarav)
        # ---------------------------------------------------------------------
        print("🕒 8/9 Creating Attendance Records (Past days + Live session for Aarav Mehta)...")
        now = datetime.now(timezone.utc)
        today = now.date()

        # Past 5 days of completed attendance for all employees
        for i in range(1, 6):
            past_date = today - timedelta(days=i)
            # Skip weekends (Saturday=5, Sunday=6)
            if past_date.weekday() >= 5:
                continue

            for emp in all_emps:
                check_in = datetime(past_date.year, past_date.month, past_date.day, 9, 0, 0, tzinfo=timezone.utc)
                check_out = datetime(past_date.year, past_date.month, past_date.day, 17, 30, 0, tzinfo=timezone.utc)
                db.add(
                    AttendanceRecord(
                        employee_id=emp.id,
                        check_in=check_in,
                        check_out=check_out,
                        worked_hours=8.5,
                        overtime_hours=0.5,
                        notes="On-time biometric check",
                    )
                )

        # TODAY'S ATTENDANCE:
        # Aarav Mehta is currently CHECKED IN (check_out is None)
        # This makes the top Navbar attendance widget show active status immediately!
        today_check_in = datetime(today.year, today.month, today.day, 9, 15, 0, tzinfo=timezone.utc)
        db.add(
            AttendanceRecord(
                employee_id=aarav.id,
                check_in=today_check_in,
                check_out=None,
                worked_hours=0.0,
                overtime_hours=0.0,
                notes="Active session from web portal",
            )
        )

        # John Dsouza checked in and out today
        db.add(
            AttendanceRecord(
                employee_id=john.id,
                check_in=datetime(today.year, today.month, today.day, 8, 55, 0, tzinfo=timezone.utc),
                check_out=datetime(today.year, today.month, today.day, 17, 0, 0, tzinfo=timezone.utc),
                worked_hours=8.08,
                overtime_hours=0.08,
                notes="Completed today shift",
            )
        )
        await db.flush()

        # ---------------------------------------------------------------------
        # 9. Payruns, Payslips & Payslip Lines
        # ---------------------------------------------------------------------
        print("💳 9/9 Creating August 2026 Payrun with Computed Payslips...")
        payrun = Payrun(
            name="August 2026 Salary Payrun",
            salary_structure_id=std_salary_struct.id,
            date_from=date(2026, 8, 1),
            date_to=date(2026, 8, 31),
            status=PayrunStatus.VALIDATED.value,
        )
        db.add(payrun)
        await db.flush()

        # Create detailed payslips for Aarav, John, Neha, Priya, Sara
        for emp in [sara, aarav, john, neha, priya]:
            contract = created_contracts.get(emp.id)
            basic = contract.wage_monthly if contract else Decimal("50000.00")
            hra = (basic * Decimal("0.40")).quantize(Decimal("0.01"))
            special = Decimal("15000.00")
            gross = basic + hra + special
            pf = (basic * Decimal("0.12")).quantize(Decimal("0.01"))
            pt = Decimal("200.00")
            net = gross - pf - pt

            payslip = Payslip(
                payrun_id=payrun.id,
                employee_id=emp.id,
                salary_structure_id=std_salary_struct.id,
                contract_id=contract.id if contract else None,
                date_from=date(2026, 8, 1),
                date_to=date(2026, 8, 31),
                worked_days=22,
                basic_wage=basic,
                gross_wage=gross,
                net_wage=net,
                status=PayslipStatus.DONE.value,
                has_warning=False,
            )
            db.add(payslip)
            await db.flush()

            lines = [
                PayslipLine(payslip_id=payslip.id, rule_name="Basic Salary", code="BASIC", category="BASIC", amount=basic, sequence=10),
                PayslipLine(payslip_id=payslip.id, rule_name="House Rent Allowance", code="HRA", category="ALLOWANCE", amount=hra, sequence=20),
                PayslipLine(payslip_id=payslip.id, rule_name="Special Allowance", code="SPECIAL", category="ALLOWANCE", amount=special, sequence=30),
                PayslipLine(payslip_id=payslip.id, rule_name="Gross Wage", code="GROSS", category="GROSS", amount=gross, sequence=40),
                PayslipLine(payslip_id=payslip.id, rule_name="Provident Fund", code="PF", category="DEDUCTION", amount=pf, sequence=50),
                PayslipLine(payslip_id=payslip.id, rule_name="Professional Tax", code="PT", category="DEDUCTION", amount=pt, sequence=60),
                PayslipLine(payslip_id=payslip.id, rule_name="Net Salary", code="NET", category="NET", amount=net, sequence=70),
            ]
            db.add_all(lines)

        await db.commit()

        print("\n" + "=" * 60)
        print("🎉 DATABASE SEEDED SUCCESSFULLY WITH FULL ENTERPRISE DATA!")
        print("=" * 60)
        print("\n🔑 Ready-to-Use Login Credentials (All passwords: 'Password123!'):")
        print("------------------------------------------------------------")
        print(" • Admin:            admin@oxp.com")
        print(" • HR Manager:       hr@oxp.com           (Sara Khan)")
        print(" • Payroll Admin:    payroll@oxp.com      (Rahul Verma)")
        print(" • Payroll User:     payroll.user@oxp.com (Pooja Joshi)")
        print(" • Employee (Hero):  aarav@oxp.com        (Aarav Mehta - Finance)")
        print(" • Employee:         john@oxp.com         (John Dsouza - Eng)")
        print(" • Employee:         neha@oxp.com         (Neha Patel - HR)")
        print(" • Employee:         priya@oxp.com        (Priya Sharma - Finance)")
        print(" • Employee:         vikram@oxp.com       (Vikram Malhotra - Eng)")
        print("------------------------------------------------------------\n")

if __name__ == "__main__":
    asyncio.run(seed_data())
