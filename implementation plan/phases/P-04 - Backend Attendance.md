# P-04: Backend Attendance

**Owner:** Nigam  
**Goal:** Time tracking and check-in/out logic.

## Tasks
1. **Model:** Create `app/models/attendance.py` (`AttendanceRecord` model).
2. **Routes:** `app/api/attendance/routes.py`.
3. **Check-In/Out:** `POST /attendance/check-in` (errors if already checked in today) and `POST /attendance/check-out` (calculates `worked_hours` based on time diff).
4. **Widget State:** `GET /attendance/widget` to return current user's active check-in state, check-in time, and today's total hours.

**Build Prompt for AI:**
> Implement P-04. Create AttendanceRecord model. Build check-in, check-out, and widget state endpoints with correct time math. Generate Alembic migration.
