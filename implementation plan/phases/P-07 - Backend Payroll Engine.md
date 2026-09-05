# P-07: Backend Payroll Operations & Engine

**Owner:** Dhanesh  
**Goal:** Payruns, Payslips, and computation engine.

## Tasks
1. **Models:** Add `Payrun`, `Payslip`, and `PayslipLine` to `app/models/payroll.py`.
2. **Engine:** Create `app/services/payroll_engine.py`. This must fetch active contracts, load rules by sequence, and compute line amounts using a sandboxed python `eval()` or fixed calculations.
3. **Routes:** `POST /payroll/payruns/{id}/compute` to trigger the engine.
4. **State Machine:** Endpoints to move Payrun from Draft -> Validated -> Paid.

**Build Prompt for AI:**
> Implement P-07. Add Payrun, Payslip, PayslipLine models. Implement the core payroll computation engine service. Build endpoints to trigger computations and advance payrun statuses. Generate Alembic migration.
