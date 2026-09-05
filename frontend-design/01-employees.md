# 01 · Employees, Departments & Working Schedule

Reads on top of `00-foundations.md`. Covers the Employees ▾ dropdown group.

---

## Department color mapping (icon-chip, §6C of foundations)

| Department | Chip color |
|---|---|
| Finance | `--sky` |
| HR | `--coral` |
| Engineering | `--ink` |
| Sales | `--warning` |
| Support | `--success` |

Use the employee's initials in the chip instead of an icon glyph (matches the wireframe's "AM", "SK", "JD" avatar style) — white text on the department color.

---

## Screen: Employees — Kanban (default view)

**Layout**: page title "Employees" + subtitle, `+ New` primary button, search pill, Kanban/List view toggle (right-aligned pill switch, active = `--ink` bg white text). Below: a responsive card grid, 2 columns on desktop.

**Card** (`--card`, `--r-lg`, `--shadow-card`):
- Top row: department-colored initials chip (40px) + name (Clash Display 600, 15px) + job title (`--text-secondary`, 13px) stacked beside it.
- Below: department name as small text, then a status pill (`--success` soft, "Active") with a 6px solid dot before the text — reuse this dot+pill combo everywhere "Active/Inactive" appears.
- Whole card is clickable → opens the Employee Form (same form used everywhere else).
- Hover: `--shadow-card` deepens very slightly, no lift/translate needed (keep restrained).

## Screen: Employees — List

Same header row, view toggle now on List. Table columns: Employee (initials chip + name), Work Email, Job Position, Department, Status (pill). Row hover = `--muted` tint, whole row clickable → Employee Form. This is the primary entry point to a specific employee record, so keep rows dense (44–48px height) rather than card-like.

## Screen: Employee Form

**Header block**: `Edit` outline button top-left. Below: initials chip (56px, department color) + name (Clash Display 700, 22px) + "{Job Title} · {Department}" one line, `{email} | {phone}` second line, both `--text-secondary`.

**Smart buttons row** (right side of header, or directly below on mobile): three pills per §5 — "Time Off · 3", "Contracts · 2", "Attendance · 14" — each opens that employee's filtered related list. Icon before the count: calendar (Time Off), document (Contracts), clock (Attendance), all `--text-secondary` until hover.

**Tabs**: "Work Information" / "Private Information" — active tab `--ink` text + 2px `--coral` underline (same convention as top nav), inactive `--text-secondary`.

**Work Information fields** (2-column form grid, `--muted` inputs): Department, Manager, Working Schedule, Company | Job Position, Work Location, Status, Work Email.

---

## Screen: Departments (list + simple form)

Not detailed in the wireframes beyond being a menu item — treat as a simple list: Department name, head count, manager, color swatch (matching the icon-chip mapping table above so the color is configurable per department, not hardcoded). Form: name, manager, parent department (optional), color picker constrained to the token palette (`--coral`, `--sky`, `--ink`, `--warning`, `--success`) so new departments stay inside the system rather than introducing arbitrary hues.

---

## Screen: Working Schedule — List

(This one already has a real, non-wireframe reference — keep its exact structure, re-skin to tokens.)

**Header**: `+ New Schedule` primary button, "Working Schedules" title. Sub-tabs: List / Calendar (underline style, same as Employee Form tabs). Toolbar: search pill, Filter button (outline), Columns button (outline).

**Table columns**: Schedule Name, Days/Week, Hours/Week, Company, Status (pill). Selected row: 3px `--coral` left border + `--coral-bg` tint (replacing the original blue selection — keep the *pattern* of a highlighted selected row, recolor to brand). Status pill: `--success` soft for Active, `--danger` soft for Inactive.

## Screen: Working Schedule — Form

**Header**: "← Back to list" + schedule name (Clash Display 600, 18px).

Top fields (2-col grid): Schedule Name, Company | Days per Week, Hours per Week | Timezone (full width or 3rd column).

**Weekly Schedule table**: "+ Add Day" outline button top-right of the section header. Columns: Day, Start Time, End Time, Break, Hours (calculated, `--text-secondary`, not editable), remove "×" icon (`--text-muted`, turns `--danger` on hover) per row. Footer row: "Total Weekly Hours: 40h" right-aligned, bold.
