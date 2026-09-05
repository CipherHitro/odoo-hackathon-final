# P-02: Backend Core HR Models & Routes

**Owner:** Dhanesh/Nigam  
**Goal:** Departments, Working Schedules, and Employees backend logic.

## Tasks
1. **Models:** Create `app/models/department.py`, `app/models/working_schedule.py`, and `app/models/employee.py`.
2. **Relationships:** Setup proper FKs. Employee links to Department and WorkingSchedule. Department has a manager (FK to Employee, use_alter=True).
3. **Routes:** Create `app/api/departments/routes.py`, `app/api/working_schedules/routes.py`, `app/api/employees/routes.py`.
4. **Smart Buttons:** On `GET /employees/{id}`, compute and return counts for contracts, attendance, and time off (return 0 for now as tables don't exist yet).
5. **Migration:** Generate and apply migration for these new tables.

**Build Prompt for AI:**
> Implement P-02. Create Department, WorkingSchedule, ScheduleLine, and Employee models with their relationships. Generate Alembic migrations. Create CRUD routes for each under app/api with RBAC.
