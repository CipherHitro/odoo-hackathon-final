# DESIGN.md — PeoplePay360 HR & Payroll

---

## Design Direction

**Who uses this, doing what:** HR officers and payroll admins spend most of their workday inside this tool. They're processing payslips under time pressure, tracking attendance anomalies, approving leave — data-dense, action-oriented work done on a laptop. This is not a consumer product. It's an internal ops tool that needs to feel authoritative and fast, not decorative.

**Design point of view:** Dense-but-breathable data tool. Sharp, structured, no gratuitous softness. The interface steps back to let data lead — colors are used semantically (status signals), not aesthetically. The *one* moment of expressive design is the Payroll Dashboard, where charts and KPI cards earn visual weight because they communicate actual insight.

---

## Typography

**Primary font:** `"DM Sans"` (400, 500, 600) — geometric, slightly neutral, excellent at small sizes in table cells without feeling sterile. Fallback: `system-ui, -apple-system, sans-serif`

**Monospace (references, codes, IDs):** `"DM Mono"` (400, 500) — for contract references like `CON/2026/0042`, salary codes like `BASIC`, amounts. Fallback: `monospace`

**Type scale:**

| Token | Size | Line-height | Weight | Usage |
|-------|------|-------------|--------|-------|
| `--text-xs` | 11px | 16px | 400 | Table sub-labels, helper text |
| `--text-sm` | 13px | 20px | 400 | Table body, form labels |
| `--text-base` | 14px | 22px | 400 | Default body text, inputs |
| `--text-md` | 15px | 24px | 500 | Card content, descriptions |
| `--text-lg` | 18px | 28px | 600 | Section headings |
| `--text-xl` | 22px | 30px | 600 | Page titles |
| `--text-2xl` | 28px | 36px | 600 | KPI numbers on dashboard |
| `--text-3xl` | 36px | 44px | 600 | Hero KPI (total salary) |

Letter-spacing: `-0.01em` on headings `--text-lg` and above. Body text: `0`. Keep body line length to ~72ch max.

---

## Color System

Context: an HR tool used under office lighting; dark mode is out of scope (time budget). Light background, high contrast for accessibility.

### Primary Palette

```
--color-primary:       #2563EB   /* Royal blue — action buttons, active nav, links */
--color-primary-hover: #1D4ED8
--color-primary-light: #EFF6FF   /* Light blue tint for selected rows, active states */
--color-primary-muted: #BFDBFE   /* Border on focus rings */
```

