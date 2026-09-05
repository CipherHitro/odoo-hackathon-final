# PeoplePay360 — HR & Payroll System

A full-stack HR and Payroll web application built for the Odoo Hackathon.  
FastAPI + PostgreSQL backend · React frontend · JWT auth (httpOnly cookies)

---

## What it does

- **Employee & Contract Management** — Kanban/List views, full employee profiles, contract history
- **Working Schedules** — define weekly patterns with day-level hour configuration
- **Attendance Tracking** — check-in/check-out via a navbar widget, record management
- **Time Off** — leave types, allocations, approval workflow, balance tracking
- **Payroll** — payruns, per-employee payslips computed from salary structures and rules, PDF export
- **Payroll Dashboard** — live KPIs, salary trends, attendance overview, payroll alerts

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Backend | FastAPI, SQLAlchemy (async), asyncpg, Alembic, Redis, Pydantic v2 |
| Database | PostgreSQL |
| Auth | JWT (httpOnly cookie `access_token`), OTP password reset via Resend |
| Frontend | React, React Router, Vite, Recharts |
| Package management | `uv` (backend), `npm` (frontend) |

---

## Quick Start (from a clean clone, ~5 minutes)

### Prerequisites
- Docker + Docker Compose
- Python 3.11+, `uv` installed
- Node.js 20+

### 1. Start the database

```bash
cd backend
docker compose up -d
```

### 2. Configure environment

```bash
cp .env.example .env
# Fill in JWT_SECRET_KEY, RESEND_API_KEY, RESEND_FROM_EMAIL
# DATABASE_URL defaults to: postgresql+asyncpg://postgres:postgres@localhost:5433/odoo_hackathon
```

### 3. Run migrations

```bash
uv run alembic upgrade head
```

### 4. (Optional) Seed demo data

```bash
uv run python seed.py
```

### 5. Start the backend

```bash
uv run fastapi dev
# Runs on http://localhost:8000
```

### 6. Start the frontend

```bash
cd ../frontend
npm install
npm run dev
# Runs on http://localhost:5173
```

### 7. Open the app

Navigate to `http://localhost:5173` and log in with the seeded admin credentials.

---

## Project Structure

```
last dance/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── __init__.py          # auto-include router pattern
│   │   │   ├── deps.py              # get_current_user dependency
│   │   │   ├── users/               # auth routes (EXISTING)
│   │   │   ├── employees/           # Phase 1
│   │   │   ├── departments/         # Phase 1
│   │   │   ├── working_schedules/   # Phase 1
│   │   │   ├── contracts/           # Phase 3
│   │   │   ├── attendance/          # Phase 3
│   │   │   ├── time_off/            # Phase 4
│   │   │   └── payroll/             # Phase 5
│   │   ├── core/
│   │   │   ├── config.py            # pydantic-settings
│   │   │   ├── database.py          # async engine + session
│   │   │   ├── security.py          # JWT, password hashing, OTP
│   │   │   ├── cookies.py           # set/clear auth cookie
│   │   │   ├── rbac.py              # Phase 0 role-check dependency
│   │   │   └── redis.py             # Redis client
│   │   ├── models/                  # SQLAlchemy models
│   │   ├── schemas/                 # Pydantic schemas
│   │   └── services/
│   │       ├── email/               # Resend email service
│   │       └── payroll_engine.py    # Phase 5 salary computation
│   ├── migrations/
│   ├── main.py
│   ├── seed.py
│   ├── docker-compose.yml
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── api/                     # one file per backend module
│   │   ├── components/
│   │   │   ├── layout/              # Navbar, AppLayout, AttendanceWidget
│   │   │   └── ui/                  # Badge, Table, Button, SearchInput
│   │   ├── pages/
│   │   │   ├── auth/                # Login (AuthCard — EXISTING)
│   │   │   ├── employees/
│   │   │   ├── contracts/
│   │   │   ├── attendance/
│   │   │   ├── schedules/
│   │   │   ├── timeoff/
│   │   │   └── payroll/
│   │   ├── App.jsx
│   │   └── index.css                # design tokens from DESIGN.md
│   └── vite.config.js
├── context/                         # hackathon reference screenshots + PDF
└── implementation/                  # this plan
    ├── DATABASE_SCHEMA.md
    ├── API_ARCHITECTURE.md
    ├── DESIGN.md
    ├── PHASES.md
    └── README.md
```

---

## Team Ownership

| Phase | Owner | Feature | Round |
|-------|-------|---------|-------|
| 0-A | Dhanesh | Backend foundation + RBAC + router auto-include | 0 |
| 0-B | Rohit | Frontend scaffold + design tokens + shared components | 0 |
| 0-C | Nigam | Dev environment + seed data stub | 0 |
| 1 | Dhanesh | Employees, Departments, Working Schedules backend | 1 |
| 2 | Rohit | Employees + Contracts frontend | 1 |
| 3 | Nigam | Contracts + Attendance backend + frontend | 1 |
| 4 | Rohit | Time Off backend + frontend | 2 |
| 5 | Dhanesh | Payroll Structures + Payruns + Payslips backend | 2 |
| 6 | Nigam | Payroll UI (Payruns, Payslips, Structures, Rules) | 2 |
| 7 | All | Dashboard + bug bash + demo prep | 3 |

---

## Branch & PR Conventions

```
main          ← demo-ready only; only integrator touches this
dev           ← integration target; merge after each round
feature/<slug>  ← individual phase branches
```

- One branch per phase (see PHASES.md for branch names)
- Merge order within a round: Backend phase first, then frontend phases
- Integrator role rotates: Round 1 → Nigam, Round 2 → Dhanesh, Round 3 → Rohit
- No force-pushes to `dev` or `main`
- Never edit a shared file (`main.py`, `App.jsx`) directly — use the auto-include patterns

---

## Planning Documents

| Document | Purpose |
|----------|---------|
| [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) | All tables, columns, relationships, ER diagram |
| [API_ARCHITECTURE.md](./API_ARCHITECTURE.md) | Every endpoint — method, path, schemas, status codes |
| [DESIGN.md](./DESIGN.md) | Typography, color system, components, CSS token block |
| [PHASES.md](./PHASES.md) | Phased build plan with per-phase build prompts |

---

## Assumptions & Open Questions

1. **Hackathon duration** assumed to be ~1 day remaining (~22 effective build hours for 3 people).
2. **Team members** assumed to be Dhanesh, Rohit, Nigam — all capable of full-stack work.
3. **No real-time requirements** — no WebSockets needed; polling or manual refresh is fine.
4. **Payroll Python formula evaluation** — using Python `eval()` with a sandboxed context dict (`categories` mapping code → computed amount). Acceptable for a hackathon; not production-safe.
5. **PDF generation** — assumed `weasyprint` or `reportlab` can be added to `pyproject.toml`. If it causes dependency issues, skip PDF and just show the computation table on-screen.
6. **User management (admin creates accounts)** — in Phase 0 we auto-assign ADMIN to the first registered user. For the demo this is sufficient. A full user management UI (Phase 0-B spec) can be cut if time is short.
7. **Email OTP** — already works via Resend. For local dev, the OTP still prints to the backend terminal.
8. **No multi-company support** — `company` is a plain string field, not a normalized table. The demo uses "My Company" everywhere.
9. **Attendance "Absent" status** — computed at query time (any employee without a check-in record for a given day = Absent), not stored as a row.
10. **`department.manager_id` circular FK** — departments and employees reference each other. In Alembic, add the `manager_id` FK column after the employees table is created (second migration for that column, or use `ALTER TABLE`).
