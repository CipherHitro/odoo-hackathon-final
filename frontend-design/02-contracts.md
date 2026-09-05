# 02 · Contracts

Reads on top of `00-foundations.md`.

---

## Screen: Contracts — List

Header: "Contracts" title + subtitle, `+ New` primary, search pill.

**Table columns**: Contract (reference code, e.g. `CON/2026/004` — JetBrains Mono, `--text-secondary`), Employee, Start, End (em-dash `—` if ongoing), Wage/Month (JetBrains Mono, right-aligned), Status (pill).

**Status pill mapping**: Running → `--success` soft · Expired → `--danger` soft · Draft → `--neutral-pill` outline.

**Active-contract emphasis** (the spec explicitly calls this out — "make the active Running contract obvious because payroll depends on it"): the Running contract row for a given employee gets a 3px `--coral` left border, distinct from the plain hover state everywhere else in the app. This is the one place a left-border accent uses `--coral` instead of `--ink`/`--sky`, because it's flagging the single record payroll will actually use — worth the emphasis.

## Screen: Contract — Form

Header: "Contract / {reference}" (Clash Display 600).

Two-column field grid: Employee, Start Date, End Date, Status | Department, Job Position, Wage/Month, Working Schedule.

**Salary Structure / Notes** panel below the grid: `--muted` bg card, `--r-md`, containing "Structure Type: {name}" (bold) and a one-line explanatory note in `--text-secondary` italic — this is informational, not editable here (editing happens in Payroll → Structures, see `05-payroll.md`).

Wage figures anywhere in this screen use JetBrains Mono, tabular-nums, right-aligned when in a table context.
