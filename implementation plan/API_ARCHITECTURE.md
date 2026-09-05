# API_ARCHITECTURE.md — PeoplePay360 HR & Payroll

---

## Conventions

- **Base path:** All routes use no global prefix. Auth routes use `/auth/...`; new feature routes use `/employees/...`, `/contracts/...`, etc.
- **Auth:** JWT stored in httpOnly cookie `access_token`. Protected routes resolved via `Depends(get_current_user)`.
- **Error shape** (all endpoints, consistent): `{"detail": "Human-readable error message"}`
- **Pagination** (all list endpoints): `?skip=0&limit=50` query params; response: `{"items": [...], "total": int}`
- **Status codes:** 200 OK, 201 Created, 204 No Content, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 409 Conflict

---

## Module 0 — Auth (EXISTING)

| Method | Path | Auth | Status |
|--------|------|------|--------|
| POST | `/auth/register` | No | EXISTING |
| POST | `/auth/login` | No | EXISTING |
| GET | `/auth/me` | Yes | EXISTING |
| POST | `/auth/logout` | No | EXISTING |
| POST | `/auth/forgot-password` | No | EXISTING |
| POST | `/auth/verify-otp` | No | EXISTING |
| POST | `/auth/reset-password` | No | EXISTING |

**`POST /auth/register`** `EXISTING`  
Request: `{name: str, email: str, password: str}` | Response 201: `{message: str, user: {id, name, email}}`

**`POST /auth/login`** `EXISTING`  
Request: `{email: str, password: str}` | Response 200: `{message: str, user: {id, name, email}}` + cookie set

**`GET /auth/me`** `EXISTING` *(MODIFIED: response will now include `role` and `is_active`)*  
Response 200: `{id, name, email, role, is_active}`

### EXISTING → MODIFIED: `/auth/register`

Since user accounts are now **admin-only creation** per the spec, register should be gated by an admin role in future. For hackathon: first user gets ADMIN role automatically; subsequent creation via a new admin endpoint only.

---

## Module 1 — User Management (NEW — Admin Only)

**`GET /users`** `NEW` Auth: ADMIN  
Response 200: `{items: [{id, name, email, role, is_active, employee_id}], total: int}`

**`POST /users`** `NEW` Auth: ADMIN  
Request: `{employee_id: int, work_email: str, roles: list[str], is_active: bool}`  
Response 201: `{id, name, email, role, is_active}`

**`PATCH /users/{user_id}`** `NEW` Auth: ADMIN  
Request: `{role?: str, is_active?: bool}`  
Response 200: `{id, name, email, role, is_active}`

---

## Module 2 — Departments (NEW)

**`GET /departments`** `NEW` Auth: Yes  
Query: `?skip&limit` | Response 200: `{items: [{id, name, manager_id, manager_name, employee_count}], total}`

**`POST /departments`** `NEW` Auth: HR_MANAGER | ADMIN  
Request: `{name: str, manager_id?: int}` | Response 201: `{id, name, manager_id}`

**`GET /departments/{id}`** `NEW` Auth: Yes  
Response 200: `{id, name, manager_id, manager_name}`

**`PATCH /departments/{id}`** `NEW` Auth: HR_MANAGER | ADMIN  
Request: `{name?: str, manager_id?: int}` | Response 200: dept object

**`DELETE /departments/{id}`** `NEW` Auth: ADMIN  
Response 204

---

## Module 3 — Working Schedules (NEW)

**`GET /working-schedules`** `NEW` Auth: Yes  
Response 200: `{items: [{id, name, days_per_week, hours_per_week, company, is_active}], total}`

**`POST /working-schedules`** `NEW` Auth: HR_MANAGER | ADMIN  
Request: `{name: str, company: str, timezone: str, days_per_week: int, hours_per_week: float, schedule_lines: [{day_of_week, start_time, end_time, break_hours}]}`  
Response 201: full schedule with lines

**`GET /working-schedules/{id}`** `NEW` Auth: Yes  
Response 200: `{id, name, ..., schedule_lines: [...]}`

