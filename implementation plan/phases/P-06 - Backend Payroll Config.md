# P-06: Backend Payroll Configuration

**Owner:** Dhanesh  
**Goal:** Salary structures and rules.

## Tasks
1. **Models:** Create `SalaryStructure` and `SalaryRule` in `app/models/payroll.py`.
2. **Fields:** Rule types (fixed, percentage, code), sequence integer, categories (BASIC, GROSS, NET).
3. **Routes:** CRUD routes in `app/api/payroll/routes.py` (just for structures and rules).

**Build Prompt for AI:**
> Implement P-06. Create SalaryStructure and SalaryRule models. Build CRUD endpoints. Generate Alembic migration.
