# PHASES.md — PeoplePay360 HR & Payroll (Sequential Backend-First Approach)

Team: **Dhanesh / Rohit / Nigam**  
Strategy: **Backend First, Frontend Second**. We will build the entire API, database schema, and business logic before moving to the React frontend. This ensures a robust API contract and prevents frontend blocking.

---

## PART 1: BACKEND API & DATABASE

All backend work happens in the `backend/` directory using FastAPI, SQLAlchemy (async), and Alembic.

### P-01: Backend Foundation (Owner: Dhanesh)
- **Goal:** Set up RBAC and auto-routing.
- Add `role` and `is_active` to existing `User` model.
- Create `app/api/__init__.py` with auto-router logic.
- Create `app/core/rbac.py` for role-based dependencies (`require_hr`, `require_admin`).
- Initial Alembic migration.

### P-02: Backend Core HR (Owner: Dhanesh/Nigam)
- **Goal:** Departments, Working Schedules, and Employees.
- Create models: `Department`, `WorkingSchedule`, `ScheduleLine`, `Employee`.
- Self-referential manager FKs and circular Department FKs.
- CRUD routes under `/api/employees`, `/api/departments`, `/api/working_schedules`.

### P-03: Backend Contracts (Owner: Rohit)
- **Goal:** Employee contracts and salary linkage.
- Create `Contract` model.
- Logic to auto-generate contract references (`CON/2026/0001`).
- CRUD routes under `/api/contracts`.

### P-04: Backend Attendance (Owner: Nigam)
- **Goal:** Time tracking and check-in/out logic.
- Create `AttendanceRecord` model.
- Endpoints: `POST /attendance/check-in`, `POST /attendance/check-out` with hours calculation.
- Status endpoint `GET /attendance/widget` for frontend polling.

### P-05: Backend Time Off (Owner: Rohit)
- **Goal:** Leave management and balances.
- Create models: `TimeOffType`, `TimeOffAllocation`, `TimeOffRequest`.
- Logic: Validating if balance exists before allowing a request.
- Logic: Deducting balance when a request is approved.

### P-06: Backend Payroll Config (Owner: Dhanesh)
- **Goal:** Salary structures and rules.
- Create models: `SalaryStructure`, `SalaryRule`.
- Sequence-based rules (Fixed, Percentage, Python Code).

### P-07: Backend Payroll Engine (Owner: Dhanesh)
- **Goal:** Payruns and Payslip generation.
- Create models: `Payrun`, `Payslip`, `PayslipLine`.
- Implement `payroll_engine.py`: evaluating rule sequences and generating line items based on contract wages and attendance.
- Status transitions for Payruns (Draft -> Validated -> Paid).

### P-08: Backend Dashboard & Seeding (Owner: Nigam)
- **Goal:** Aggregations and demo data.
- Create `/payroll/dashboard` endpoint returning KPIs and charts.
- Build `seed.py` to populate DB with users, employees, schedules, contracts, attendance, time-off, and payruns for a complete demo state.

---

## PART 2: FRONTEND UI & REACT

All frontend work happens in the `frontend/` directory using React, Vite, and CSS variables.

### P-09: Frontend Foundation (Owner: Rohit)
- **Goal:** Scaffold the app.
- Implement CSS design tokens in `index.css`.
- Build `api/client.js` for authenticated API calls.
- Build shared UI: `Navbar`, `AppLayout`, `Table`, `Badge`, `Button`.

### P-10: Frontend Core HR (Owner: Rohit)
- **Goal:** Employee management UI.
- Kanban and List views for Employees.
- Employee Profile form with smart button counters.
- Department and Working Schedule configuration screens.

### P-11: Frontend Contracts (Owner: Nigam)
- **Goal:** Contract history UI.
- Contracts list view highlighting active/expired.
- Contract creation form with auto-formatted wage fields.

### P-12: Frontend Attendance (Owner: Nigam)
- **Goal:** Check-in widget and logs.
- Build the Navbar Check In / Check Out widget with live polling.
- Attendance history table.

### P-13: Frontend Time Off (Owner: Rohit)
- **Goal:** Leave request flow.
- Allocations list showing `Allocated / Taken / Remaining` math.
- Time off requests list with inline Approve/Refuse buttons.

### P-14: Frontend Payroll Config (Owner: Dhanesh)
- **Goal:** Salary rule management.
- Salary Structures list.
- Embedded, sortable table for editing Salary Rules by sequence.

### P-15: Frontend Payroll Operations (Owner: Dhanesh)
- **Goal:** Payrun multi-step flow.
- Payruns list. Payrun Detail screen with complex state buttons (Compute, Validate, Pay).
- Employee selector modal for Payruns.
- Payslip detail view showing the computed lines and warnings.

### P-16: Frontend Dashboard & Polish (Owner: All)
- **Goal:** The final Wow factor.
- Implement Recharts for Salary by Department (Bar) and Payroll Trend (Line).
- Display actionable Alerts panel.
- UI consistency pass (colors, spacing, phrasing).
