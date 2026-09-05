# 04 · Time Off

Reads on top of `00-foundations.md`. Covers the Time Off ▾ dropdown group: Dashboard (see `06-dashboard.md` for the Payroll one; a lightweight Time Off dashboard can reuse the same KPI-card pattern at smaller scale — not detailed separately here), Time Offs, Time Off Types, Allocations.

---

## Time Off Type color mapping (icon-chip, §6C of foundations)

This mapping is the one source of truth — Requests, Allocations, and the Types config screen all reference these same colors.

| Type | Chip / accent color |
|---|---|
| Paid Time Off | `--sky` |
| Sick Leave | `--danger` (soft — signals "employee unwell," distinct from a negative/error use of the same hue by context) |
| Comp Off | `--ink` |

## Screen: Time Off Requests — List

Header: "Time Off Requests" + subtitle, `+ New`, search pill, "My Team" filter pill.

**Table columns**: Employee, Type (small color-dot from the mapping above + label, not a full icon chip — keep table rows light), Start, End, Duration, Status (pill: Approved → `--success` soft, To Approve → `--warning` soft), then inline **Approve / Refuse** action buttons directly in the row for anything still pending — Approve = small `--coral` filled button, Refuse = outline `--danger`. Once approved/refused, the action buttons are replaced by nothing extra — the status pill alone is enough, don't leave disabled ghost buttons sitting in the row.

Use the **accordion row** motif (§6D) here optionally: rows needing action can auto-expand to show the "Reason" text inline without a full navigation, matching Twisty's Recent Projects pattern — but a straight table is also acceptable if the team is short on time; this is a nice-to-have, not required.

## Screen: Time Off Request — Form

Header: "Time Off Request / {Employee}". Approve (`--coral` fill) / Refuse (`--danger` outline) buttons top-left, same position as the List's inline actions for muscle-memory consistency.

Two-column grid: Employee, Time Off Type, Start Date, End Date | Duration, Status, Approver, Allocation Used.

**Reason panel**: `--muted` card, `--r-md` — same "system note" card style as Attendance/Contracts, containing the free-text reason.

---

## Screen: Allocations — List

Header: "Allocations", `+ New`, search pill.

**Table columns**: Employee, Type (color dot + label), Allocated, Taken, Remaining, Status (pill). Put Allocated/Taken/Remaining in JetBrains Mono, right-aligned — this is exactly the kind of "balance math at a glance" the wireframe calls out, and tabular mono is what makes three adjacent numeric columns easy to compare.

## Screen: Allocation — Form

Header: "Allocation / {Employee}". Approve/Refuse buttons, same as Time Off Request form.

Two-column grid: Employee, Time Off Type, Allocated, Status | Taken, Remaining, Approver, Validity.

**Description panel**: same `--muted` note-card style, e.g. "Annual leave balance granted at start of policy year."

---

## Screen: Time Off Types — List (config screen)

Header: "Time Off Types", `+ New`, search pill. No "My Team" filter here — this is policy configuration, not employee transactions, so keep the toolbar minimal per the wireframe's own note.

**Table columns**: Type (with its color dot from the mapping table), Unit (Days/Hours), Allocation (Required/No), Approval (Manager/Officer), Status (pill).

## Screen: Time Off Type — Form

Header: "Time Off Type / {Name}". `Edit` outline button.

Two-column grid: Type Name, Unit, Requires Allocation, Active | Approval, Payroll/Work Entry, **Display Color** (a color swatch picker constrained to the token palette — this field is literally what drives the color-dot mapping table above, so make the picker show exactly `--sky` / `--danger` / `--ink` / `--warning` / `--success` as the only options, not a full spectrum picker).

**Configuration Notes panel**: same note-card convention.
