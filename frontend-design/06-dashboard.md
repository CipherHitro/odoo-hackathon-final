# 06 · Payroll Dashboard

Reads on top of `00-foundations.md`. This is the screen closest to the Twisty reference itself — lean hardest into the extracted motifs here.

---

## Layout

```
Filters:  [Period ▾] [Department ▾] [Employee Type ▾] [Company ▾]

┌─────────┬─────────┬─────────┬─────────┬─────────┐
│ Net Paid│ Payslips│ Avg Sal │ Time Off│ Attend. │  ← 5 KPI cards, equal width
└─────────┴─────────┴─────────┴─────────┴─────────┘
┌───────────────┬───────────────┬───────────────────┐
│ Salary by Dept │ Net Salary    │ Payslip Status &   │
│ (bar chart)    │ Trend (dot-   │ Alerts (tally +    │
│                │ stem chart)   │ accordion list)    │
└───────────────┴───────────────┴───────────────────┘
┌───────────────┬───────────────┬───────────────────┐
│ Attendance     │ Time Off      │ Department         │
│ Overview       │ Overview      │ Overview           │
│ (divided stat) │ (table)       │ (table)            │
└───────────────┴───────────────┴───────────────────┘
```

## Filters row

Four `--muted` pill dropdowns in a row, each with a chevron: Period, Department, Employee Type, Company. Selecting a filter re-triggers the KPI count-up animation (§7 of foundations) so the change is visibly felt, not just silently re-rendered.

## KPI cards (row 1)

Five equal-width `--card` tiles. Each: small label (`--text-secondary`, 13px), big number (Clash Display 700, 28px, `--ink`) — **not mono**, matching Twisty's own big-number treatment exactly — and a one-line qualifier below in `--text-secondary` 12px ("vs previous month", "142 paid, 6 pending", etc.), colored `--success` when the qualifier itself is positive (e.g. "+8.2% vs previous month").

| Card | Number | Qualifier |
|---|---|---|
| Total Net Salary Paid | ₹18.4L | +8.2% vs previous month (`--success`) |
| Payslips Generated | 148 | 142 paid, 6 pending |
| Avg Salary / Employee | ₹12,432 | Based on current payrun |
| Approved Time Off Days | 34 Days | Across selected period |
| Attendance Health | 94% | Present / reviewed records |

## Row 2, card 1 — Salary Cost by Department (bar chart)

Vertical bars, one per department, colored using the **department icon-chip mapping** from `01-employees.md` (so a department's color is consistent between this chart and its Kanban card elsewhere) rather than a single flat brand color for every bar. Value label above each bar in JetBrains Mono, small.

## Row 2, card 2 — Monthly Net Salary Trend

**This is the dot-stem chart motif (§6A), used exactly as in the reference**: month labels along the baseline, thin stems rising to `--sky` dots, the current/peak month gets the `--ink` dot + floating value tooltip pill above it.

## Row 2, card 3 — Payslip Status & Payroll Alerts

Top half: **segmented tally stat (§6B)** — three columns (Paid / Validated / Draft) each with a count and its own tally-bar strip, colored `--success` / `--sky` / `--neutral-pill` respectively, separated by 1px `--border` rules.

Bottom half: **accordion-style alert list (§6D)** inside the same card, no separate container — each alert is one row with a small colored dot (`--danger` for "duplicate payslip," `--warning` for "missing bank account," `--ink` for "contracts expiring") + the message text, no chevron needed here since these aren't expandable, just a clean list.

## Row 3, card 1 — Attendance Overview

**Divided stat header (§6G)**: four columns — Present / Late / Absent / Overtime — each a number over a label, hairline rules between. Below the numbers, a small horizontal bar per column showing relative proportion (reuse the tally-bar visual language from §6B at a smaller scale, one bar per column instead of a strip).

## Row 3, card 2 — Time Off Overview

Small table: Type (color dot from `04-timeoff.md` mapping), Approved Days, Pending, Remaining Balance — all numeric columns in JetBrains Mono, right-aligned.

## Row 3, card 3 — Department Overview

Small table: Department (color dot, same mapping as the bar chart in Row 2), Headcount, Monthly Salary (mono, right-aligned).

---

## Empty / first-run state

If there's no payroll data yet for the selected period, replace the KPI row with the **textured nudge card (§6F)**: "Run your first payroll" headline, one line of supporting text, a white pill button "Go to Payruns" with a trailing chevron — matching Twisty's "Unlock Premium Features" card treatment exactly (subtle dot-pattern corner, white CTA pill), repurposed from an upsell moment into a setup prompt.
