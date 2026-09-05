# 05 · Payroll — Payruns, Payslips, Structures & Rules

Reads on top of `00-foundations.md`. Covers the Payroll ▾ dropdown group except Dashboard (see `06-dashboard.md`).

---

## Screen: Payruns — List

Header: "Payruns" + subtitle, `+ New`, search pill, year filter pill ("2026").

**Use the accordion motif (§6D) as the primary layout** — this is the closest match to Twisty's actual "Recent Projects" pattern, so lean into it fully here rather than a plain table:

One `--card` container, rows separated by 1px `--border`. Each row (collapsed):
- Left: Payrun name ("February 2026", Clash Display 600) + date range below (`--text-secondary`, small)
- Middle: "{n} employees" (`--text-secondary`)
- Right: status pill (Paid → `--ink` solid per §5's "primary status" rule; Validated → `--sky` soft; Draft → `--neutral-pill` outline) + a small warning count in `--warning` text if any ("2 warnings") + an edit icon button + chevron to expand.

Clicking a row (or its chevron) expands it inline OR navigates to the full Payrun detail screen below — either is fine; if inline expansion is used, show a condensed payslip count/warning summary in the expanded area with a "Open full view" link.

## Screen: New Payrun — 2-step modal

This is a modal/wizard, not a page — `--card` bg, `--r-lg`, `--shadow-float` (modal, so float-shadow is earned), centered overlay with `rgba(23,27,38,0.4)` backdrop.

**Step indicator**: two circular chips (§6E) top of modal — "1" filled `--ink` (current) and "2" `--muted` (upcoming), connected by a thin `--border` line. Once step 2 is active, chip 1 turns `--success` filled (completed) and chip 2 becomes `--ink` filled (current).

**Step 1 — "New Pay Run"**: Pay Structure dropdown, Period (two date inputs side by side). `Continue` primary button + `Discard` text-link button. Per the wireframe note: this step only collects scope, it must not create the Payrun record yet.

**Step 2 — "Select Employee Records"**: search pill + a counter top-right ("1–22 / 22"). Table: checkbox column, Employee, Working Hours, Start Date, Wage (JetBrains Mono, right-aligned). `Create Payrun` primary button + `Back` outline button. The Payrun is only created on this click, containing only the checked rows.

## Screen: Payrun — Detail

Header: "Payrun / {name}" + subtitle. Action button row: `Compute` (outline), `Validate` (outline), `Mark Paid` (outline) — these represent workflow stages (Draft → Compute → Validate → Mark Paid), so style whichever stage is *next available* as `--coral` filled and the rest as outline/disabled, rather than making all three look equally clickable at once. Far right: `Send Payslips` in `--sky` filled (this is a distinct action from the workflow stages, so it gets a distinct color, not just a bigger primary button).

Fields grid: Name, Salary Structure, Period, Status.

**"Payslips in this Payrun" table**: Employee, Warning (`--warning` text if present, em-dash if none), Worked, Basic, Gross, Net (all JetBrains Mono, right-aligned), Status (pill), PDF (text-link, `--sky`).

## Screen: Payslips — List

Header: "Payslips", `+ New`, search pill, "Period: Feb 2026" filter pill.

Table: Employee, Warning, Period, Basic, Gross, Net (mono, right-aligned), Structure, Status (pill). Row click → Payslip detail.

## Screen: Payslip — Detail

Header: "Payslip / {Employee} / {Period}". Action buttons: `Compute` (outline), `Mark Paid` (outline/coral depending on stage), `Print Payslip` (`--sky` filled, distinct from workflow actions same logic as Payrun detail).

Fields grid: Employee, Period, Salary Structure, Status, Pay Run, Worked Days.

**"Salary Computation" table** — this is the ledger heart of the whole app, give it the most careful treatment:
- Columns: Rule, Category, Amount, Code.
- Amount column: JetBrains Mono, tabular-nums, right-aligned. **Earnings/Basic/Gross rows in `--ink`; Deduction rows in `--danger`, prefixed with a minus sign** (e.g. `−₹13,000`) — this is the one place a semantic-danger color is used for something that isn't an error, purely because it's a real accounting convention (deductions shown in red), same reasoning as before.
- The final "Net Salary" row is visually distinct: `--ink` background tint (`rgba(23,27,38,0.04)`) full-row, bold Clash Display for the amount instead of mono, sitting like a receipt total.
- Category column uses small pill labels (Basic/Allowance/Gross/Deduction/Net), each in `--neutral-pill` outline style except Deduction (`--danger` soft) and Net (`--ink` solid) — consistent with the status pill rules in foundations.

---

## Screen: Salary Structures — List

Header: "Salary Structures", `+ New`, search pill.

Table: Structure Name, Rules (count), Employees (count), Active (pill). Row click → Structure form.

## Screen: Salary Structure — Form

Header: "Salary Structure / {name}". Fields: Structure Name, Active.

**Salary Rules table** (nested, this structure's rules in sequence order): Rule Name, Code (mono), Category (pill), Sequence (mono, small, `--text-muted`). This table is read-heavy reference, not the place to edit a rule — editing happens on the Salary Rule form (below). Keep sequence visible and unstyled-plain so the calculation order is scannable at a glance, exactly per the wireframe's own note.

---

## Screen: Salary Rules — List

Header: "Salary Rules", `+ New`, search pill, structure filter pill ("Regular Salary").

Table: Rule Name, Code (mono), Category (pill), Structure, Sequence (mono).

## Screen: Salary Rule — Form

Header: "Salary Rule / {name}". `Edit` outline button.

Fields grid: Rule Name, Code, Category, Sequence | Salary Structure, Computation, Percentage, Quantity.

**"Computation options from the source" panel**: three-column divided stat header (§6G) — Fixed Amount / Percentage of Wage / Python Code — each column shows which computation type is active (bold, `--ink`) vs. available-but-unused (`--text-muted`), with a one-line example underneath in JetBrains Mono for the Python Code option (e.g. `result = categories['BASIC']`).