*Rationale: Blue reads as trustworthy and institutional, fitting for a payroll tool. Not the generic default blue — this specific shade (#2563EB) has enough saturation to read well on white without looking garish.*

### Neutral Scale

```
--neutral-0:   #FFFFFF
--neutral-50:  #F8FAFC   /* Page background */
--neutral-100: #F1F5F9   /* Table header bg, sidebar bg */
--neutral-200: #E2E8F0   /* Borders, dividers */
--neutral-300: #CBD5E1   /* Disabled borders */
--neutral-400: #94A3B8   /* Placeholder text, muted icons */
--neutral-600: #475569   /* Secondary text */
--neutral-800: #1E293B   /* Primary text */
--neutral-900: #0F172A   /* Nav bar, darkest text */
```

### Semantic Colors

```
--color-success:       #16A34A   /* Active status, Approved, Running */
--color-success-bg:    #F0FDF4
--color-warning:       #D97706   /* Warnings, To Approve, Draft */
--color-warning-bg:    #FFFBEB
--color-danger:        #DC2626   /* Errors, Refused, Expired */
--color-danger-bg:     #FEF2F2
--color-info:          #0891B2   /* Info states */
--color-info-bg:       #ECFEFF
```

### Status Badge Colors (used throughout all list views)

| Status | Text | Background |
|--------|------|------------|
| Active / Running / Approved / Present / Paid / Done | `--color-success` | `--color-success-bg` |
| To Approve / Draft / Validated / Pending | `--color-warning` | `--color-warning-bg` |
| Expired / Refused / Absent / Inactive | `--color-danger` | `--color-danger-bg` |

---

## Spacing & Sizing

Base unit: **4px**. All spacing is multiples of 4px.

```
--space-1:  4px
--space-2:  8px
--space-3:  12px
--space-4:  16px
--space-5:  20px
--space-6:  24px
--space-8:  32px
--space-10: 40px
--space-12: 48px
--space-16: 64px
```

**Page layout:**
- Navbar height: 52px
- Sidebar width: 0 (navbar-only navigation, no sidebar — matches the demo screenshots)
- Page content padding: `--space-6` (24px) horizontal, `--space-5` (20px) vertical
- Table row height: 44px
- Card padding: `--space-5` (20px)

---

## Shape & Elevation

**Border radius:**
```
--radius-sm:   4px    /* Inputs, tags, badges */
--radius-md:   6px    /* Cards, modals, buttons */
--radius-lg:   8px    /* Kanban cards */
```

**Shadow hierarchy** (applied with intent, not uniformly):
```
--shadow-none: none
--shadow-sm:   0 1px 2px rgba(0,0,0,0.06)       /* Inline elements, badges */
--shadow-md:   0 2px 6px rgba(0,0,0,0.08)       /* Cards, dropdowns */
--shadow-lg:   0 8px 24px rgba(0,0,0,0.10)      /* Modals, drawers */
```

Rule: tables and list rows have no shadow. Cards on the dashboard get `--shadow-md`. Modals and forms panels get `--shadow-lg`. Never apply the same shadow level to more than one tier.

---

## Component Specifications

### Navigation Bar
- Height: 52px, background `--neutral-900`
- Logo: `HR` monogram badge in `--color-primary`, `--text-md`, medium weight
- Module tabs: `Employees ▾`, `Contracts ▾`, `Attendance`, `Time Off ▾`, `Payroll` — white text, `--text-sm` 500 weight
- Active module: bottom border 2px `--color-primary`, text white
- Right: Attendance widget button (colored dot indicator), user avatar
- Dropdown menus: `--neutral-0` bg, `--shadow-md`, `--radius-md`, `--text-sm`, `--neutral-800` text

### Buttons

| Variant | Background | Text | Border | Hover |
|---------|-----------|------|--------|-------|
| Primary | `--color-primary` | white | none | `--color-primary-hover` |
| Ghost | transparent | `--neutral-800` | `--neutral-200` 1px | `--neutral-100` bg |
| Danger | `--color-danger` | white | none | darken 10% |
| Link | transparent | `--color-primary` | none | underline |

Button padding: `--space-2` `--space-4` (8px 16px). Height: 34px. Border-radius: `--radius-md`. Font: `--text-sm` 500. Disabled: 50% opacity, cursor not-allowed. Focus: 2px `--color-primary-muted` ring.

### Inputs / Form Fields

- Height: 36px, border 1px `--neutral-200`, `--radius-sm`, `--text-sm`
- Focus: border `--color-primary`, `box-shadow: 0 0 0 3px --color-primary-muted`
- Placeholder: `--neutral-400`
- Error: border `--color-danger`, small helper text below in `--color-danger`, `--text-xs`
- Label: `--text-sm` 500, `--neutral-600`, 4px above field

### Tables

- Header row: `--neutral-100` bg, `--text-xs` 600, `--neutral-400` text, uppercase, `--space-3` padding
- Body rows: white bg, 1px `--neutral-200` bottom border, `--text-sm`, `--neutral-800`
- Hover: `--color-primary-light` bg on the entire row
- Selected: `--color-primary-light` bg + 3px left border `--color-primary`
- Clickable row cursor: pointer
- Monospace columns (reference, code, amount): `"DM Mono"` `--text-sm`

### Status Badges

- `border-radius: 9999px` (pill)
- padding: `2px 8px`, `--text-xs` 500
- Use semantic colors from the table above
- Never use generic grey — every status has a semantic meaning

### Cards (Dashboard only)

- White bg, `--shadow-md`, `--radius-md`, padding `--space-5`
- Title: `--text-sm` 500, `--neutral-600`
- Value: `--text-2xl` 600, `--neutral-900`
- Subtext: `--text-xs`, `--neutral-400`

### Kanban Cards (Employee Kanban view)

- White bg, `--shadow-sm`, `--radius-lg`, padding `--space-4`
- Avatar initials circle: `--color-primary-light` bg, `--color-primary` text, 44px, `--radius-lg`
- Name: `--text-md` 600
- Subtitle: `--text-sm`, `--neutral-600`
- Status dot: 8px circle in semantic success/danger color
- Hover: `--shadow-md`, translate Y -1px (subtle lift only)

### Modals / Slide-in Panels

- Right-side drawer for Create/Edit forms (matches the demo layout)
- Width: 400px, height: full viewport
- Overlay: `rgba(0,0,0,0.3)`
- Background: `--neutral-0`
- `--shadow-lg`
- Close (×) top right, Escape key closes

### Empty States

Copy pattern: specific, not generic.  
- "No employees yet. Create the first one." (not "Nothing here.")
- "No attendance records for this period."
- Icon: simple stroke icon, `--neutral-300`, 48px
- CTA button only if the user has permission to create

### Loading States

- Skeleton shimmer on table rows only (not full-page spinners)
- Shimmer: `--neutral-100` → `--neutral-200` gradient animation
- Buttons: show a spinner inside the button, disable it — never show a full-page loader for a button action

---

## The One Deliberate Moment — Payroll Dashboard

Everything else in the app is disciplined and quiet. The Payroll Dashboard is the exception: it's where all the data comes together and needs to communicate real business intelligence at a glance. Specific attention here:

- **KPI row** at the top: 5 cards full-width, large number, clear label, one trend indicator (% vs previous). This row should immediately answer: "How did we do this period?"
- **Charts:** Use `recharts` or `Chart.js`. Bar chart (Salary by Department) uses `--color-primary` bars. Line chart (Monthly Trend) uses a single `--color-primary` line with a subtle area fill in `--color-primary-light`. Keep chart backgrounds white with `--shadow-md`.
- **Alerts panel** top-right: red-dot indicators with actual messages ("2 employees missing bank account"), not generic warnings. This is the thing a payroll admin looks at first thing every morning.
- **Attendance & Time Off widgets** at the bottom: smaller, secondary importance. Simple counts, not charts.

---

## Motion

Minimal. Only on user-initiated actions:

- Dropdown open: fade in 100ms ease-out
- Drawer slide in: 200ms `cubic-bezier(0.4, 0, 0.2, 1)` from right
- Modal overlay: fade 150ms
- Kanban card hover: translate Y -1px, 100ms ease-out
- Row highlight on select: background-color 80ms ease
- No entrance animations on page load, no skeleton fade-in, no staggered list reveals

---

## Copy Voice

- **Buttons say the action:** "Save employee", "Create contract", "Compute payslip", not "Submit" or "Confirm"
- **Errors say what happened and what to do:** "No active contract found for this employee. Create a contract before computing the payslip.", not "Computation failed."
- **Status labels are plain English:** "Running" not "RUNNING", "To Approve" not "PENDING_APPROVAL"
- **Table column headers are sentence case:** "Work email", "Start date", not "WORK EMAIL"

---

## CSS Token Block

Drop this into `src/index.css` `:root { }` after removing the existing wave-card tokens:

```css
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=DM+Mono:wght@400;500&display=swap');

:root {
  /* Typography */
  --font-sans: 'DM Sans', system-ui, -apple-system, sans-serif;
  --font-mono: 'DM Mono', monospace;

  --text-xs:   11px;
  --text-sm:   13px;
  --text-base: 14px;
  --text-md:   15px;
  --text-lg:   18px;
  --text-xl:   22px;
  --text-2xl:  28px;
  --text-3xl:  36px;

  /* Primary */
  --color-primary:       #2563EB;
  --color-primary-hover: #1D4ED8;
  --color-primary-light: #EFF6FF;
  --color-primary-muted: #BFDBFE;

  /* Neutrals */
  --neutral-0:   #FFFFFF;
  --neutral-50:  #F8FAFC;
  --neutral-100: #F1F5F9;
  --neutral-200: #E2E8F0;
  --neutral-300: #CBD5E1;
  --neutral-400: #94A3B8;
  --neutral-600: #475569;
  --neutral-800: #1E293B;
  --neutral-900: #0F172A;

  /* Semantic */
  --color-success:     #16A34A;
  --color-success-bg:  #F0FDF4;
  --color-warning:     #D97706;
  --color-warning-bg:  #FFFBEB;
  --color-danger:      #DC2626;
  --color-danger-bg:   #FEF2F2;
  --color-info:        #0891B2;
  --color-info-bg:     #ECFEFF;

  /* Spacing */
  --space-1:  4px;
  --space-2:  8px;
  --space-3:  12px;
  --space-4:  16px;
  --space-5:  20px;
  --space-6:  24px;
  --space-8:  32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;

  /* Shape */
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;

  /* Shadow */
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.06);
  --shadow-md: 0 2px 6px rgba(0,0,0,0.08);
  --shadow-lg: 0 8px 24px rgba(0,0,0,0.10);
}

* { box-sizing: border-box; }

body {
  font-family: var(--font-sans);
  font-size: var(--text-base);
  color: var(--neutral-800);
  background: var(--neutral-50);
  line-height: 22px;
  -webkit-font-smoothing: antialiased;
}
```
