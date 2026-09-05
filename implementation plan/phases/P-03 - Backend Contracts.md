# P-03: Backend Contracts

**Owner:** Rohit  
**Goal:** Employee contracts backend logic.

## Tasks
1. **Model:** Create `app/models/contract.py` (`Contract` model). Link it to `Employee`, `Department`, and `WorkingSchedule`. Include a nullable `salary_structure_id` (use_alter=True).
2. **Logic:** Auto-generate contract references format: `CON/YYYY/0001` upon creation.
3. **Routes:** Create `app/api/contracts/routes.py` with CRUD endpoints.
4. **Status compute:** On read, if `end_date` is in the past and status is `running`, optionally treat as `expired`.
5. **Migration:** Generate and apply migration.

**Build Prompt for AI:**
> Implement P-03. Create Contract model and API routes. Add logic to auto-generate contract reference numbers. Generate Alembic migration.
