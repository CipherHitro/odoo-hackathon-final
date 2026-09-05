# 07 · Login & User Management (Admin)

Reads on top of `00-foundations.md`.

---

## Screen: Login

Centered `--card` panel, `--r-lg`, `--shadow-float` (one of the few earned float-shadows — it's the only element on the page), max-width ~420px, on `--page` background.

Header strip inside the card (top, `--muted` bg, rounded top corners only): "HR Portal" small label.

Body: "Welcome back" (Clash Display 700, 24px), "Sign in to continue to your workspace" (`--text-secondary`).

Fields: Work Email, Password — standard `--muted` inputs per foundations §5. "Forgot password?" text-link, `--sky`, right-aligned above the button.

`Sign In` — full-width `--coral` primary button.

Footer text below the card, `--text-muted`, small: "Accounts are created by an administrator."

## Screen: User Management (Admin only)

Header: "User Management" + an `ADMIN ONLY` outline pill tag in `--sky` next to the title (small, `--r-pill`, signals restricted access without being alarming — not `--danger`, since this isn't an error state).

Toolbar: `+ New User` primary, search pill, "Role Filter" outline button.

**Table**: User, Employee, Work Email, Role, Status (pill: Active → `--success` soft outline style, matching the wireframe's light-outline "Active" pill rather than a heavy solid fill — this table has a lot of rows, so keep pills light). Selected row: 3px `--coral` left border (same convention as the Working Schedule list).

**Side panel** ("Create / Edit User", opens on `+ New User` or selecting a row): `--card`, `--r-lg`, `--shadow-float`, slides in from the right.
- Employee (searchable select, required)
- Work Email (required)
- Roles — **radio button group, single or multi depending on your access model**: Employee, HR Manager, HR Payroll User, HR Payroll Admin, Admin. Each radio row uses standard radio styling but the selected option's label turns `--ink` bold; unselected stay `--text-secondary`.
- Account Status — toggle pill (Active/Inactive), `--success`/`--neutral-pill`.
- `Create User / Save Access` — full-width `--coral` primary button at the bottom of the panel.

Per the wireframe's own rule: a user must never be able to assign themselves a role. If the panel is opened on the currently-logged-in admin's own record, disable the Roles field entirely and show a small `--text-muted` note explaining why, rather than silently hiding it.
