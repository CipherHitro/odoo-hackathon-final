import asyncio
from datetime import date
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.core.security import hash_password
from app.models.user import User, UserRole
from app.models.department import Department
from app.models.working_schedule import WorkingSchedule, ScheduleLine
from app.models.employee import Employee, EmployeeStatus

async def seed_database():
    print("[SEED] Starting database seeding...")
    async with AsyncSessionLocal() as db:
        # 1. Working Schedule
        print("  -> Seeding Working Schedule...")
        result = await db.execute(
            select(WorkingSchedule).where(WorkingSchedule.name == "Standard 40 Hours/Week")
        )
        schedule = result.scalar_one_or_none()
        if not schedule:
            schedule = WorkingSchedule(
                name="Standard 40 Hours/Week",
                company="My Company",
                days_per_week=5,
                hours_per_week=40.0,
                timezone="UTC",
                is_active=True
            )
            db.add(schedule)
            await db.flush()

            days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
            for d in days:
                line = ScheduleLine(
                    schedule_id=schedule.id,
                    day_of_week=d,
                    start_time="09:00",
                    end_time="18:00",
                    break_hours=1.0,
                    work_hours=8.0
                )
                db.add(line)
            await db.flush()
            print("     [OK] Created Standard 40 Hours/Week schedule")
        else:
            print("     [OK] Standard schedule already exists")

        # 2. Departments
        print("  -> Seeding Departments...")
        dept_names = ["Finance", "HR", "Engineering", "Sales", "Operations"]
        dept_map = {}
        for dname in dept_names:
            res = await db.execute(select(Department).where(Department.name == dname))
            dept = res.scalar_one_or_none()
            if not dept:
                dept = Department(name=dname)
                db.add(dept)
                await db.flush()
                print(f"     [OK] Created Department '{dname}'")
            dept_map[dname] = dept

        # 3. Users
        print("  -> Seeding Users...")
        default_pwd_hash = hash_password("Password123!")
        users_data = [
            {"email": "nigamvaghani@gmail.com", "name": "Nigam Vaghani", "role": UserRole.HR_MANAGER.value},
            {"email": "aarav@exp.com", "name": "Aarav Mehta", "role": UserRole.EMPLOYEE.value},
            {"email": "sara@exp.com", "name": "Sara Khan", "role": UserRole.HR_PAYROLL_USER.value},
            {"email": "john@exp.com", "name": "John Dsouza", "role": UserRole.EMPLOYEE.value},
            {"email": "neha@exp.com", "name": "Neha Patel", "role": UserRole.EMPLOYEE.value},
        ]
        user_map = {}
        for uinfo in users_data:
            res = await db.execute(select(User).where(User.email == uinfo["email"]))
            user = res.scalar_one_or_none()
            if not user:
                user = User(
                    name=uinfo["name"],
                    email=uinfo["email"],
                    password_hash=default_pwd_hash,
                    role=uinfo["role"],
                    is_active=True
                )
                db.add(user)
                await db.flush()
                print(f"     [OK] Created User '{uinfo['name']}' ({uinfo['email']})")
            else:
                # Update role and password to ensure login works smoothly
                user.role = uinfo["role"]
                user.name = uinfo["name"]
                user.password_hash = default_pwd_hash
                await db.flush()
                print(f"     [OK] Updated User '{uinfo['name']}' ({uinfo['email']}) [Role: {uinfo['role']}]")
            user_map[uinfo["email"]] = user

        # 4. Employees (Exact match to wireframe + clean existing test records)
        print("  -> Seeding Employees...")
        
        # Clean up legacy test employee records (IDs 1-5) to have proper names/departments
        legacy_updates = [
            (1, "Rohan Verma", "QA Engineer", "Engineering"),
            (2, "Priya Sharma", "Financial Analyst", "Finance"),
            (3, "Ananya Iyer", "UX Designer", "Engineering"),
            (4, "Vikram Singh", "Operations Lead", "Operations"),
            (5, "Kabir Mehta", "HR Specialist", "HR"),
        ]
        for lid, lname, lpos, ldept in legacy_updates:
            res = await db.execute(select(Employee).where(Employee.id == lid))
            lemp = res.scalar_one_or_none()
            if lemp and (lemp.name in ["Attendance Tester", "string", "Tester", "TimeOff Employee", "TimeOff Admin"]):
                lemp.name = lname
                lemp.job_position = lpos
                if dept_map.get(ldept):
                    lemp.department_id = dept_map[ldept].id
                lemp.work_location = "Office Campus"
                lemp.company = "My Company"
                await db.flush()
                print(f"     [OK] Normalized legacy employee ID {lid} to '{lname}'")

        employees_data = [
            {
                "name": "Aarav Mehta",
                "work_email": "aarav@exp.com",
                "job_position": "Payroll Specialist",
                "department": "Finance",
                "status": EmployeeStatus.ACTIVE.value,
                "work_location": "Headquarters - Floor 3",
                "phone": "+1 (555) 234-5678",
                "company": "My Company"
            },
            {
                "name": "Sara Khan",
                "work_email": "sara@exp.com",
                "job_position": "HR Officer",
                "department": "HR",
                "status": EmployeeStatus.ACTIVE.value,
                "work_location": "Headquarters - Floor 2",
                "phone": "+1 (555) 345-6789",
                "company": "My Company"
            },
            {
                "name": "John Dsouza",
                "work_email": "john@exp.com",
                "job_position": "Developer",
                "department": "Engineering",
                "status": EmployeeStatus.ACTIVE.value,
                "work_location": "Innovation Lab",
                "phone": "+1 (555) 456-7890",
                "company": "My Company"
            },
            {
                "name": "Neha Patel",
                "work_email": "neha@exp.com",
                "job_position": "Recruiter",
                "department": "HR",
                "status": EmployeeStatus.ACTIVE.value,
                "work_location": "Headquarters - Floor 2",
                "phone": "+1 (555) 567-8901",
                "company": "My Company"
            },
            {
                "name": "Nigam Vaghani",
                "work_email": "nigamvaghani@gmail.com",
                "job_position": "HR Director",
                "department": "HR",
                "status": EmployeeStatus.ACTIVE.value,
                "work_location": "Executive Suite",
                "phone": "+1 (555) 123-4567",
                "company": "My Company"
            },
        ]

        emp_map = {}
        for edata in employees_data:
            res = await db.execute(select(Employee).where(Employee.work_email == edata["work_email"]))
            emp = res.scalar_one_or_none()
            dept = dept_map.get(edata["department"])
            usr = user_map.get(edata["work_email"])

            if not emp:
                emp = Employee(
                    name=edata["name"],
                    work_email=edata["work_email"],
                    job_position=edata["job_position"],
                    department_id=dept.id if dept else None,
                    status=edata["status"],
                    work_location=edata["work_location"],
                    phone=edata["phone"],
                    company=edata["company"],
                    working_schedule_id=schedule.id if schedule else None,
                    user_id=usr.id if usr else None
                )
                db.add(emp)
                await db.flush()
                print(f"     [OK] Created Employee '{edata['name']}' [{edata['job_position']}]")
            else:
                emp.name = edata["name"]
                emp.job_position = edata["job_position"]
                emp.department_id = dept.id if dept else None
                emp.status = edata["status"]
                emp.work_location = edata["work_location"]
                emp.phone = edata["phone"]
                emp.company = edata["company"]
                emp.working_schedule_id = schedule.id if schedule else None
                emp.user_id = usr.id if usr else None
                await db.flush()
                print(f"     [OK] Updated Employee '{edata['name']}' [{edata['job_position']}]")
            emp_map[edata["work_email"]] = emp

        # Set Department Managers
        if dept_map.get("HR") and emp_map.get("sara@exp.com"):
            dept_map["HR"].manager_id = emp_map["sara@exp.com"].id
        if dept_map.get("Finance") and emp_map.get("aarav@exp.com"):
            dept_map["Finance"].manager_id = emp_map["aarav@exp.com"].id
        if dept_map.get("Engineering") and emp_map.get("john@exp.com"):
            dept_map["Engineering"].manager_id = emp_map["john@exp.com"].id

        await db.commit()
        print("[SUCCESS] Database seeding completed successfully!")

if __name__ == "__main__":
    asyncio.run(seed_database())
