# P-05: Backend Time Off

**Owner:** Rohit  
**Goal:** Leave management and balances.

## Tasks
1. **Models:** Create `app/models/time_off.py` (`TimeOffType`, `TimeOffAllocation`, `TimeOffRequest`).
2. **Routes:** `app/api/time_off/routes.py`.
3. **Balance Validation:** On `POST /time-off/requests`, if the type requires allocation, verify the employee has enough `(allocated_days - taken_days)` in an approved allocation.
4. **Approval Logic:** On `POST /time-off/requests/{id}/approve`, increment the `taken_days` of the linked allocation.

**Build Prompt for AI:**
> Implement P-05. Create Time Off Type, Allocation, and Request models. Build endpoints and implement the exact balance validation and deduction logic. Generate Alembic migration.
