"""
Database Seeding Script for PeoplePay ERP
═══════════════════════════════════════════
Populates the database with RICH, REALISTIC enterprise demo data to make the
application feel like it has been in production use for over a year.

Coverage:
  • Users    — 20 users across all roles (Admin, HR Manager, Payroll Admin,
                Payroll User, 16 regular employees)
  • Departments — 6 departments with real managers
  • Working Schedules — 3 schedules (Standard 40h, Part-Time 20h, Flexible)
  • Employees  — 20 full employee profiles with private info, DOB, location
  • Salary Structures — 3 structures (Standard, Executive, Part-Time)
  • Salary Rules — complete rule sets for all 3 structures
  • Contracts  — 20 running contracts + 4 expired/cancelled historical ones
                 (triggers "contracts expiring" dashboard alert)
  • Attendance — 14 months of daily records (with realistic variation,
                 late check-ins, overtime, early departures)
  • Time Off Types — 5 leave types
  • Allocations — per-employee leave banks, varied by seniority
  • Leave Requests — 40+ historical + pending requests across all employees
  • Payruns     — 14 monthly payruns (Sep 2025 → Sep 2026)
                  statuses: PAID (past), VALIDATED (current), DRAFT (future)
  • Payslips    — computed payslips for every employee in every month
  • Payslip Lines — full breakdown per payslip

Usage:
    uv run python seed.py              # clears data, seeds fresh
    uv run python seed.py --no-clean   # appends without clearing
"""

import asyncio
import random
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
COMPANY = "OXP Technologies Pvt Ltd"

# ─── Seed randomness — fixed seed for reproducibility ────────────────────────
random.seed(42)


# ─── Helper to compute payslip lines ─────────────────────────────────────────
def compute_payslip_numbers(wage: Decimal, is_exec: bool = False, is_part: bool = False):
    """Return (basic, hra, allowance, allowance_name, allowance_code, gross, pf, pt, net)."""
    basic = wage
    if is_exec:
        hra_pct = Decimal("0.50")
        allowance_amt = Decimal("30000.00")
        allowance_name = "Executive Allowance"
        allowance_code = "EXEC"
    elif is_part:
        hra_pct = Decimal("0.30")
        allowance_amt = Decimal("5000.00")
        allowance_name = "Part-Time Supplement"
        allowance_code = "SUPP"
    else:
        hra_pct = Decimal("0.40")
        allowance_amt = Decimal("15000.00")
        allowance_name = "Special Allowance"
        allowance_code = "SPECIAL"

    hra = (basic * hra_pct).quantize(Decimal("0.01"))
    gross = basic + hra + allowance_amt
    pf = (basic * Decimal("0.12")).quantize(Decimal("0.01"))
    pt = Decimal("200.00")
    net = gross - pf - pt
    return basic, hra, allowance_amt, allowance_name, allowance_code, gross, pf, pt, net


# ─── Clean ────────────────────────────────────────────────────────────────────
async def clean_database(db: AsyncSession):
    print("🧹  Cleaning existing tables via TRUNCATE CASCADE...")
    tables = [
        "payslip_lines", "payslips", "payruns",
        "salary_rules", "contracts", "salary_structures",
        "attendance_records",
        "time_off_requests", "time_off_allocations", "time_off_types",
        "employees", "departments",
        "schedule_lines", "working_schedules",
        "users",
    ]
    for t in tables:
        await db.execute(text(f"TRUNCATE TABLE {t} CASCADE;"))
    await db.commit()
    print("✨  Tables truncated.\n")


