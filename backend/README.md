<div align="center">

# ⚡ PeoplePay Backend — High-Performance Async Payroll & ERP Engine

### *FastAPI • SQLAlchemy 2.0 Async • PostgreSQL • Redis 8 • Alembic • uv*

<br/>

[![Python 3.13](https://img.shields.io/badge/Python%203.13-3776AB?style=flat-square&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![SQLAlchemy 2.0](https://img.shields.io/badge/SQLAlchemy%202.0%20(Async)-D71F00?style=flat-square&logo=sqlalchemy&logoColor=white)](https://www.sqlalchemy.org/)
[![PostgreSQL 16](https://img.shields.io/badge/PostgreSQL%2016-336791?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis 8](https://img.shields.io/badge/Redis%208-DC382D?style=flat-square&logo=redis&logoColor=white)](https://redis.io/)
[![Alembic](https://img.shields.io/badge/Alembic-6BA814?style=flat-square&logo=python&logoColor=white)](https://alembic.sqlalchemy.org/)
[![Astral uv](https://img.shields.io/badge/uv-DE5FE9?style=flat-square&logo=astral&logoColor=white)](https://docs.astral.sh/uv/)
[![Argon2](https://img.shields.io/badge/Argon2id-Security-orange?style=flat-square&logo=1password&logoColor=white)](https://github.com/P-H-C/phc-winner-argon2)
[![Resend](https://img.shields.io/badge/Resend-Async%20Email-black?style=flat-square&logo=resend&logoColor=white)](https://resend.com/)
[![fpdf2](https://img.shields.io/badge/fpdf2-PDF%20Generation-red?style=flat-square&logo=adobe-acrobat-reader&logoColor=white)](https://py-pdf.github.io/fpdf2/)

<p align="center">
  <b>The core computation and business logic layer for PeoplePay ERP. Built with an asynchronous, non-blocking architecture capable of processing thousands of multi-contract payslips, complex salary rules, live attendance tracking, and transactional email dispatches with sub-millisecond overhead.</b>
</p>

</div>

---

## 📑 Table of Contents

- [Architectural Overview](#-architectural-overview)
- [Directory Layout](#-directory-layout)
- [Database Models & Domain Design](#-database-models--domain-design)
- [Prerequisites & Development Setup](#-prerequisites--development-setup)
- [Environment Configuration (`.env`)](#-environment-configuration-env)
- [Database Migrations (Alembic)](#-database-migrations-alembic)
- [Enterprise Data Seeder](#-enterprise-data-seeder)
- [The Payroll Computation Engine](#-the-payroll-computation-engine)
- [Email & OTP Verification Service](#-email--otp-verification-service)
- [PDF Payslip Generation](#-pdf-payslip-generation)
- [REST API Endpoints Reference](#-rest-api-endpoints-reference)
- [Security & Authentication Specs](#-security--authentication-specs)
- [Hackathon Attribution](#-hackathon-attribution)

---

## 🏛️ Architectural Overview

The backend uses a clean, decoupled **Layered Architecture**:

```
Client Request (HTTP/JSON + Cookies)
      │
      ▼
FastAPI Router (`app/api/<domain>/routes.py`)
      │  ◄── RBAC Guard (`app/api/deps.py` - require_roles)
      ▼
Controller Layer (`app/api/<domain>/controller.py`)
      │  ◄── Pydantic Request Validation (`app/schemas/<domain>.py`)
      ▼
Service Layer (`app/api/<domain>/service.py` & `app/services/`)
      │  ◄── Business Logic, Calculation Formulas, PDF Generation, Email Dispatch
      ▼
Repository Layer (`app/api/<domain>/repository.py`)
      │  ◄── SQLAlchemy Async Sessions (`asyncpg`) & Redis Async Client
      ▼
Database / Cache (PostgreSQL 16 & Redis 8)
```

---

## 📁 Directory Layout

```text
backend/
├── alembic.ini                   # Database migration configuration
├── docker-compose.yml            # Local Postgres 16 & Redis 8 orchestrator
├── main.py                       # FastAPI application declaration & lifespan handlers
├── pyproject.toml                # uv / PEP 621 package and dependency definitions
├── uv.lock                       # Locked dependency graph
├── seed.py                       # Production-grade 14-month enterprise database seeder
├── migrations/                   # Versioned SQL migration scripts
│   ├── env.py                    # Alembic async migration environment
│   └── versions/                 # Auto-generated and curated migration revisions
└── app/
    ├── core/
    │   ├── config.py             # Pydantic BaseSettings loading from .env
    │   ├── database.py           # Async SQLAlchemy engine & session maker
    │   ├── redis.py              # Async Redis client singleton
    │   ├── security.py           # Argon2id password hasher & JWT encoder/decoder
    │   └── cookies.py            # HttpOnly cookie setter & clearer
    ├── models/                   # Declarative SQLAlchemy models
    │   ├── user.py               # User account & UserRole enum
    │   ├── employee.py           # Employee profile, bank, marital, address
    │   ├── department.py         # Org units & department managers
    │   ├── contract.py           # Wage, contract state, scheduling
    │   ├── working_schedule.py   # Shift hours and work days
    │   ├── attendance.py         # Check-in, check-out, worked hours
    │   ├── time_off.py           # Leave types, allocations, and requests
    │   └── payroll.py            # Payruns, payslips, salary structures, rules
    ├── schemas/                  # Pydantic v2 request/response DTOs
    ├── services/                 # External integrations
    │   ├── email/                # Resend async client & HTML responsive templates
    │   └── pdf/                  # fpdf2 PDF generator for salary payslips
    └── api/                      # Modular domain routers & controllers
        ├── deps.py               # Authentication dependencies & role guards
        ├── users/                # Authentication & User administration
        ├── employees/            # Employee lifecycle
        ├── departments/          # Department management
        ├── contracts/            # Employment contracts
        ├── working_schedules/    # Working shifts & schedules
        ├── attendance/           # Clock in/out and daily attendance
        ├── time_off/             # Leave allocations & requests
        ├── payroll/              # Salary structures, rules, and dashboard
        └── payruns/              # Payrun execution, payslips, and dispatch
```

---

## 🗄️ Database Models & Domain Design

### 1. **Identity & Staff**
- **`User`**: System credentials, email, password hash (`argon2id`), active status, system role (`ADMIN`, `HR_MANAGER`, `HR_PAYROLL_USER`, `HR_PAYROLL_ADMIN`, `EMPLOYEE`).
- **`Employee`**: Extended HR profile, job title, department ID, manager ID, private email/phone, bank account, identification number.
- **`Department`**: Department name, code, and assigned manager ID.

### 2. **Contracts & Schedules**
- **`Contract`**: Employee wage, wage type (`MONTHLY`, `HOURLY`), start/end dates, state (`DRAFT`, `RUNNING`, `EXPIRED`, `CANCELLED`), salary structure ID, schedule ID.
- **`WorkingSchedule`**: Schedule name, standard hours per week (e.g., 40.0h, 20.0h), average hours per day.

### 3. **Time & Attendance**
- **`Attendance`**: Check-in timestamp, check-out timestamp, calculated worked hours, employee reference.
- **`TimeOffType`**: Leave classification (`Paid Time Off`, `Sick Leave`, `Casual Leave`, etc.), allocation mode, color code.
- **`TimeOffAllocation`**: Quota bank per employee per leave type (total allocated, used days, remaining balance).
- **`TimeOffRequest`**: Date range, duration in days, state (`DRAFT`, `SUBMITTED`, `APPROVED`, `REFUSED`), reason.

### 4. **Payroll & Compensation Engine**
- **`SalaryStructure`**: Structure definition (Standard, Executive, Part-Time).
- **`SalaryRule`**: Category (`BASIC`, `ALW`, `DED`, `GROSS`, `NET`), sequence order, calculation type (`PERCENTAGE`, `FIXED`, `PYTHON_CODE`), formula definition.
- **`Payrun`**: Batch run reference (e.g. `PAY-2026-09`), date start/end, state (`DRAFT`, `COMPUTED`, `VALIDATED`, `PAID`), total gross, total net.
- **`Payslip`**: Computed slip per employee per payrun, worked days, gross salary, total deductions, net wage, state (`DRAFT`, `VALIDATED`, `PAID`).
- **`PayslipLine`**: Itemized breakdown on each payslip reflecting exact evaluated salary rules.

---

## 🚀 Prerequisites & Development Setup

### Prerequisites
- **[Astral uv](https://docs.astral.sh/uv/)** installed (`curl -LsSf https://astral.sh/uv/install.sh` or `powershell -c "irm https://astral.sh/uv/install.ps1 | iex"`)
- **Docker Desktop** installed and running

### 1. Clone & Navigate
```bash
git clone <repository-url>
cd odoo-hackathon-final/backend
```

### 2. Install Dependencies
```bash
# uv handles virtual environment creation and Python 3.13 installation automatically
uv sync
```

### 3. Start PostgreSQL & Redis
```bash
docker compose up -d
```

### 4. Prepare Environment
```bash
cp .env.example .env
```

### 5. Apply Migrations
```bash
uv run alembic upgrade head
```

### 6. Run the Enterprise Data Seeder
```bash
uv run python seed.py
```

### 7. Run the Backend API
```bash
# Starts development server with live reload on http://127.0.0.1:8000
uv run fastapi dev
```

Interactive OpenAPI Swagger UI is available at: **`http://127.0.0.1:8000/docs`**

---

## ⚙️ Environment Configuration (`.env`)

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `APP_ENV` | `development` | `development` (HTTP cookies) or `production` (Secure HTTPS cookies) |
| `DATABASE_URL` | `postgresql+asyncpg://...` | Async PostgreSQL database connection URI |
| `JWT_SECRET_KEY` | `change-this-to-a-long-random-secret` | Cryptographic secret key for signing JWT tokens |
| `JWT_ALGORITHM` | `HS256` | Algorithm used for token signing |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `60` | Lifespan of session tokens |
| `COOKIE_NAME` | `access_token` | Name of the authentication cookie |
| `COOKIE_HTTPONLY` | `true` | Prevents client-side JS access to token |
| `COOKIE_SAMESITE` | `lax` | Cross-origin request cookie policy |
| `RESEND_API_KEY` | `re_...` | API key from Resend for transactional email dispatch |
| `RESEND_FROM_EMAIL` | `OXP Technologies <noreply@...>` | Sender identity for automated emails |
| `APP_NAME` | `PeoplePay ERP` | Application brand name in email notifications |
| `OTP_EXPIRE_MINUTES` | `10` | Expiration window for 2FA/Password reset OTP codes |
| `RESET_TOKEN_EXPIRE_MINUTES` | `15` | Window for completing password reset post-OTP |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection URI for OTP cache & sessions |

---

## 🔄 Database Migrations (Alembic)

Database schemas are strictly managed using **Alembic**:

```bash
# Apply all pending migrations to the latest version:
uv run alembic upgrade head

# Roll back the latest migration:
uv run alembic downgrade -1

# Create a new migration after updating models in app/models/:
uv run alembic revision --autogenerate -m "Add new column or table"
```

---

## 🌱 Enterprise Data Seeder

The system includes an extensive enterprise-grade seed script located at [`backend/seed.py`](seed.py). Running this script populates the database with real-world, interconnected company data simulating over a year of continuous production usage:

```bash
uv run python seed.py
```

### What gets generated:
- **20 Users & Employees**: Complete organizational breakdown across 6 departments (Engineering, HR, Sales, Marketing, Finance, Operations) with managers, job positions, bank details, and emergency contacts.
- **3 Salary Structures & Full Rule Sets**:
  - *Standard Employee Structure* (Basic, HRA, Medical, PF, TDS)
  - *Executive Structure* (Enhanced base, Performance Bonus, Tax)
  - *Part-Time Structure* (Hourly wage computation)
- **23 Contracts**: Including active contracts with start dates staggered throughout 2025–2026, plus expired and draft contracts to trigger dashboard alerts.
- **14 Monthly Payruns (Sep 2025 → Oct 2026)**:
  - 10 Past Payruns in `PAID` state
  - Current Payrun in `VALIDATED` state
  - Future Payruns in `DRAFT` state
- **266 Computed Payslips**: Individual payslips with exact breakdown lines for every employee across each month.
- **Realistic Payroll Cost Curve**: Monthly chart variances featuring staggered hiring, April 2026 annual increments, December year-end bonuses, June mid-year promotions, and Q2 sales incentives.
- **Daily Attendance History**: 14 months of attendance logs with natural time stamps, slight variations, overtime, and late check-ins.
- **Leave Allocations & Requests**: 57 allocations across 5 leave types and 40+ historical and pending requests.

---

## 💰 The Payroll Computation Engine

The payroll computation engine operates inside `app/api/payruns/` and `app/api/payroll/`. When computing a payrun:

1. **Contract Eligibility Filter**: Identifies all active contracts in `RUNNING` state valid for the payrun date interval.
2. **Attendance & Absence Integration**: Analyzes attendance logs and approved unpaid leaves to calculate unpaid days and actual worked days.
3. **Salary Rule Evaluation**:
   - Executes rules in sequence order (`sequence` ascending).
   - Computes base allowances (e.g. Basic = 50% of Wage, HRA = 50% of Basic).
   - Computes gross salary.
   - Computes statutory deductions (Provident Fund, Professional Tax, TDS).
   - Evaluates net payable amount: `Net = Gross - Total Deductions`.
4. **Batch Persistence**: Inserts `Payslip` headers and corresponding `PayslipLine` entries within an atomic database transaction.

---

## ✉️ Email & OTP Verification Service

The email system uses the modern **Resend API** (`resend[async]`):

- **Welcome Emails**: Dispatched when new users or employees are created.
- **Password Reset OTP**: Generates a cryptographically random 6-digit OTP code, hashes it with SHA-256, and stores it in Redis with an expiration TTL.
- **Payslip Dispatch**: Directly sends generated PDF payslips to employees via email.

### Testing the Email Service via CLI:
```bash
# Send both test emails (Welcome & OTP):
uv run python -m app.test_email

# Send specific test email:
uv run python -m app.test_email welcome
uv run python -m app.test_email reset

# Send to custom address:
uv run python -m app.test_email welcome developer@example.com
```

---

## 📄 PDF Payslip Generation

The PDF engine uses **`fpdf2`** to produce high-resolution, branded salary slips featuring:
- Company Header & Logo block (OXP Technologies Pvt Ltd).
- Employee & Contract metadata (ID, Department, Bank Account, Pay Period).
- Attendance summary (Worked Days, Absent Days).
- Itemized earnings table (Basic, HRA, Allowances, Incentives).
- Itemized deductions table (PF, Tax, TDS).
- Net wage in figures and bold summary box.
- Generated instantly via streaming HTTP response or attached directly to outgoing emails.

---

## 📡 REST API Endpoints Reference

### Authentication & Users (`/auth`)
| Method | Endpoint | Description | Guard |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/register` | Register new user account | Admin / Bootstrap |
| `POST` | `/auth/login` | Login and set HttpOnly auth cookie | Public |
| `POST` | `/auth/logout` | Clear auth cookie | Authenticated |
| `GET` | `/auth/me` | Return active session profile | Authenticated |
| `POST` | `/auth/forgot-password` | Send 6-digit OTP to email | Public |
| `POST` | `/auth/verify-otp` | Verify OTP and return reset token | Public |
| `POST` | `/auth/reset-password` | Reset password with token | Public |
| `GET` | `/auth/users` | List all users and roles | Admin |
| `PATCH`| `/auth/users/{id}` | Update user details or role | Admin |

### Employees & Organization (`/employees`, `/departments`)
| Method | Endpoint | Description | Guard |
| :--- | :--- | :--- | :--- |
| `GET` | `/employees` | List employee directory | HR / Admin |
| `POST` | `/employees` | Create employee profile | HR / Admin |
| `GET` | `/employees/{id}` | Get employee profile details | Employee (Self) / HR |
| `PATCH`| `/employees/{id}` | Update employee profile | HR / Admin |
| `GET` | `/departments` | List all departments | Authenticated |
| `POST` | `/departments` | Create new department | HR / Admin |

### Contracts & Schedules (`/contracts`, `/working-schedules`)
| Method | Endpoint | Description | Guard |
| :--- | :--- | :--- | :--- |
| `GET` | `/contracts` | List employment contracts | HR / Payroll |
| `POST` | `/contracts` | Create contract & assign wage | HR / Payroll Admin |
| `GET` | `/working-schedules` | List standard working schedules | Authenticated |
| `POST` | `/working-schedules` | Create new working schedule | HR / Admin |

### Attendance & Time Off (`/attendance`, `/time-off`)
| Method | Endpoint | Description | Guard |
| :--- | :--- | :--- | :--- |
| `POST` | `/attendance/check-in` | Punch-in daily check-in | Employee |
| `POST` | `/attendance/check-out` | Punch-out daily check-out | Employee |
| `GET` | `/attendance/my` | View own attendance records | Employee |
| `GET` | `/time-off/types` | List all leave types | Authenticated |
| `GET` | `/time-off/allocations` | List user leave quota balances | Authenticated |
| `POST` | `/time-off/allocations` | Allocate/adjust leave days | HR / Admin |
| `POST` | `/time-off/requests` | Submit leave request | Employee |
| `PATCH`| `/time-off/requests/{id}/approve` | Approve request & deduct quota | HR / Admin |

### Payroll Engine & Payruns (`/payroll`, `/payruns`)
| Method | Endpoint | Description | Guard |
| :--- | :--- | :--- | :--- |
| `GET` | `/payroll/dashboard` | Aggregated metrics & 14-mo chart data | Payroll / Admin |
| `GET` | `/payroll/structures` | List salary structures | Payroll Staff |
| `POST` | `/payroll/structures` | Create salary structure | Payroll Admin |
| `GET` | `/payruns/` | List all payruns | Payroll Staff |
| `POST` | `/payruns/` | Create new payrun batch | Payroll Admin |
| `POST` | `/payruns/{id}/compute` | Compute payslips for payrun | Payroll Staff |
| `POST` | `/payruns/{id}/validate` | Validate and lock payrun | Payroll Staff |
| `POST` | `/payruns/{id}/mark-paid` | Mark payrun as paid | Payroll Staff |
| `GET` | `/payruns/{id}/payslips/{p_id}/pdf`| Download payslip PDF | Employee / Payroll |
| `POST` | `/payruns/{id}/send-payslips`| Batch email payslips via Resend | Payroll Staff |

---

## 🔒 Security & Authentication Specs

1. **HttpOnly Cookie Transmission**: JWTs are held strictly inside `HttpOnly`, `SameSite=Lax` cookies, preventing client-side JavaScript access.
2. **Argon2id Password Storage**: Passwords are never stored in plaintext; hashed with Argon2id memory-hard algorithms (`pwdlib`).
3. **Strict Dependency RBAC**: Routes are protected with declarative dependencies (`require_roles(...)`), returning `403 Forbidden` for unauthorized actors.
4. **Rate-Limited Redis OTP**: OTP validation limits maximum verification attempts (5 attempts) to prevent brute-force attacks.

---

<div align="center">

## 🏆 Hackathon Attribution

### **BUILT FOR Odoo Hackathon 2026**

### **Contributors**
**Nigam Vaghani** &nbsp;•&nbsp; **Dhanesh Vaghasiya** &nbsp;•&nbsp; **Rohit Sharma**

<br/>

*Developed with pride for the Odoo Hackathon 2026.*

</div>
