<div align="center">

# 🎨 PeoplePay Frontend — Modern Enterprise ERP & Payroll UI

### *React 19 • Vite 6 • Tailwind CSS v4 • Recharts • Lucide Icons • React Router 7*

<br/>

[![React 19](https://img.shields.io/badge/React%2019-20232A?style=flat-square&logo=react&logoColor=61DAFB)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite%206-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS_v4-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![React Router 7](https://img.shields.io/badge/React_Router_7-CA4245?style=flat-square&logo=react-router&logoColor=white)](https://reactrouter.com/)
[![Recharts](https://img.shields.io/badge/Recharts-22b5bf?style=flat-square&logo=chartdotjs&logoColor=white)](https://recharts.org/)
[![Lucide Icons](https://img.shields.io/badge/Lucide_Icons-F56565?style=flat-square&logo=feather&logoColor=white)](https://lucide.dev/)
[![Oxlint](https://img.shields.io/badge/Oxlint-4B32C3?style=flat-square&logo=oxc&logoColor=white)](https://oxc.rs/)

<p align="center">
  <b>A responsive, high-performance Single Page Application (SPA) designed to deliver an intuitive, state-of-the-art ERP experience. Engineered with modern typography, smooth micro-interactions, dark/light theme accents, glassmorphic modals, and dynamic data visualization.</b>
</p>

</div>

---

## 📑 Table of Contents

- [UI/UX Philosophy & Design System](#-uiux-philosophy--design-system)
- [Directory & Component Layout](#-directory--component-layout)
- [Core Application Modules](#-core-application-modules)
- [Authentication & Session Flow](#-authentication--session-flow)
- [Data Visualization (Recharts)](#-data-visualization-recharts)
- [Prerequisites & Development Setup](#-prerequisites--development-setup)
- [Available Scripts](#-available-scripts)
- [API Integration & Vite Proxy](#-api-integration--vite-proxy)
- [Role-Based View Adapters](#-role-based-view-adapters)
- [Hackathon Attribution](#-hackathon-attribution)

---

## 💎 UI/UX Philosophy & Design System

The PeoplePay user interface is designed from the ground up to eliminate the clunkiness associated with traditional legacy ERP platforms:

- **Tailwind CSS v4 Theming**: Curated modern color palettes featuring deep slates, crisp indigos, vibrant emeralds, and warm ambers for actionable states.
- **Glassmorphism & Micro-animations**: Subtle backdrop blurs, delicate hover elevations, and responsive transitions that feel alive without overwhelming the user.
- **Data-Dense Yet Readable**: Complex financial data, tabular payslips, and multi-day attendance rosters organized using intuitive visual hierarchy, badge indicators, and collapsible side drawers.
- **Responsive Layout**: Fluid layouts adapting seamlessly from large multi-monitor setups to tablets and mobile displays.

---

## 📁 Directory & Component Layout

```text
frontend/
├── package.json               # Dependencies and scripts (React 19, Tailwind v4, Vite 6)
├── vite.config.js             # Vite config & API reverse proxy configuration
├── index.html                 # HTML5 document root with Inter/Outfit font links
├── src/
│   ├── main.jsx               # Application entry & DOM hydration
│   ├── App.jsx                # BrowserRouter, Route registry & Route Guards
│   ├── App.css                # Global animation keyframes
│   ├── index.css              # Tailwind CSS v4 directives & utility classes
│   │
│   ├── api/                   # Fetch API wrappers with credentials: 'include'
│   │   ├── client.js          # Shared base HTTP client
│   │   └── ...                # Feature-specific API bridges
│   │
│   ├── context/
│   │   └── AuthContext.jsx    # User session, login, logout, role state management
│   │
│   └── components/
│       ├── Navbar.jsx         # Modern top bar with role-switcher & profile drawer
│       ├── AuthCard.jsx       # Login, Register, Forgot Password & OTP modal
│       ├── EmployeesPage.jsx  # Employee directory (Cards & Table view)
│       ├── AttendancePage.jsx # Clock in/out, real-time counters & attendance logs
│       ├── TimeOffPage.jsx    # Leave banks, dynamic allocations & approval flow
│       ├── PayrollPage.jsx    # Complete Payroll command center & Recharts analytics
│       │
│       ├── common/            # ProtectedRoute & PublicRoute route guards
│       ├── admin/             # User Management & Role assignment table
│       ├── contracts/         # Employment Contracts & Salary Structure lists
│       ├── employees/         # Department & Working Schedule managers
│       └── payroll/           # Payrun detail modals, rule editors & PDF viewer
```

---

## 🖥️ Core Application Modules

### 1. 🔐 Authentication & Account Recovery (`AuthCard.jsx`)
- Sleek unified card handling **Login**, **Registration**, and **Self-Service Password Recovery**.
- Integrated **6-digit OTP verification** with live countdown timer and single-use reset tokens.
- Secure cookie-based session management (`credentials: 'include'`).

### 2. 👥 Employee Management (`EmployeesPage.jsx`)
- Dual-view interface: Switch instantly between an **Executive Card Grid** and an **Enterprise Data Table**.
- Rich employee profile inspection: Department, Job Title, Work Email, Phone, Manager, and Employment Type.
- Search bar with instant real-time filtering across name, department, and title.

### 3. ⏰ Attendance & Time Tracking (`AttendancePage.jsx`)
- Interactive **Clock In / Clock Out** action button with live status indicator.
- Monthly attendance grid highlighting regular hours, overtime, and late check-ins.
- Administrative manual correction modal for HR Managers.

### 4. 🏖️ Time Off & Leave Allocations (`TimeOffPage.jsx`)
- **Smart Allocation Cards**: Display remaining quotas, allocated days, and used days for each leave type (Paid Time Off, Sick Leave, Casual Leave, etc.).
- **In-Place Quota Adjustment**: Adding leave allocation directly increases existing balances without cluttering the UI with duplicate cards.
- **Request Approval Queue**: HR Managers and Admins can approve or reject pending leave requests with one click.

### 5. 💰 Payroll Command Center (`PayrollPage.jsx`)
- **14-Month Financial Trend**: Interactive Recharts curve mapping monthly gross and net payroll expenditures.
- **Payrun Batch Wizard**: Create, compute, validate, and mark paid monthly payrun cycles.
- **Payslip Inspector**: Detailed line-item breakdown showing basic wages, allowances, and statutory tax deductions.
- **Interactive PDF Generation**: Preview and download high-resolution salary slips directly in the browser.
- **Salary Rules Builder**: Inspect and configure dynamic salary calculation rules and percentage formulas.

### 6. ⚙️ Admin & Organization (`UserManagement.jsx`, `DepartmentsPage.jsx`)
- Admin dashboard to manage user roles across 5 tiers: `Admin`, `HR Payroll Manager`, `HR Payroll User`, `HR Manager`, and `Employee`.
- Department hierarchy management with assigned department heads.
- Working schedule builder defining weekly hour quotas (40h Standard, 20h Part-time, Flexible).

---

## 🔒 Authentication & Session Flow

```mermaid
sequenceDiagram
    autonumber
    actor User as User Browser
    participant AuthContext as AuthContext (React)
    participant API as FastAPI Backend (/auth)

    User->>AuthContext: Enter credentials (email, password)
    AuthContext->>API: POST /auth/login
    API-->>User: Set-Cookie: access_token=...; HttpOnly; SameSite=Lax
    API-->>AuthContext: Return { id, name, email, role }
    AuthContext->>AuthContext: Set user state in memory
    AuthContext->>User: Redirect to /dashboard
    
    Note over User,API: Subsequent requests automatically include HttpOnly cookie
```

- **`ProtectedRoute`**: Inspects `AuthContext`. If user is unauthenticated, redirects cleanly to `/login`.
- **`PublicRoute`**: Prevents logged-in users from seeing login/register forms; auto-redirects them to `/dashboard`.

---

## 📊 Data Visualization (Recharts)

The payroll dashboard embeds responsive SVG data visualization powered by **Recharts**:

- **Area & Bar Composed Charts**: Displays monthly gross wages alongside net payable payouts across 14 seeded months (Sep 2025 – Oct 2026).
- **Realistic Variance Mapping**: Visualizes hiring growth, mid-year promotions, April annual increments, and December year-end bonuses.
- **Department Distribution**: Donut and bar charts breaking down payroll expenditure across Engineering, Sales, HR, Marketing, Finance, and Operations.

---

## 🚀 Prerequisites & Development Setup

### Prerequisites
- **Node.js** (v18.0.0 or later)
- **npm** (v9.0.0 or later)

### 1. Clone & Navigate
```bash
git clone <repository-url>
cd odoo-hackathon-final/frontend
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start Local Development Server
```bash
npm run dev
```
The application will spin up at **`http://localhost:5173`**.

---

## 🛠️ Available Scripts

| Command | Purpose |
| :--- | :--- |
| `npm run dev` | Starts the Vite development server with Hot Module Replacement (HMR) |
| `npm run build` | Compiles and optimizes assets into the production `dist/` directory |
| `npm run preview` | Locally previews the production build from `dist/` |
| `npm run lint` | Runs the ultra-fast Oxlint linter across all JSX and JS files |

---

## 🔌 API Integration & Vite Proxy

During local development, `vite.config.js` acts as an automated reverse proxy, transparently routing API calls to the FastAPI backend running on port `8000`:

```javascript
// vite.config.js snippet
export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      '/auth': 'http://127.0.0.1:8000',
      '/employees': 'http://127.0.0.1:8000',
      '/departments': 'http://127.0.0.1:8000',
      '/contracts': 'http://127.0.0.1:8000',
      '/working-schedules': 'http://127.0.0.1:8000',
      '/attendance': 'http://127.0.0.1:8000',
      '/time-off': 'http://127.0.0.1:8000',
      '/payroll': 'http://127.0.0.1:8000',
      '/payruns': 'http://127.0.0.1:8000',
    }
  }
});
```

This ensures cross-origin cookies (`HttpOnly`) are retained smoothly without requiring complex CORS configurations on localhost.

---

## 🛡️ Role-Based View Adapters

The UI adapts dynamically depending on the active user's permissions:

- **Admin**: Has access to the Admin tab (`/admin/users`), full contract modifications, salary rule builders, and delete triggers.
- **HR Payroll Manager / User**: Has access to the Payroll tab (`/payroll`), compute payruns button, batch payrun validation, and payslip generation.
- **HR Manager**: Has access to all employee records, leave approvals, attendance adjustment tools, and department rosters.
- **Employee**: Streamlined self-service dashboard with personal attendance punch button, leave quota balances, request history, and personal downloadable payslips.

---

<div align="center">

## 🏆 Hackathon Attribution

### **BUILT FOR Odoo Hackathon 2026**

### **Contributors**
**Nigam Vaghani** &nbsp;•&nbsp; **Dhanesh Vaghasiya** &nbsp;•&nbsp; **Rohit Sharma**

<br/>

*Engineered with precision for the Odoo Hackathon 2026.*

</div>
