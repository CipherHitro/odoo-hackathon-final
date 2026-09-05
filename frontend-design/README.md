# PeoplePay360 — "Daybook" Design System

Extracted from the Twisty dashboard reference and mapped onto the full 33-screen functional wireframe set. Replaces all earlier design docs.

## Files

| File | Covers |
|---|---|
| `00-foundations.md` | **Read this first, always.** Color/type tokens, app shell + nav structure, the 7 reusable motifs, base component specs, motion, libraries |
| `01-employees.md` | Employees (Kanban/List/Form), Departments, Working Schedule |
| `02-contracts.md` | Contracts List/Form |
| `03-attendance.md` | Attendance List/Form + the quick check-in/out widget |
| `04-timeoff.md` | Time Off Requests, Allocations, Time Off Types |
| `05-payroll.md` | Payruns, New Payrun wizard, Payslips, Salary Structures & Rules |
| `06-dashboard.md` | Payroll Dashboard — the primary showcase screen |
| `07-auth-admin.md` | Login, User Management (Admin) |

## How to use this with a coding agent

Drop this whole folder in your project root (e.g. `/design-system`). When building a specific screen, point your agent at `00-foundations.md` + the one module file for that screen — not the whole folder at once, that's more context than any single screen needs. When you notice yourself inventing a new rule mid-build that isn't in these files, add it back here before moving on, so the next screen stays consistent.

## What changed from the last version

The previous "Ledger & Ink" system (dark sidebar, black/red ink convention, stamp-approval animation) is retired. This system keeps the parts of that reasoning that still hold — restrained motion, deliberate status-pill semantics, monospace reserved for genuinely tabular data — but the visual language now follows the Twisty reference: warm coral accent, near-flat cards, icon-chip categorization, and the dot-stem/tally-bar chart motifs, applied consistently across all nine modules.