**`PATCH /working-schedules/{id}`** `NEW` Auth: HR_MANAGER | ADMIN  
Request: `{name?: str, is_active?: bool, schedule_lines?: [...]}` (lines: full replace)  
Response 200: full schedule object

---

## Module 4 — Employees (NEW)

**`GET /employees`** `NEW` Auth: Yes  
Query: `?skip&limit&search&department_id&status`  
Response 200: `{items: [{id, name, job_position, department_name, work_email, status}], total}`

**`POST /employees`** `NEW` Auth: HR_MANAGER | ADMIN  
Request: `{name: str, job_position?: str, department_id?: int, manager_id?: int, work_location?: str, work_email?: str, phone?: str, company?: str, working_schedule_id?: int, status?: str}`  
Response 201: full employee object

**`GET /employees/{id}`** `NEW` Auth: Yes  
Response 200: `{id, name, job_position, department, manager, work_location, work_email, phone, company, working_schedule, status, user_id, contract_count, attendance_count, time_off_count}`

**`PATCH /employees/{id}`** `NEW` Auth: HR_MANAGER | ADMIN  
Request: any subset of employee fields  
Response 200: full employee object

**`DELETE /employees/{id}`** `NEW` Auth: ADMIN  
Response 204

**`GET /employees/{id}/contracts`** `NEW` Auth: Yes  
Response 200: `{items: [{id, reference, start_date, end_date, wage_monthly, status}], total}`

**`GET /employees/{id}/attendance`** `NEW` Auth: Yes  
Query: `?date_from&date_to`  
Response 200: `{items: [attendance_record], total}`

**`GET /employees/{id}/time-off`** `NEW` Auth: Yes  
Response 200: `{requests: [...], allocations: [...]}`

---

## Module 5 — Contracts (NEW)

**`GET /contracts`** `NEW` Auth: HR_PAYROLL_USER | ADMIN  
Query: `?skip&limit&search&employee_id&status`  
Response 200: `{items: [{id, reference, employee_name, start_date, end_date, wage_monthly, status}], total}`

**`POST /contracts`** `NEW` Auth: HR_PAYROLL_USER | ADMIN  
Request: `{employee_id: int, start_date: date, end_date?: date, wage_monthly: decimal, job_position?: str, working_schedule_id?: int, salary_structure_id?: int, notes?: str}`  
Response 201: full contract object with auto-generated `reference`

**`GET /contracts/{id}`** `NEW` Auth: Yes  
Response 200: full contract object with employee, department, schedule details

**`PATCH /contracts/{id}`** `NEW` Auth: HR_PAYROLL_USER | ADMIN  
Request: any subset of contract fields  
Response 200: full contract object

---

## Module 6 — Attendance (NEW)

**`GET /attendance`** `NEW` Auth: Yes  
Query: `?skip&limit&employee_id&date_from&date_to`  
Response 200: `{items: [{id, employee_name, check_in, check_out, worked_hours, status}], total}`  
Status is derived: Present (check_in exists), Absent (no check_in for that day)

**`POST /attendance`** `NEW` Auth: HR_MANAGER | ADMIN  
Request: `{employee_id: int, check_in: datetime, check_out?: datetime, notes?: str}`  
Response 201: attendance record with `worked_hours` auto-computed

**`GET /attendance/{id}`** `NEW` Auth: Yes  
Response 200: `{id, employee, check_in, check_out, worked_hours, overtime_hours, status, notes}`

**`PATCH /attendance/{id}`** `NEW` Auth: HR_MANAGER | ADMIN  
Request: `{check_in?: datetime, check_out?: datetime, notes?: str}`  
Response 200: updated attendance record with recalculated `worked_hours`

**`POST /attendance/check-in`** `NEW` Auth: Yes (self-service)  
No body needed (user resolved from cookie → employee)  
Response 201: `{id, check_in, message: "Checked in successfully"}`  
Error 409 if already checked in