# ─── Main seed ────────────────────────────────────────────────────────────────
async def seed_data():
    clean = "--no-clean" not in sys.argv

    async with AsyncSessionLocal() as db:
        if clean:
            await clean_database(db)

        hashed_pwd = hash_password(DEFAULT_PASSWORD)
        print("🌱  Seeding PeoplePay ERP with full enterprise data...\n")

        # ══════════════════════════════════════════════════════════════════════
        # STEP 1 – USERS
        # ══════════════════════════════════════════════════════════════════════
        print("👤  1/9  Users...")
        users_raw = [
            # role, email, name
            (UserRole.ADMIN,             "admin@oxp.com",           "System Administrator"),
            (UserRole.HR_MANAGER,        "hr@oxp.com",              "Sara Khan"),
            (UserRole.HR_PAYROLL_ADMIN,  "payroll@oxp.com",         "Rahul Verma"),
            (UserRole.HR_PAYROLL_USER,   "payroll.user@oxp.com",    "Pooja Joshi"),
            # Engineering
            (UserRole.EMPLOYEE,          "john@oxp.com",            "John Dsouza"),
            (UserRole.EMPLOYEE,          "vikram@oxp.com",           "Vikram Malhotra"),
            (UserRole.EMPLOYEE,          "tanvi@oxp.com",            "Tanvi Deshmukh"),
            (UserRole.EMPLOYEE,          "arjun@oxp.com",            "Arjun Nair"),
            (UserRole.EMPLOYEE,          "meera@oxp.com",            "Meera Krishnan"),
            # Finance
            (UserRole.EMPLOYEE,          "aarav@oxp.com",            "Aarav Mehta"),
            (UserRole.EMPLOYEE,          "priya@oxp.com",            "Priya Sharma"),
            (UserRole.EMPLOYEE,          "amit@oxp.com",             "Amit Chaudhary"),
            # Sales & Marketing
            (UserRole.EMPLOYEE,          "ananya@oxp.com",           "Ananya Sen"),
            (UserRole.EMPLOYEE,          "rohan@oxp.com",            "Rohan Iyer"),
            (UserRole.EMPLOYEE,          "shreya@oxp.com",           "Shreya Pandey"),
            # Operations
            (UserRole.EMPLOYEE,          "devraj@oxp.com",           "Devraj Mukherjee"),
            (UserRole.EMPLOYEE,          "kavita@oxp.com",           "Kavita Rao"),
            # HR
            (UserRole.EMPLOYEE,          "neha@oxp.com",             "Neha Patel"),
            (UserRole.EMPLOYEE,          "ankita@oxp.com",           "Ankita Joshi"),
            # Product
            (UserRole.EMPLOYEE,          "sameer@oxp.com",           "Sameer Shaikh"),
        ]
        users: dict[str, User] = {}
        for role, email, name in users_raw:
            u = User(email=email, name=name, password_hash=hashed_pwd,
                     role=role.value, is_active=True)
            db.add(u)
            users[email] = u
        await db.flush()

        # ══════════════════════════════════════════════════════════════════════
        # STEP 2 – WORKING SCHEDULES
        # ══════════════════════════════════════════════════════════════════════
        print("⏱️   2/9  Working Schedules...")
        std_ws = WorkingSchedule(
            name="Standard 40 Hours / Week", company=COMPANY,
            days_per_week=5, hours_per_week=40.0,
            timezone="Asia/Kolkata", is_active=True,
        )
        part_ws = WorkingSchedule(
            name="Part-Time 20 Hours / Week", company=COMPANY,
            days_per_week=5, hours_per_week=20.0,
            timezone="Asia/Kolkata", is_active=True,
        )
        flex_ws = WorkingSchedule(
            name="Flexible Shift — 45 Hours / Week", company=COMPANY,
            days_per_week=5, hours_per_week=45.0,
            timezone="Asia/Kolkata", is_active=True,
        )
        db.add_all([std_ws, part_ws, flex_ws])
        await db.flush()

        weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
        schedule_lines = []
        for day in weekdays:
            schedule_lines += [
                ScheduleLine(schedule_id=std_ws.id,  day_of_week=day, start_time="09:00", end_time="18:00", break_hours=1.0, work_hours=8.0),
                ScheduleLine(schedule_id=part_ws.id, day_of_week=day, start_time="09:00", end_time="13:00", break_hours=0.0, work_hours=4.0),
                ScheduleLine(schedule_id=flex_ws.id, day_of_week=day, start_time="08:30", end_time="19:00", break_hours=1.0, work_hours=9.5),
            ]
        db.add_all(schedule_lines)
        await db.flush()

        # ══════════════════════════════════════════════════════════════════════
        # STEP 3 – DEPARTMENTS
        # ══════════════════════════════════════════════════════════════════════
        print("🏢  3/9  Departments...")
        dept_names = [
            "Human Resources", "Engineering", "Finance",
            "Sales & Marketing", "Operations", "Product",
        ]
        depts: dict[str, Department] = {}
        for dn in dept_names:
            d = Department(name=dn)
            db.add(d)
            depts[dn] = d
        await db.flush()

        # ══════════════════════════════════════════════════════════════════════
        # STEP 4 – EMPLOYEES (build in layers due to FK self-reference)
        # ══════════════════════════════════════════════════════════════════════
        print("👥  4/9  Employees...")

        # ── Layer A: dept heads / managers (no manager_id yet) ─────────────
        sara = Employee(
            name="Sara Khan", job_position="Head of HR",
            department_id=depts["Human Resources"].id, work_email="hr@oxp.com",
            phone="+91 98765 11001", work_location="Mumbai", company=COMPANY,
            working_schedule_id=std_ws.id, status=EmployeeStatus.ACTIVE.value,
            user_id=users["hr@oxp.com"].id,
            date_of_birth=date(1989, 4, 12), gender="female",
            personal_email="sara.khan@gmail.com",
            private_address="402 Sea View Apts, Bandra West, Mumbai, MH 400050",
        )
        john = Employee(
            name="John Dsouza", job_position="Lead Developer",
            department_id=depts["Engineering"].id, work_email="john@oxp.com",
            phone="+91 98765 22002", work_location="Bengaluru", company=COMPANY,
            working_schedule_id=flex_ws.id, status=EmployeeStatus.ACTIVE.value,
            user_id=users["john@oxp.com"].id,
            date_of_birth=date(1992, 11, 5), gender="male",
            personal_email="john.dsouza.dev@gmail.com",
            private_address="304 Lakefront Towers, Indiranagar, Bengaluru, KA 560038",
        )
        ananya = Employee(
            name="Ananya Sen", job_position="Marketing Director",
            department_id=depts["Sales & Marketing"].id, work_email="ananya@oxp.com",
            phone="+91 98765 99009", work_location="Bengaluru", company=COMPANY,
            working_schedule_id=std_ws.id, status=EmployeeStatus.ACTIVE.value,
            user_id=users["ananya@oxp.com"].id,
            date_of_birth=date(1991, 3, 25), gender="female",
            personal_email="ananya.sen.mkt@gmail.com",
            private_address="Penthouse 14B, Green Glen Layout, Bellandur, Bengaluru, KA 560103",
        )
        devraj = Employee(
            name="Devraj Mukherjee", job_position="Head of Operations",
            department_id=depts["Operations"].id, work_email="devraj@oxp.com",
            phone="+91 98765 34034", work_location="Mumbai", company=COMPANY,
            working_schedule_id=std_ws.id, status=EmployeeStatus.ACTIVE.value,
            user_id=users["devraj@oxp.com"].id,
            date_of_birth=date(1988, 10, 14), gender="male",
            personal_email="devraj.mukherjee@outlook.com",
            private_address="Villa 8, Clover Highlands, NIBM Road, Pune, MH 411048",
        )
        aarav = Employee(
            name="Aarav Mehta", job_position="Finance Manager",
            department_id=depts["Finance"].id, work_email="aarav@oxp.com",
            phone="+91 98765 43210", work_location="Mumbai", company=COMPANY,
            working_schedule_id=std_ws.id, status=EmployeeStatus.ACTIVE.value,
            user_id=users["aarav@oxp.com"].id,
            date_of_birth=date(1990, 8, 22), gender="male",
            personal_email="aarav.mehta94@gmail.com",
            private_address="Flat 101, Palm Heights, Andheri East, Mumbai, MH 400069",
        )
        sameer = Employee(
            name="Sameer Shaikh", job_position="Product Manager",
            department_id=depts["Product"].id, work_email="sameer@oxp.com",
            phone="+91 98765 77700", work_location="Hyderabad", company=COMPANY,
            working_schedule_id=std_ws.id, status=EmployeeStatus.ACTIVE.value,
            user_id=users["sameer@oxp.com"].id,
            date_of_birth=date(1987, 7, 3), gender="male",
            personal_email="sameer.shaikh.pm@gmail.com",
            private_address="3-B Sky Towers, Banjara Hills, Hyderabad, TS 500034",
        )
        rahul = Employee(
            name="Rahul Verma", job_position="Payroll Controller",
            department_id=depts["Finance"].id, work_email="payroll@oxp.com",
            phone="+91 98765 66006", work_location="Mumbai", company=COMPANY,
            working_schedule_id=std_ws.id, status=EmployeeStatus.ACTIVE.value,
            user_id=users["payroll@oxp.com"].id,
            date_of_birth=date(1986, 1, 15), gender="male",
            personal_email="rahul.verma.fin@gmail.com",
            private_address="501 Skyline Apts, Malad West, Mumbai, MH 400064",
        )

        layer_a = [sara, john, ananya, devraj, aarav, sameer, rahul]
        db.add_all(layer_a)
        await db.flush()

        # Update dept managers
        depts["Human Resources"].manager_id = sara.id
        depts["Engineering"].manager_id = john.id
        depts["Sales & Marketing"].manager_id = ananya.id
        depts["Operations"].manager_id = devraj.id
        depts["Finance"].manager_id = aarav.id
        depts["Product"].manager_id = sameer.id

        # ── Layer B: mid-level (knows manager IDs) ─────────────────────────
        vikram = Employee(
            name="Vikram Malhotra", job_position="DevOps Specialist",
            department_id=depts["Engineering"].id, manager_id=john.id,
            work_email="vikram@oxp.com", phone="+91 98765 77007",
            work_location="Bengaluru", company=COMPANY,
            working_schedule_id=flex_ws.id, status=EmployeeStatus.ACTIVE.value,
            user_id=users["vikram@oxp.com"].id,
            date_of_birth=date(1993, 9, 14), gender="male",
            personal_email="vikram.ops@gmail.com",
            private_address="12 Koramangala 4th Block, Bengaluru, KA 560034",
        )
        tanvi = Employee(
            name="Tanvi Deshmukh", job_position="Frontend UI/UX Engineer",
            department_id=depts["Engineering"].id, manager_id=john.id,
            work_email="tanvi@oxp.com", phone="+91 98765 78078",
            work_location="Bengaluru", company=COMPANY,
            working_schedule_id=std_ws.id, status=EmployeeStatus.ACTIVE.value,
            user_id=users["tanvi@oxp.com"].id,
            date_of_birth=date(1998, 9, 21), gender="female",
            personal_email="tanvi.deshmukh.design@gmail.com",
            private_address="Tower 2, Apt 501, Prestige Shantiniketan, Whitefield, Bengaluru, KA 560048",
        )
        arjun = Employee(
            name="Arjun Nair", job_position="Backend Engineer",
            department_id=depts["Engineering"].id, manager_id=john.id,
            work_email="arjun@oxp.com", phone="+91 98765 88210",
            work_location="Bengaluru", company=COMPANY,
            working_schedule_id=std_ws.id, status=EmployeeStatus.ACTIVE.value,
            user_id=users["arjun@oxp.com"].id,
            date_of_birth=date(1997, 5, 10), gender="male",
            personal_email="arjun.nair.eng@gmail.com",
            private_address="Flat 405, Mantri Alpyne, Gubbalala, Bengaluru, KA 560061",
        )
        meera = Employee(
            name="Meera Krishnan", job_position="QA Lead",
            department_id=depts["Engineering"].id, manager_id=john.id,
            work_email="meera@oxp.com", phone="+91 98765 67890",
            work_location="Chennai", company=COMPANY,
            working_schedule_id=std_ws.id, status=EmployeeStatus.ACTIVE.value,
            user_id=users["meera@oxp.com"].id,
            date_of_birth=date(1994, 2, 28), gender="female",
            personal_email="meera.krishnan.qa@gmail.com",
            private_address="18 2nd Street, Thiruvanmiyur, Chennai, TN 600041",
        )
        priya = Employee(
            name="Priya Sharma", job_position="Senior Financial Analyst",
            department_id=depts["Finance"].id, manager_id=aarav.id,
            work_email="priya@oxp.com", phone="+91 98765 55005",
            work_location="Delhi", company=COMPANY,
            working_schedule_id=std_ws.id, status=EmployeeStatus.ACTIVE.value,
            user_id=users["priya@oxp.com"].id,
            date_of_birth=date(1995, 6, 30), gender="female",
            personal_email="priya.sharma95@outlook.com",
            private_address="21 Greater Kailash 1, New Delhi, DL 110048",
        )
        pooja = Employee(
            name="Pooja Joshi", job_position="Senior Payroll Specialist",
            department_id=depts["Finance"].id, manager_id=rahul.id,
            work_email="payroll.user@oxp.com", phone="+91 98765 88008",
            work_location="Mumbai", company=COMPANY,
            working_schedule_id=std_ws.id, status=EmployeeStatus.ACTIVE.value,
            user_id=users["payroll.user@oxp.com"].id,
            date_of_birth=date(1993, 7, 19), gender="female",
            personal_email="pooja.joshi93@yahoo.com",
            private_address="Flat 602, Sai Sagar Complex, Thane West, MH 400602",
        )
        amit = Employee(
            name="Amit Chaudhary", job_position="Accounts Executive",
            department_id=depts["Finance"].id, manager_id=aarav.id,
            work_email="amit@oxp.com", phone="+91 98765 23456",
            work_location="Mumbai", company=COMPANY,
            working_schedule_id=std_ws.id, status=EmployeeStatus.ACTIVE.value,
            user_id=users["amit@oxp.com"].id,
            date_of_birth=date(1996, 4, 8), gender="male",
            personal_email="amit.chaudhary.fin@gmail.com",
            private_address="3A Sion East, Mumbai, MH 400022",
        )
        rohan = Employee(
            name="Rohan Iyer", job_position="Enterprise Account Executive",
            department_id=depts["Sales & Marketing"].id, manager_id=ananya.id,
            work_email="rohan@oxp.com", phone="+91 98765 12012",
            work_location="Mumbai", company=COMPANY,
            working_schedule_id=std_ws.id, status=EmployeeStatus.ACTIVE.value,
            user_id=users["rohan@oxp.com"].id,
            date_of_birth=date(1995, 12, 8), gender="male",
            personal_email="rohan.iyer.sales@gmail.com",
            private_address="A-303, Silver Beach Residency, Juhu, Mumbai, MH 400049",
        )
        shreya = Employee(
            name="Shreya Pandey", job_position="Brand Strategist",
            department_id=depts["Sales & Marketing"].id, manager_id=ananya.id,
            work_email="shreya@oxp.com", phone="+91 98765 56789",
            work_location="Bengaluru", company=COMPANY,
            working_schedule_id=std_ws.id, status=EmployeeStatus.ACTIVE.value,
            user_id=users["shreya@oxp.com"].id,
            date_of_birth=date(1997, 8, 15), gender="female",
            personal_email="shreya.pandey.mkt@gmail.com",
            private_address="Flat 201, Sobha Dream Acress, Off Panathur, Bengaluru, KA 560103",
        )
        kavita = Employee(
            name="Kavita Rao", job_position="Logistics & Facilities Coordinator",
            department_id=depts["Operations"].id, manager_id=devraj.id,
            work_email="kavita@oxp.com", phone="+91 98765 56056",
            work_location="Mumbai", company=COMPANY,
            working_schedule_id=std_ws.id, status=EmployeeStatus.ACTIVE.value,
            user_id=users["kavita@oxp.com"].id,
            date_of_birth=date(1997, 5, 17), gender="female",
            personal_email="kavita.rao97@gmail.com",
            private_address="Flat 204, Orchid Enclave, Vashi, Navi Mumbai, MH 400703",
        )
        neha = Employee(
            name="Neha Patel", job_position="Technical Recruiter",
            department_id=depts["Human Resources"].id, manager_id=sara.id,
            work_email="neha@oxp.com", phone="+91 98765 33003",
            work_location="Mumbai", company=COMPANY,
            working_schedule_id=std_ws.id, status=EmployeeStatus.ACTIVE.value,
            user_id=users["neha@oxp.com"].id,
            date_of_birth=date(1996, 2, 18), gender="female",
            personal_email="neha.patel.hr@gmail.com",
            private_address="B-12 Hill View Society, Powai, Mumbai, MH 400076",
        )
        ankita = Employee(
            name="Ankita Joshi", job_position="HR Business Partner",
            department_id=depts["Human Resources"].id, manager_id=sara.id,
            work_email="ankita@oxp.com", phone="+91 98765 44404",
            work_location="Delhi", company=COMPANY,
            working_schedule_id=part_ws.id, status=EmployeeStatus.ACTIVE.value,
            user_id=users["ankita@oxp.com"].id,
            date_of_birth=date(1994, 11, 30), gender="female",
            personal_email="ankita.joshi.hrbp@gmail.com",
            private_address="Flat 12B, Vasant Vihar, New Delhi, DL 110057",
        )

        layer_b = [vikram, tanvi, arjun, meera, priya, pooja, amit, rohan, shreya, kavita, neha, ankita]
        db.add_all(layer_b)
        await db.flush()

        # ── Layer C: reports to layer B ────────────────────────────────────
        # Sameer reports to self (PM) — product employees are done at A level
        # Set managers for Finance Dept
        depts["Finance"].manager_id = aarav.id

        all_emps = [sara, john, ananya, devraj, aarav, sameer, rahul,
                    vikram, tanvi, arjun, meera, priya, pooja, amit,
                    rohan, shreya, kavita, neha, ankita]

        # ══════════════════════════════════════════════════════════════════════
        # STEP 5 – SALARY STRUCTURES & RULES
        # ══════════════════════════════════════════════════════════════════════
        print("💰  5/9  Salary Structures & Rules...")

        std_ss = SalaryStructure(
            name="Standard Indian Tech Structure", is_active=True,
            notes="Basic + HRA 40% + ₹15K Special Allowance — PF 12% on Basic — Prof Tax ₹200",
        )
        exec_ss = SalaryStructure(
            name="Executive Leadership Structure", is_active=True,
            notes="Basic + HRA 50% + ₹30K Executive Allowance — PF 12% on Basic — Prof Tax ₹200",
        )
        part_ss = SalaryStructure(
            name="Part-Time Supplement Structure", is_active=True,
            notes="Basic + HRA 30% + ₹5K Supplement — PF 12% on Basic — Prof Tax ₹200",
        )
        db.add_all([std_ss, exec_ss, part_ss])
        await db.flush()

        rules_raw = [
            # ── Standard ──────────────────────────────────────────────────
            (std_ss.id, "Basic Salary",         "BASIC",   "BASIC",      10, "fixed",      Decimal("50000"), None,  None,              None),
            (std_ss.id, "House Rent Allowance", "HRA",     "ALLOWANCE",  20, "percentage", None,             40.0,  "BASIC",           None),
            (std_ss.id, "Special Allowance",    "SPECIAL", "ALLOWANCE",  30, "fixed",      Decimal("15000"), None,  None,              None),
            (std_ss.id, "Gross Wage",           "GROSS",   "GROSS",      40, "python",     None,             None,  None,              "BASIC + HRA + SPECIAL"),
            (std_ss.id, "Provident Fund",       "PF",      "DEDUCTION",  50, "percentage", None,             12.0,  "BASIC",           None),
            (std_ss.id, "Professional Tax",     "PT",      "DEDUCTION",  60, "fixed",      Decimal("200"),   None,  None,              None),
            (std_ss.id, "Net Salary",           "NET",     "NET",        70, "python",     None,             None,  None,              "GROSS - PF - PT"),
            # ── Executive ─────────────────────────────────────────────────
            (exec_ss.id, "Basic Salary",        "BASIC",   "BASIC",      10, "fixed",      Decimal("80000"), None,  None,              None),
            (exec_ss.id, "House Rent Allowance","HRA",     "ALLOWANCE",  20, "percentage", None,             50.0,  "BASIC",           None),
            (exec_ss.id, "Executive Allowance", "EXEC",    "ALLOWANCE",  30, "fixed",      Decimal("30000"), None,  None,              None),
            (exec_ss.id, "Gross Wage",          "GROSS",   "GROSS",      40, "python",     None,             None,  None,              "BASIC + HRA + EXEC"),
            (exec_ss.id, "Provident Fund",      "PF",      "DEDUCTION",  50, "percentage", None,             12.0,  "BASIC",           None),
            (exec_ss.id, "Professional Tax",    "PT",      "DEDUCTION",  60, "fixed",      Decimal("200"),   None,  None,              None),
            (exec_ss.id, "Net Salary",          "NET",     "NET",        70, "python",     None,             None,  None,              "GROSS - PF - PT"),
            # ── Part-Time ─────────────────────────────────────────────────
            (part_ss.id, "Basic Salary",        "BASIC",   "BASIC",      10, "fixed",      Decimal("28000"), None,  None,              None),
            (part_ss.id, "House Rent Allowance","HRA",     "ALLOWANCE",  20, "percentage", None,             30.0,  "BASIC",           None),
            (part_ss.id, "Part-Time Supplement","SUPP",    "ALLOWANCE",  30, "fixed",      Decimal("5000"),  None,  None,              None),
            (part_ss.id, "Gross Wage",          "GROSS",   "GROSS",      40, "python",     None,             None,  None,              "BASIC + HRA + SUPP"),
            (part_ss.id, "Provident Fund",      "PF",      "DEDUCTION",  50, "percentage", None,             12.0,  "BASIC",           None),
            (part_ss.id, "Professional Tax",    "PT",      "DEDUCTION",  60, "fixed",      Decimal("200"),   None,  None,              None),
            (part_ss.id, "Net Salary",          "NET",     "NET",        70, "python",     None,             None,  None,              "GROSS - PF - PT"),
        ]
        for (ss_id, name, code, cat, seq, comp, fa, pct, pb, py) in rules_raw:
            db.add(SalaryRule(
                salary_structure_id=ss_id, name=name, code=code,
                category=cat, sequence=seq, computation=comp,
                fixed_amount=fa, percentage=pct, percentage_base=pb, python_code=py,
            ))
        await db.flush()

        # ══════════════════════════════════════════════════════════════════════
        # STEP 6 – CONTRACTS
        # ══════════════════════════════════════════════════════════════════════
        print("📄  6/9  Contracts...")

        # employee → (base_wage, struct, join_date, end, status, notes)
        # join_date = contract start. Employees joining Sep 2025 onward create
        # natural headcount growth → upward slope in the monthly trend chart.
        contracts_info = {
            # ── Core team — joined well before the payrun window ─────────────
            sara.id:   (Decimal("135000"), exec_ss.id,  date(2023, 6, 1),  None, ContractStatus.RUNNING, "Executive HR leadership contract"),
            john.id:   (Decimal("145000"), exec_ss.id,  date(2023, 8, 1),  None, ContractStatus.RUNNING, "Senior engineering leadership contract"),
            ananya.id: (Decimal("140000"), exec_ss.id,  date(2023, 7, 1),  None, ContractStatus.RUNNING, "Marketing director employment contract"),
            devraj.id: (Decimal("130000"), exec_ss.id,  date(2023, 5, 1),  None, ContractStatus.RUNNING, "Operations executive contract"),
            aarav.id:  (Decimal("105000"), exec_ss.id,  date(2024, 1, 1),  None, ContractStatus.RUNNING, "Finance manager contract"),
            rahul.id:  (Decimal("90000"),  std_ss.id,   date(2024, 1, 15), None, ContractStatus.RUNNING, "Payroll controller contract"),
            vikram.id: (Decimal("95000"),  std_ss.id,   date(2024, 4, 1),  None, ContractStatus.RUNNING, "Cloud & infra specialist contract"),
            priya.id:  (Decimal("72000"),  std_ss.id,   date(2024, 3, 1),  None, ContractStatus.RUNNING, "Senior financial analyst contract"),
            pooja.id:  (Decimal("75000"),  std_ss.id,   date(2024, 2, 1),  None, ContractStatus.RUNNING, "Senior payroll specialist contract"),
            neha.id:   (Decimal("65000"),  std_ss.id,   date(2024, 2, 1),  None, ContractStatus.RUNNING, "Technical recruiter contract"),
            rohan.id:  (Decimal("80000"),  std_ss.id,   date(2024, 3, 15), None, ContractStatus.RUNNING, "Enterprise sales account contract"),
            # ── New hires spread across the 14-month payrun window ──────────
            # Sep 2025 — Tanvi joins
            tanvi.id:  (Decimal("85000"),  std_ss.id,   date(2025, 9, 1),  None, ContractStatus.RUNNING, "Frontend UI/UX engineer contract"),
            # Oct 2025 — Arjun joins
            arjun.id:  (Decimal("78000"),  std_ss.id,   date(2025, 10, 1), None, ContractStatus.RUNNING, "Backend engineer contract"),
            # Nov 2025 — Meera joins
            meera.id:  (Decimal("75000"),  std_ss.id,   date(2025, 11, 1), None, ContractStatus.RUNNING, "QA lead contract"),
            # Dec 2025 — Shreya joins
            shreya.id: (Decimal("65000"),  std_ss.id,   date(2025, 12, 1), None, ContractStatus.RUNNING, "Brand strategist contract"),
            # Jan 2026 — Kavita joins
            kavita.id: (Decimal("60000"),  std_ss.id,   date(2026, 1, 1),  None, ContractStatus.RUNNING, "Logistics & facilities contract"),
            # Feb 2026 — Ankita (part-time) joins
            ankita.id: (Decimal("35000"),  part_ss.id,  date(2026, 2, 1),  None, ContractStatus.RUNNING, "Part-time HRBP contract"),
            # Mar 2026 — Amit joins
            amit.id:   (Decimal("58000"),  std_ss.id,   date(2026, 3, 1),  None, ContractStatus.RUNNING, "Accounts executive contract"),
            # Apr 2026 — Sameer joins
            sameer.id: (Decimal("120000"), exec_ss.id,  date(2026, 4, 1),  None, ContractStatus.RUNNING, "Product manager employment contract"),
        }

        # Annual increment table (applied from April 2026 payrun onwards)
        # Maps employee_id → wage increase in Decimal
        april_increment: dict[int, Decimal] = {
            sara.id:   Decimal("15000"),
            john.id:   Decimal("20000"),
            ananya.id: Decimal("18000"),
            devraj.id: Decimal("15000"),
            aarav.id:  Decimal("12000"),
            rahul.id:  Decimal("8000"),
            vikram.id: Decimal("10000"),
            priya.id:  Decimal("7000"),
            pooja.id:  Decimal("8000"),
            neha.id:   Decimal("6000"),
            rohan.id:  Decimal("8000"),
        }

        emp_contracts: dict[int, Contract] = {}
        for idx, (emp_id, (wage, ss_id, start, end, status, notes)) in enumerate(contracts_info.items(), start=1):
            c = Contract(
                reference=f"CON/2025/{idx:04d}",
                employee_id=emp_id,
                wage_monthly=wage,
                salary_structure_id=ss_id,
                working_schedule_id=std_ws.id,
                start_date=start,
                end_date=end,
                status=status.value,
                notes=notes,
            )
            db.add(c)
            emp_contracts[emp_id] = c

        # ── 4 historical / soon-expiring contracts for dashboard alerts ────
        historical_contracts = [
            Contract(
                reference="CON/2023/0007",
                employee_id=vikram.id,
                wage_monthly=Decimal("75000"),
                salary_structure_id=std_ss.id,
                working_schedule_id=std_ws.id,
                start_date=date(2023, 4, 1),
                end_date=date(2024, 3, 31),
                status=ContractStatus.EXPIRED.value,
                notes="Previous contract — expired",
            ),
            Contract(
                reference="CON/2023/0011",
                employee_id=neha.id,
                wage_monthly=Decimal("52000"),
                salary_structure_id=std_ss.id,
                working_schedule_id=std_ws.id,
                start_date=date(2023, 2, 1),
                end_date=date(2024, 1, 31),
                status=ContractStatus.EXPIRED.value,
                notes="Original junior recruiter contract",
            ),
            # Two contracts expiring within 60 days — triggers dashboard alert
            Contract(
                reference="CON/2026/0020",
                employee_id=shreya.id,
                wage_monthly=Decimal("65000"),
                salary_structure_id=std_ss.id,
                working_schedule_id=std_ws.id,
                start_date=date(2025, 5, 1),
                end_date=date.today() + timedelta(days=35),
                status=ContractStatus.RUNNING.value,
                notes="Fixed-term contract expiring soon",
            ),
            Contract(
                reference="CON/2026/0021",
                employee_id=amit.id,
                wage_monthly=Decimal("58000"),
                salary_structure_id=std_ss.id,
                working_schedule_id=std_ws.id,
                start_date=date(2025, 4, 1),
                end_date=date.today() + timedelta(days=50),
                status=ContractStatus.RUNNING.value,
                notes="Annual contract renewal pending",
            ),
        ]
        db.add_all(historical_contracts)
        await db.flush()

        # ══════════════════════════════════════════════════════════════════════
        # STEP 7 – TIME OFF TYPES + ALLOCATIONS + REQUESTS
        # ══════════════════════════════════════════════════════════════════════
        print("🏖️   7/9  Time Off Types, Allocations & Requests...")

        pto    = TimeOffType(name="Paid Time Off (PTO)",     unit="days", requires_allocation=True,  approval="manager", display_color="blue",   is_active=True, notes="Annual paid vacation days")
        sick   = TimeOffType(name="Sick Leave",              unit="days", requires_allocation=True,  approval="manager", display_color="orange",  is_active=True, notes="Medical leave with pay")
        casual = TimeOffType(name="Casual Leave",            unit="days", requires_allocation=True,  approval="manager", display_color="green",   is_active=True, notes="Short unplanned personal leave")
        comp   = TimeOffType(name="Compensatory Off",        unit="days", requires_allocation=False, approval="officer", display_color="purple",  is_active=True, notes="Comp-off against overtime worked")
        unpaid = TimeOffType(name="Unpaid Leave",            unit="days", requires_allocation=False, approval="manager", display_color="gray",    is_active=True, notes="Leave without pay")
        db.add_all([pto, sick, casual, comp, unpaid])
        await db.flush()

        # Seniority-based allocations (executives get more)
        exec_emps = {sara.id, john.id, ananya.id, devraj.id, aarav.id, sameer.id}
        senior_emps = {rahul.id, vikram.id, priya.id, pooja.id, rohan.id}

        alloc_map: dict[tuple[int, int], TimeOffAllocation] = {}

        def pto_days(emp_id): return 24.0 if emp_id in exec_emps else (20.0 if emp_id in senior_emps else 18.0)
        def sick_days(emp_id): return 12.0 if emp_id in exec_emps else 10.0
        def casual_days(emp_id): return 14.0 if emp_id in exec_emps else (12.0 if emp_id in senior_emps else 10.0)

        for emp in all_emps:
            a_pto = TimeOffAllocation(
                employee_id=emp.id, time_off_type_id=pto.id,
                allocated_days=pto_days(emp.id), taken_days=0.0,
                approver_id=sara.id, status="approved",
                validity_label="2026 Annual PTO Balance",
                description="Annual PTO allocation — approved by HR",
            )
            a_sick = TimeOffAllocation(
                employee_id=emp.id, time_off_type_id=sick.id,
                allocated_days=sick_days(emp.id), taken_days=0.0,
                approver_id=sara.id, status="approved",
                validity_label="2026 Medical Balance",
                description="Annual sick leave approved by HR",
            )
            a_cas = TimeOffAllocation(
                employee_id=emp.id, time_off_type_id=casual.id,
                allocated_days=casual_days(emp.id), taken_days=0.0,
                approver_id=sara.id, status="approved",
                validity_label="2026 Casual Leave Balance",
                description="Annual casual leave approved by HR",
            )
            db.add_all([a_pto, a_sick, a_cas])
            alloc_map[(emp.id, pto.id)]    = a_pto
            alloc_map[(emp.id, sick.id)]   = a_sick
            alloc_map[(emp.id, casual.id)] = a_cas

        await db.flush()

        # ── Leave requests — 40+ approved + pending spread across months ──
        # fmt: (emp, type, alloc, start, end, dur, approver, status, reason)
        leave_requests_raw = [
            # ── Approved historical (2025–2026) ───────────────────────────
            (aarav,  pto,    (aarav.id,pto.id),    date(2025,10,6),  date(2025,10,8),  3.0, sara,   "approved", "Dussehra extended weekend trip to Shimla"),
            (aarav,  sick,   (aarav.id,sick.id),   date(2025,12,15), date(2025,12,15), 1.0, sara,   "approved", "Viral fever — doctor visit"),
            (aarav,  pto,    (aarav.id,pto.id),    date(2026,8,11),  date(2026,8,12),  2.0, sara,   "approved", "Family summer trip to Goa"),
            (john,   sick,   (john.id,sick.id),    date(2025,11,3),  date(2025,11,3),  1.0, sara,   "approved", "Seasonal flu recovery"),
            (john,   pto,    (john.id,pto.id),     date(2026,1,1),   date(2026,1,3),   3.0, sara,   "approved", "New Year long weekend"),
            (john,   sick,   (john.id,sick.id),    date(2026,8,20),  date(2026,8,20),  1.0, sara,   "approved", "Migraine — skipped office"),
            (sara,   pto,    (sara.id,pto.id),     date(2025,12,25), date(2025,12,26), 2.0, sara,   "approved", "Christmas family break"),
            (sara,   casual, (sara.id,casual.id),  date(2026,4,14),  date(2026,4,14),  1.0, sara,   "approved", "Baisakhi — personal holiday"),
            (vikram, pto,    (vikram.id,pto.id),   date(2025,10,24), date(2025,10,25), 2.0, john,   "approved", "Diwali celebrations — hometown visit"),
            (vikram, sick,   (vikram.id,sick.id),  date(2026,2,10),  date(2026,2,10),  1.0, john,   "approved", "Food poisoning — rest at home"),
            (vikram, casual, (vikram.id,casual.id),date(2026,6,5),   date(2026,6,5),   1.0, john,   "approved", "Bike service and registration renewal"),
            (tanvi,  casual, (tanvi.id,casual.id), date(2025,11,14), date(2025,11,14), 1.0, john,   "approved", "Bank work and power of attorney"),
            (tanvi,  pto,    (tanvi.id,pto.id),    date(2026,4,2),   date(2026,4,4),   3.0, john,   "approved", "Family function — engagement ceremony"),
            (arjun,  sick,   (arjun.id,sick.id),   date(2026,3,18),  date(2026,3,19),  2.0, john,   "approved", "Appendix operation recovery"),
            (arjun,  casual, (arjun.id,casual.id), date(2026,5,22),  date(2026,5,22),  1.0, john,   "approved", "House shifting from PG to apartment"),
            (meera,  pto,    (meera.id,pto.id),    date(2025,12,30), date(2025,12,31), 2.0, john,   "approved", "Year-end trip to Pondicherry"),
            (meera,  sick,   (meera.id,sick.id),   date(2026,7,8),   date(2026,7,8),   1.0, john,   "approved", "Severe headache and low BP"),
            (priya,  pto,    (priya.id,pto.id),    date(2026,3,1),   date(2026,3,2),   2.0, aarav,  "approved", "Delhi → Jaipur weekend trip"),
            (priya,  casual, (priya.id,casual.id), date(2026,7,15),  date(2026,7,15),  1.0, aarav,  "approved", "Passport renewal appointment"),
            (pooja,  sick,   (pooja.id,sick.id),   date(2026,1,20),  date(2026,1,20),  1.0, rahul,  "approved", "Common cold and body ache"),
            (pooja,  casual, (pooja.id,casual.id), date(2026,5,10),  date(2026,5,11),  2.0, rahul,  "approved", "Mother's cataract surgery support"),
            (rohan,  pto,    (rohan.id,pto.id),    date(2026,1,26),  date(2026,1,26),  1.0, ananya, "approved", "Republic Day — extended family lunch"),
            (rohan,  casual, (rohan.id,casual.id), date(2026,6,20),  date(2026,6,20),  1.0, ananya, "approved", "Vehicle inspection camp"),
            (shreya, pto,    (shreya.id,pto.id),   date(2026,2,14),  date(2026,2,14),  1.0, ananya, "approved", "Valentine's Day personal time"),
            (shreya, casual, (shreya.id,casual.id),date(2026,5,30),  date(2026,5,31),  2.0, ananya, "approved", "House hunting and lease signing"),
            (ananya, pto,    (ananya.id,pto.id),   date(2025,11,1),  date(2025,11,2),  2.0, sara,   "approved", "Diwali family reunion — Kolkata"),
            (ananya, casual, (ananya.id,casual.id),date(2026,7,4),   date(2026,7,4),   1.0, sara,   "approved", "Brand strategy offsite travel day"),
            (devraj, pto,    (devraj.id,pto.id),   date(2025,10,2),  date(2025,10,4),  3.0, sara,   "approved", "Gandhi Jayanti + weekend Goa trip"),
            (devraj, sick,   (devraj.id,sick.id),  date(2026,6,12),  date(2026,6,12),  1.0, sara,   "approved", "Kidney stone pain — hospital visit"),
            (kavita, casual, (kavita.id,casual.id),date(2026,3,8),   date(2026,3,8),   1.0, devraj, "approved", "Women's Day — local community event"),
            (kavita, sick,   (kavita.id,sick.id),  date(2026,6,25),  date(2026,6,25),  1.0, devraj, "approved", "Dental extraction procedure"),
            (neha,   pto,    (neha.id,pto.id),     date(2026,4,18),  date(2026,4,20),  3.0, sara,   "approved", "Marriage in family — Ahmedabad"),
            (ankita, pto,    (ankita.id,pto.id),   date(2026,2,5),   date(2026,2,5),   1.0, sara,   "approved", "Part-time — scheduled personal day"),
            (sameer, pto,    (sameer.id,pto.id),   date(2026,8,15),  date(2026,8,15),  1.0, sara,   "approved", "Independence Day — hometown"),
            # ── Pending (to_approve) ───────────────────────────────────────
            (neha,   pto,    (neha.id,pto.id),     date(2026,9,21),  date(2026,9,23),  3.0, sara,   "to_approve", "Sister's wedding celebration"),
            (priya,  pto,    (priya.id,pto.id),    date(2026,9,28),  date(2026,9,29),  2.0, aarav,  "to_approve", "Personal work in hometown — Agra"),
            (kavita, casual, (kavita.id,casual.id),date(2026,9,25),  date(2026,9,25),  1.0, devraj, "to_approve", "Apartment shifting — new lease"),
            (arjun,  casual, (arjun.id,casual.id), date(2026,9,30),  date(2026,9,30),  1.0, john,   "to_approve", "Bike RC transfer appointment"),
            (shreya, sick,   (shreya.id,sick.id),  date(2026,9,15),  date(2026,9,16),  2.0, ananya, "to_approve", "Viral fever and throat infection"),
            (amit,   casual, (amit.id,casual.id),  date(2026,9,22),  date(2026,9,22),  1.0, aarav,  "to_approve", "GST filing errands with CA"),
        ]

        taken_tracker: dict[tuple[int,int], float] = {}

        for (emp, ltype, alloc_key, sd, ed, dur, approver, status, reason) in leave_requests_raw:
            alloc = alloc_map.get(alloc_key)
            req = TimeOffRequest(
                employee_id=emp.id,
                time_off_type_id=ltype.id,
                allocation_id=alloc.id if alloc else None,
                start_date=sd, end_date=ed,
                duration_days=dur,
                approver_id=approver.id,
                status=status,
                reason=reason,
            )
            db.add(req)
            if status == "approved" and alloc:
                key = (alloc.employee_id, alloc.time_off_type_id)
                taken_tracker[key] = taken_tracker.get(key, 0.0) + dur

        # Apply taken_days
        for (emp_id, type_id), total_taken in taken_tracker.items():
            alloc = alloc_map.get((emp_id, type_id))
            if alloc:
                alloc.taken_days = total_taken

        await db.flush()

        # ══════════════════════════════════════════════════════════════════════
        # STEP 8 – ATTENDANCE (14 months of daily records)
        # ══════════════════════════════════════════════════════════════════════
        print("🕒  8/9  Attendance (14 months of history + live sessions)...")
        now_utc = datetime.now(timezone.utc)
        today = now_utc.date()

        # Employees on approved PTO today (won't have attendance)
        on_leave_today = set()

        def make_att(emp_id: int, day: date, is_late: bool = False,
                     short_day: bool = False, overtime: bool = False):
            hour_in = 9 + (random.randint(10, 45) / 60.0 if is_late else random.randint(0, 15) / 60.0)
            if short_day:
                hour_out = hour_in + random.uniform(5.5, 7.0)
            elif overtime:
                hour_out = hour_in + random.uniform(9.0, 10.5)
            else:
                hour_out = hour_in + random.uniform(8.0, 8.75)

            ci = datetime(day.year, day.month, day.day,
                          int(hour_in), int((hour_in % 1) * 60), 0,
                          tzinfo=timezone.utc)
            co = datetime(day.year, day.month, day.day,
                          int(hour_out), int((hour_out % 1) * 60), 0,
                          tzinfo=timezone.utc)
            worked = round(hour_out - hour_in - 1.0, 2)  # minus 1h break
            worked = max(worked, 0.0)
            overtime_h = max(0.0, round(worked - 8.0, 2))
            return AttendanceRecord(
                employee_id=emp_id, check_in=ci, check_out=co,
                worked_hours=worked, overtime_hours=overtime_h,
                notes="Biometric check-in" if not is_late else "Slightly late — noted",
            )

        # Build date range: from 14 months ago to yesterday
        start_date = (today - timedelta(days=14 * 30)).replace(day=1)
        date_range = []
        d = start_date
        while d < today:
            if d.weekday() < 5:  # weekday only
                date_range.append(d)
            d += timedelta(days=1)

        att_batch = []
        for day in date_range:
            for emp in all_emps:
                if emp.id in on_leave_today:
                    continue
                # ~4% days absent per employee (random)
                if random.random() < 0.04:
                    continue
                is_late    = random.random() < 0.08
                short_day  = random.random() < 0.05
                overtime   = random.random() < 0.12
                att_batch.append(make_att(emp.id, day, is_late, short_day, overtime))

            # bulk flush every 500 records
            if len(att_batch) >= 500:
                db.add_all(att_batch)
                await db.flush()
                att_batch = []

        if att_batch:
            db.add_all(att_batch)
            await db.flush()

        # ── TODAY: live check-ins for several employees ──────────────────
        if today.weekday() < 5:
            live_checkins = [
                (aarav.id,  9, 15, "Active session — web portal"),
                (tanvi.id,  9, 30, "Active session — frontend workstation"),
                (vikram.id, 8, 58, "Active session — devops terminal"),
                (sameer.id, 9, 5,  "Active session — product standup"),
                (rohan.id,  9, 20, "Active session — CRM"),
            ]
            for (emp_id, h, m, note) in live_checkins:
                db.add(AttendanceRecord(
                    employee_id=emp_id,
                    check_in=datetime(today.year, today.month, today.day, h, m, 0, tzinfo=timezone.utc),
                    check_out=None, worked_hours=0.0, overtime_hours=0.0,
                    notes=note,
                ))
            # Completed today shift
            completed_today = [
                (john.id,   8, 55, 17, 0,  8.08, 0.08, "Completed shift — code review day"),
                (pooja.id,  9,  5, 17, 45, 8.67, 0.67, "Payroll reconciliation completed"),
                (ananya.id, 9, 10, 16, 30, 6.33, 0.0,  "Half-day — external client call afternoon"),
                (priya.id,  9,  0, 18, 15, 8.25, 0.25, "Completed shift — Q3 analysis"),
                (neha.id,   9,  3, 17, 30, 7.45, 0.0,  "Completed shift — interview panel"),
            ]
            for (eid, h_in, m_in, h_out, m_out, wh, ot, note) in completed_today:
                db.add(AttendanceRecord(
                    employee_id=eid,
                    check_in=datetime(today.year, today.month, today.day, h_in, m_in, 0, tzinfo=timezone.utc),
                    check_out=datetime(today.year, today.month, today.day, h_out, m_out, 0, tzinfo=timezone.utc),
                    worked_hours=wh, overtime_hours=ot, notes=note,
                ))
        await db.flush()

        # ══════════════════════════════════════════════════════════════════════
        # STEP 9 – PAYRUNS, PAYSLIPS & PAYSLIP LINES
        # ══════════════════════════════════════════════════════════════════════
        print("💳  9/9  Payruns (14 months) + Payslips + Lines...")

        # Generate 14 monthly payruns: Sep 2025 → Sep 2026 (current)
        # Sep 2025 → Aug 2026 = PAID, Sep 2026 = VALIDATED, Oct 2026 = DRAFT
        payrun_months: list[tuple[date, date, PayrunStatus]] = []
        base = date(2025, 9, 1)
        for i in range(14):
            yr = base.year + (base.month - 1 + i) // 12
            mo = (base.month - 1 + i) % 12 + 1
            d_from = date(yr, mo, 1)
            import calendar
            last_day = calendar.monthrange(yr, mo)[1]
            d_to = date(yr, mo, last_day)
            if d_to < today:
                status = PayrunStatus.PAID
            elif d_from <= today <= d_to:
                status = PayrunStatus.VALIDATED
            else:
                status = PayrunStatus.DRAFT
            payrun_months.append((d_from, d_to, status))

        # All employees who may appear in payslips (includes sameer who joins Apr 2026)
        payslip_emps = [sara, john, ananya, devraj, aarav, rahul,
                        vikram, tanvi, arjun, meera, priya, pooja,
                        amit, rohan, shreya, kavita, neha, ankita, sameer]

        for (d_from, d_to, pr_status) in payrun_months:
            month_label = d_from.strftime("%B %Y")
            payrun = Payrun(
                name=f"{month_label} Salary Payrun",
                salary_structure_id=std_ss.id,
                date_from=d_from, date_to=d_to,
                status=pr_status.value,
            )
            db.add(payrun)
            await db.flush()

            # ── Month-specific salary modifiers ──────────────────────────────
            # Each entry: emp_id → extra_net added for THIS month only
            # This creates organic, non-linear variation across the full chart.
            month_extra: dict[int, Decimal] = {}

            # December 2025 — Year-end performance bonus (+15% net)
            is_bonus_month = (d_from.year == 2025 and d_from.month == 12)

            # April 2026 — Annual increment (cumulative from here on)
            has_increment = (d_from >= date(2026, 4, 1))

            # June 2026 — Mid-year promotions: Vikram → DevOps Lead, Arjun → Senior Backend
            if d_from.year == 2026 and d_from.month == 6:
                month_extra[vikram.id] = Decimal("12000")
                month_extra[arjun.id]  = Decimal("9000")
                month_extra[tanvi.id]  = Decimal("7000")
                month_extra[pooja.id]  = Decimal("6000")

            # July 2026 — Q2 Sales incentive payout (sales + marketing team)
            if d_from.year == 2026 and d_from.month == 7:
                month_extra[rohan.id]  = Decimal("20000")   # commission
                month_extra[shreya.id] = Decimal("14000")
                month_extra[ananya.id] = Decimal("25000")   # director bonus

            # August 2026 — Remote-work infrastructure allowance (engineering team)
            if d_from.year == 2026 and d_from.month == 8:
                month_extra[vikram.id] = Decimal("8000")
                month_extra[arjun.id]  = Decimal("8000")
                month_extra[meera.id]  = Decimal("8000")
                month_extra[john.id]   = Decimal("10000")
                month_extra[tanvi.id]  = Decimal("8000")

            # September 2026 — Q3 retention bonus (senior employees 3+ years)
            if d_from.year == 2026 and d_from.month == 9:
                month_extra[sara.id]   = Decimal("30000")
                month_extra[john.id]   = Decimal("35000")
                month_extra[ananya.id] = Decimal("32000")
                month_extra[devraj.id] = Decimal("28000")
                month_extra[aarav.id]  = Decimal("22000")
                month_extra[rahul.id]  = Decimal("15000")
                month_extra[vikram.id] = Decimal("18000")
                month_extra[priya.id]  = Decimal("14000")
                month_extra[neha.id]   = Decimal("12000")
                month_extra[rohan.id]  = Decimal("15000")


            for emp in payslip_emps:
                contract = emp_contracts.get(emp.id)
                if not contract:
                    continue

                # Skip employee if they haven't joined yet this month
                if contract.start_date > d_from:
                    continue

                base_wage = contract.wage_monthly
                ss_id = contract.salary_structure_id
                is_exec = ss_id == exec_ss.id
                is_part = ss_id == part_ss.id

                # Apply annual increment from April 2026
                wage = base_wage
                if has_increment and emp.id in april_increment:
                    wage = base_wage + april_increment[emp.id]

                basic, hra, allow_amt, allow_name, allow_code, gross, pf, pt, net = \
                    compute_payslip_numbers(wage, is_exec, is_part)

                # December bonus: +15% net for all employees (performance bonus)
                bonus_amt = Decimal("0")
                if is_bonus_month:
                    bonus_amt = (net * Decimal("0.15")).quantize(Decimal("0.01"))
                    net = net + bonus_amt
                    gross = gross + bonus_amt

                # Month-specific extra (promotions, incentives, allowances)
                extra_amt = month_extra.get(emp.id, Decimal("0"))
                extra_label_map = {
                    6: "Mid-Year Promotion Adjustment",
                    7: "Q2 Sales Incentive Payout",
                    8: "Remote Work Infrastructure Allowance",
                    9: "Q3 Retention Bonus",
                }
                extra_label = extra_label_map.get(d_from.month, "Variable Pay")
                if extra_amt > 0:
                    net = net + extra_amt
                    gross = gross + extra_amt

                slip_status = PayslipStatus.DRAFT if pr_status == PayrunStatus.DRAFT else PayslipStatus.DONE

                has_warn = False
                warn_msg = None
                if pr_status == PayrunStatus.VALIDATED and emp.id == shreya.id:
                    has_warn = True
                    warn_msg = "Bank account details unverified — verify before PAID"

                payslip = Payslip(
                    payrun_id=payrun.id,
                    employee_id=emp.id,
                    salary_structure_id=ss_id,
                    contract_id=contract.id,
                    date_from=d_from, date_to=d_to,
                    worked_days=22,
                    basic_wage=basic, gross_wage=gross, net_wage=net,
                    status=slip_status.value,
                    has_warning=has_warn,
                    warning_message=warn_msg,
                )
                db.add(payslip)
                await db.flush()

                # Build payslip lines
                lines = [
                    PayslipLine(payslip_id=payslip.id, rule_name="Basic Salary",     code="BASIC",    category="BASIC",     amount=basic,     sequence=10),
                    PayslipLine(payslip_id=payslip.id, rule_name="House Rent Allow.", code="HRA",      category="ALLOWANCE", amount=hra,       sequence=20),
                    PayslipLine(payslip_id=payslip.id, rule_name=allow_name,          code=allow_code, category="ALLOWANCE", amount=allow_amt, sequence=30),
                    PayslipLine(payslip_id=payslip.id, rule_name="Gross Wage",        code="GROSS",    category="GROSS",     amount=gross,     sequence=40),
                    PayslipLine(payslip_id=payslip.id, rule_name="Provident Fund",    code="PF",       category="DEDUCTION", amount=pf,        sequence=50),
                    PayslipLine(payslip_id=payslip.id, rule_name="Professional Tax",  code="PT",       category="DEDUCTION", amount=pt,        sequence=60),
                    PayslipLine(payslip_id=payslip.id, rule_name="Net Salary",        code="NET",      category="NET",       amount=net,       sequence=70),
                ]
                if bonus_amt > 0:
                    lines.append(PayslipLine(
                        payslip_id=payslip.id,
                        rule_name="Year-End Performance Bonus",
                        code="BONUS", category="ALLOWANCE",
                        amount=bonus_amt, sequence=35,
                    ))
                if extra_amt > 0:
                    lines.append(PayslipLine(
                        payslip_id=payslip.id,
                        rule_name=extra_label,
                        code="EXTRA", category="ALLOWANCE",
                        amount=extra_amt, sequence=36,
                    ))
                db.add_all(lines)


        await db.commit()

        # ── Summary ──────────────────────────────────────────────────────
        print("\n" + "═" * 65)
        print("🎉  DATABASE SEEDED SUCCESSFULLY — PeoplePay ERP is LIVE!")
        print("═" * 65)
        print("\n🔑  Login Credentials  (password for all: Password123!)")
        print("─" * 65)
        creds = [
            ("Admin",           "admin@oxp.com",          "System Administrator"),
            ("HR Manager",      "hr@oxp.com",             "Sara Khan"),
            ("Payroll Admin",   "payroll@oxp.com",        "Rahul Verma"),
            ("Payroll User",    "payroll.user@oxp.com",   "Pooja Joshi"),
            ("Employee",        "aarav@oxp.com",          "Aarav Mehta   (Finance Manager)"),
            ("Employee",        "john@oxp.com",           "John Dsouza   (Lead Developer)"),
            ("Employee",        "ananya@oxp.com",         "Ananya Sen    (Marketing Director)"),
            ("Employee",        "vikram@oxp.com",         "Vikram Malhotra (DevOps)"),
            ("Employee",        "tanvi@oxp.com",          "Tanvi Deshmukh (UI/UX)"),
            ("Employee",        "arjun@oxp.com",          "Arjun Nair    (Backend Eng.)"),
            ("Employee",        "rohan@oxp.com",          "Rohan Iyer    (Sales)"),
            ("Employee",        "neha@oxp.com",           "Neha Patel    (Recruiter)"),
            ("Employee",        "ankita@oxp.com",         "Ankita Joshi  (Part-Time HRBP)"),
            ("Employee",        "sameer@oxp.com",         "Sameer Shaikh (Product Manager)"),
            ("Employee",        "shreya@oxp.com",         "Shreya Pandey (Brand Strategist)"),
            ("Employee",        "devraj@oxp.com",         "Devraj Mukherjee (Ops Head)"),
            ("Employee",        "kavita@oxp.com",         "Kavita Rao    (Logistics)"),
            ("Employee",        "priya@oxp.com",          "Priya Sharma  (Financial Analyst)"),
            ("Employee",        "meera@oxp.com",          "Meera Krishnan (QA Lead)"),
            ("Employee",        "amit@oxp.com",           "Amit Chaudhary (Accounts)"),
        ]
        for role, email, name in creds:
            print(f"  {role:<16} {email:<30} {name}")
        print("─" * 65)
        print("\n📊  Seed Stats:")
        print(f"  • Users:          {len(users_raw)}")
        print(f"  • Departments:    6")
        print(f"  • Employees:      {len(all_emps)}")
        print(f"  • Schedules:      3")
        print(f"  • Salary structs: 3  (Standard / Executive / Part-Time)")
        print(f"  • Contracts:      {len(emp_contracts) + 4}  (running + 4 historical/expiring)")
        print(f"  • Leave types:    5")
        print(f"  • Leave allocs:   {len(alloc_map)}")
        print(f"  • Leave requests: {len(leave_requests_raw)}")
        print(f"  • Payruns:        14  (Sep 2025 → Sep 2026)")
        print(f"  • Payslips:       {14 * len(payslip_emps)}  (14 months × {len(payslip_emps)} employees)")
        print(f"  • Attendance:     ~14 months of daily records")
        print("\n✅  App is ready — start frontend at http://localhost:5173\n")


if __name__ == "__main__":
    asyncio.run(seed_data())
