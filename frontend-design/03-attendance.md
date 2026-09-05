# 03 · Attendance

Reads on top of `00-foundations.md`.

---

## Screen: Attendance — List

Header: "Attendance" + subtitle, `+ New`, search pill, then two filter pills: "Today" and "Employee: {name}" (both `--muted` bg, `--r-pill`, `--coral` when actively filtering — matches Twisty's filter-pill treatment).

**Table columns**: Employee, Check In, Check Out, Worked Hours (JetBrains Mono), Status (pill: Present → `--success` soft with a leading 6px dot, Absent → `--danger` soft, em-dash `—` for check-in/out when absent).

## Screen: Attendance — Form

Header: "Attendance / {Employee} / {Date}". `Edit` outline button.

Two-column grid: Employee, Check In, Check Out, Worked Hours | Department, Manager, Status, Overtime.

**Notes panel**: `--muted` card, `--r-md`, "System-generated from check-in/out or manually corrected by an authorized user" — same treatment as the Contract notes panel, for consistency: any "system note / provenance" text across the app always uses this exact card style.

---

## Screen: Attendance Quick Widget (popup)

This is the small check-in/check-out popup reachable from the top-bar icon cluster in `00-foundations.md` §4 — not a page, a floating panel.

**Structure**: `--card` bg, `--r-lg`, `--shadow-float` (this is one of the few places float-shadow is earned — it's a popover). Header: "Welcome back, {User Name}!" (Clash Display 600), a status dot top-right — `--success` green filled circle when checked in, `--text-muted` gray when checked out (pulses very subtly only while checked in — this is the one small ambient motion worth keeping, since it's communicating a live state, not decoration).

Body: elapsed time row, big and clear — "9:48 AM — Now  ·  6h 56m" style, using Clash Display bold for the duration number specifically.

Below: "Today: 6h 56m" secondary line.

Primary action button spans full width: "Check Out" (`--coral` fill) when active, "Check In" (`--coral` fill) when inactive — label swaps, button color stays consistent so the position never moves.