**`POST /attendance/check-out`** `NEW` Auth: Yes (self-service)  
No body needed  
Response 200: `{id, check_out, worked_hours, message: "Checked out"}`  
Error 400 if not checked in

**`GET /attendance/widget`** `NEW` Auth: Yes  
Response 200: `{is_checked_in: bool, check_in_time?: str, elapsed_hours?: float, today_worked_hours: float}`

---

## Module 7 — Time Off (NEW)

**`GET /time-off/types`** `NEW` Auth: Yes  
Response 200: `{items: [{id, name, unit, requires_allocation, approval, display_color, is_active}], total}`

**`POST /time-off/types`** `NEW` Auth: HR_MANAGER | ADMIN  
Request: `{name: str, unit: str, requires_allocation: bool, approval: str, display_color?: str, notes?: str}`  
Response 201: time off type object

**`PATCH /time-off/types/{id}`** `NEW` Auth: HR_MANAGER | ADMIN  
Request: any subset  
Response 200: updated type object

**`GET /time-off/allocations`** `NEW` Auth: Yes  
Query: `?skip&limit&employee_id&type_id&status`  
Response 200: `{items: [{id, employee_name, type_name, allocated_days, taken_days, remaining_days, status}], total}`

**`POST /time-off/allocations`** `NEW` Auth: HR_MANAGER | ADMIN  
Request: `{employee_id: int, time_off_type_id: int, allocated_days: float, validity_label?: str, description?: str}`  
Response 201: allocation object

**`POST /time-off/allocations/{id}/approve`** `NEW` Auth: HR_MANAGER | ADMIN  
Response 200: `{message: "Allocation approved"}`, `status` → "approved"

**`POST /time-off/allocations/{id}/refuse`** `NEW` Auth: HR_MANAGER | ADMIN  
Response 200: `{message: "Allocation refused"}`

**`GET /time-off/requests`** `NEW` Auth: Yes  
Query: `?skip&limit&employee_id&type_id&status&my_team=bool`  
Response 200: `{items: [{id, employee_name, type_name, start_date, end_date, duration_days, status}], total}`

**`POST /time-off/requests`** `NEW` Auth: Yes  
Request: `{employee_id: int, time_off_type_id: int, start_date: date, end_date: date, reason?: str}`  
Response 201: request object with computed `duration_days`  
Error 400 if insufficient balance (for allocation-required types)

**`POST /time-off/requests/{id}/approve`** `NEW` Auth: HR_MANAGER | ADMIN  
Response 200: `{message: "Request approved"}`  
Side-effect: if type requires allocation, decrement `taken_days` on the linked allocation

**`POST /time-off/requests/{id}/refuse`** `NEW` Auth: HR_MANAGER | ADMIN  
Response 200: `{message: "Request refused"}`

---

## Module 8 — Payroll Configuration (NEW)

**`GET /payroll/structures`** `NEW` Auth: HR_PAYROLL_USER | ADMIN  
Response 200: `{items: [{id, name, is_active, rule_count, employee_count}], total}`

**`POST /payroll/structures`** `NEW` Auth: HR_PAYROLL_ADMIN | ADMIN  
Request: `{name: str, notes?: str}`  
Response 201: structure object

**`GET /payroll/structures/{id}`** `NEW` Auth: HR_PAYROLL_USER | ADMIN  
Response 200: `{id, name, is_active, salary_rules: [...]}`

**`GET /payroll/rules`** `NEW` Auth: HR_PAYROLL_USER | ADMIN  
Query: `?structure_id`  
Response 200: `{items: [{id, name, code, category, sequence, computation, salary_structure_name}], total}`

**`POST /payroll/rules`** `NEW` Auth: HR_PAYROLL_ADMIN | ADMIN  
Request: `{salary_structure_id: int, name: str, code: str, category: str, sequence: int, computation: str, fixed_amount?: decimal, percentage?: float, percentage_base?: str, python_code?: str}`  
Response 201: salary rule object

