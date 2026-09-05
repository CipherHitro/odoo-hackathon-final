# P-08: Backend Dashboard & Seeding

**Owner:** Nigam  
**Goal:** Aggregations and demo data.

## Tasks
1. **Dashboard Route:** Create `GET /payroll/dashboard`. Query the DB to aggregate: Total Payroll, Average Salary, Time Off count, missing contract alerts, and charts data (salary by department, 6-month trend).
2. **Seed Script:** Create `backend/seed.py`. Write a comprehensive, idempotent script that creates users, employees, structures, rules, contracts, and attendance history so the dashboard looks populated immediately.

**Build Prompt for AI:**
> Implement P-08. Create the /payroll/dashboard endpoint with real SQL aggregations. Create a robust seed.py script that populates the database with realistic demo data across all modules.