**`PATCH /payroll/rules/{id}`** `NEW` Auth: HR_PAYROLL_ADMIN | ADMIN  
Request: any subset  
Response 200: updated rule

---

## Module 9 — Payruns & Payslips (NEW)

**`GET /payroll/payruns`** `NEW` Auth: HR_PAYROLL_USER | ADMIN  
Query: `?skip&limit&year&status`  
Response 200: `{items: [{id, name, date_from, date_to, payslip_count, status, warning_count}], total}`

**`POST /payroll/payruns`** `NEW` Auth: HR_PAYROLL_ADMIN | ADMIN  
Request: `{salary_structure_id: int, date_from: date, date_to: date, name: str}`  
Response 201: payrun object

**`GET /payroll/payruns/{id}`** `NEW` Auth: HR_PAYROLL_USER | ADMIN  
Response 200: `{id, name, salary_structure, date_from, date_to, status, payslips: [{id, employee_name, worked_days, basic_wage, gross_wage, net_wage, status, has_warning, warning_message}]}`

**`POST /payroll/payruns/{id}/add-employees`** `NEW` Auth: HR_PAYROLL_ADMIN | ADMIN  
Request: `{employee_ids: list[int]}`  
Response 200: `{created_payslip_count: int, payslips: [...]}`

**`POST /payroll/payruns/{id}/compute`** `NEW` Auth: HR_PAYROLL_ADMIN | ADMIN  
No body. Computes all draft payslips in the payrun using salary rules from the active contract.  
Response 200: `{computed: int, warnings: int}`

**`POST /payroll/payruns/{id}/validate`** `NEW` Auth: HR_PAYROLL_ADMIN | ADMIN  
Response 200: `{message: "Payrun validated"}`, status → "validated"

**`POST /payroll/payruns/{id}/mark-paid`** `NEW` Auth: HR_PAYROLL_ADMIN | ADMIN  
Response 200: `{message: "Payrun marked as paid"}`, status → "paid"

**`GET /payroll/payslips`** `NEW` Auth: HR_PAYROLL_USER | ADMIN  
Query: `?skip&limit&payrun_id&employee_id&period`  
Response 200: `{items: [{id, employee_name, period, basic_wage, gross_wage, net_wage, salary_structure_name, status}], total}`

**`GET /payroll/payslips/{id}`** `NEW` Auth: HR_PAYROLL_USER | ADMIN  
Response 200: `{id, employee, period, salary_structure, payrun, worked_days, lines: [{rule_name, code, category, amount, sequence}], basic_wage, gross_wage, net_wage, status}`

**`POST /payroll/payslips/{id}/compute`** `NEW` Auth: HR_PAYROLL_ADMIN | ADMIN  
Response 200: recomputed payslip with updated lines

**`GET /payroll/payslips/{id}/pdf`** `NEW` Auth: HR_PAYROLL_USER | ADMIN  
Response: PDF file stream (Content-Type: application/pdf)

---

## Module 10 — Payroll Dashboard (NEW)

**`GET /payroll/dashboard`** `NEW` Auth: HR_PAYROLL_USER | ADMIN  
Query: `?period&department_id&employee_type&company`  
Response 200:
```json
{
  "kpis": {
    "total_net_salary": number,
    "payslips_generated": number,
    "paid_count": number,
    "pending_count": number,
    "avg_salary": number,
    "approved_time_off_days": number,
    "attendance_health_pct": number
  },
  "salary_by_department": [{"department": str, "total": number}],
  "monthly_salary_trend": [{"month": str, "total_net": number}],
  "payslip_status": {"paid": int, "done": int, "pending": int, "warning": int},
  "alerts": [{"type": str, "message": str}],
  "attendance_overview": {"present": int, "late": int, "absent": int, "overtime_hours": float, "missing_checkouts": int},
  "time_off_overview": [{"type_name": str, "approved_days": float, "pending_count": int, "remaining_balance": float}],
  "department_overview": [{"department": str, "headcount": int, "monthly_salary": number}]
}
```
