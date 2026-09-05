# PeoplePay360 — "Daybook" Design System
## 00 · Foundations (read this file first, in every screen-build)

This supersedes all earlier design docs. Source: the Twisty dashboard reference + the 33-screen functional wireframe set (Login → Employees → Contracts → Attendance → Time Off → Payroll → Dashboard). This file holds everything shared across screens. Each other file (`01-employees.md`, `02-contracts.md`, etc.) covers one module's specific screens and assumes you've read this one.

A daybook is the ledger where a business first records the day's transactions — the name fits an app that's literally recording attendance, leave, and pay day by day.

---

## 1. What we took from Twisty, and where it goes

| Device in Twisty | What it looked like | Where it's reused in PeoplePay360 |
|---|---|---|
| Icon-chip categorization | Colored rounded-square badge per project | Time Off Type color, Department color on Employee cards, Contract status icon |
| Dot-and-stem trend chart | Daily income, one peak day highlighted + floating value pill | Monthly Net Salary Trend (Dashboard) |
| Segmented tally/barcode stat | Proposals → Interviews → Hires, 3 columns of thin bars | Payslip Status split (Draft / To Approve / Paid) |
| Accordion rows in one card | Recent Projects list, one row expanded inline | Payruns list, Time Off Requests list |
| Circular chip selector | S M T W T F S day picker, one filled | Payrun wizard step indicator, weekly attendance strip |
| Barely-there shadow | Contrast from white-card-on-tinted-page, not drop shadow | Every card, everywhere |
| Textured promo card | Upsell card with subtle dot pattern | Setup/empty-state nudge cards |

Full implementation detail for each is in §6.

## 2. Color Tokens

```css
:root {
  /* Brand — used sparingly, only for primary actions and identity */
  --coral:          #F1502A;
  --coral-strong:   #D8431F;
  --coral-bg:       rgba(241,80,42,0.10);

  /* Ink — authority text, solid pills, active states */
  --ink:            #171B26;
  --ink-soft:       #2E3344;

  /* Secondary accent */
  --sky:            #6F93E3;
  --sky-bg:         rgba(111,147,227,0.12);

  /* Surfaces */
  --page:           #F1F1F3;   /* app canvas */
  --card:           #FFFFFF;   /* card surface */
  --muted:          #EFEFF2;   /* pills, search bar, icon buttons, inactive chips */
  --border:         #E8E9EC;

  /* Text */
  --text-primary:   #171B26;
  --text-secondary: #888D96;
  --text-muted:     #ABAFB6;
  --text-inverse:   #FFFFFF;

  /* Status semantics — distinct from brand coral on purpose, so "danger" is never
     confused with "primary action" */
  --success:        #2FA36B;  /* Active, Approved, Running, Paid, Present */
  --success-bg:     rgba(47,163,107,0.12);
  --warning:        #E8A33D;  /* To Approve, Pending, Draft-warning, Late */
  --warning-bg:     rgba(232,163,61,0.14);
  --danger:         #E15252;  /* Expired, Absent, Refused, Duplicate warning */
  --danger-bg:      rgba(225,82,82,0.12);
  --neutral-pill:   #ABAFB6;  /* Draft, Not Paid, Inactive — outline style */
  --neutral-pill-bg:rgba(171,175,182,0.14);

  /* Elevation — deliberately minimal */
  --shadow-card:    0 1px 2px rgba(23,27,38,0.04);
  --shadow-float:   0 16px 32px rgba(23,27,38,0.10); /* modals/dropdowns only */
  --shadow-focus:   0 0 0 3px rgba(241,80,42,0.16);

  --r-sm:  10px;   /* icon chips */
  --r-md:  14px;   /* inputs, buttons, table rows */
  --r-lg:  24px;   /* cards, modals */
  --r-pill: 999px; /* badges, tags, search bar, nav pills */
}
```

**Don't**: use coral for danger/error states (that's what `--danger` is for — keeping them visually distinct means "this is broken" never looks like "click here"). Don't add drop shadow to every card — the whole system reads as flat/confident because contrast comes from `--card` vs `--page`, not shadow.

## 3. Typography

| Role | Font | Notes |
|---|---|---|
| Display / headings | **Clash Display** (Fontshare, free) — 500/600/700 | The rounded-geometric character Twisty's "Income Tracker" headline has. Fallback: `Cabinet Grotesk`. |
| Body / UI | **General Sans** (Fontshare, free) — 400/500/600 | Nav links, labels, table body, buttons. Fallback: `Inter`. |
| Dense tabular data | **JetBrains Mono** — 400/500/600, `font-variant-numeric: tabular-nums` | Only inside payslip line-item tables and contract wage columns, where many rows of numbers must align. Big hero KPI numbers (Dashboard) use Clash Display bold instead, matching Twisty's own big-number treatment — not mono. |

```html
<link href="https://api.fontshare.com/v2/css?f[]=clash-display@500,600,700&f[]=general-sans@400,500,600&display=swap" rel="stylesheet">
```

**Scale**: Display 28–34px/700 (page titles) · Section 18–20px/600 · Body 14–15px/400–500 · Small/meta 12–13px/500.

**Don't**: ALL-CAPS labels, tracked-out eyebrows, dot-joined meta strings ("3 days · Sep 12 · Draft") — use a parenthetical or separate line instead.

## 4. App Shell

```
┌ ● PeoplePay360   Employees▾  Contracts▾  Attendance  Time Off▾  Payroll▾  ─────  [search] [◎][🔔] [avatar] ┐
├──────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│  Page title                                                                                                 │
│  Page content — bento/list/form per screen                                                                  │
└──────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

- **Logo lockup** (left): circular coral mark (simple monogram or leaf-style glyph) + "PeoplePay360" wordmark in Clash Display 600, `--ink`.
- **Nav** (center-left, matches the wireframes' exact dropdown grouping):
  | Nav item | Dropdown contents |
  |---|---|
  | Employees ▾ | Employees, Departments, Working Schedule |
  | Contracts ▾ | Contracts |
  | Attendance | *(flat link, no dropdown)* |
  | Time Off ▾ | Dashboard, Time Offs, Time Off Types, Allocations |
  | Payroll ▾ | Dashboard, Payruns, Payslips, Structures, Rules |

  Active item: `--ink` text, 2px `--coral` underline. Inactive: `--text-secondary`. Dropdown panel: `--card` bg, `--r-md`, `--shadow-float`, opens below on hover/click.
- **Right cluster** (直接 lifted from Twisty): a `--muted` pill search input ("Search employees, contracts, payslips…"), two circular `--muted` icon buttons (e.g. quick-attendance clock icon, notification bell — badge dot in `--coral` when unread), then the user avatar (circle, photo or initials on `--ink` bg).
- Shell background is `--page`; every screen's content cards sit on it in `--card`.

## 5. Component Base Specs

**Buttons**
- Primary: `--coral` bg, white text, `--r-md`, weight 600. Hover: `--coral-strong`.
- Secondary/outline: transparent, 1px `--border`, `--text-primary`. Hover: `--muted` bg.
- Destructive (Decline/Refuse/Delete): 1px `--danger` border, `--danger` text. Hover: `--danger-bg` fill.

**Inputs**: `--muted` bg, no border by default, `--r-md`. Focus: white bg + `--shadow-focus` ring.

**Status pill**: `--r-pill`, sentence case, 12px/600.
- Solid (primary status — Paid/Approved/Active/Running): `--ink` bg, white text — matches Twisty's dark-fill "Paid" pill exactly.
- Soft (secondary positive — Present, Done): `--success` text on `--success-bg`.
- Soft warning (To Approve, Pending, Draft): `--warning` text on `--warning-bg`.
- Soft danger (Expired, Absent, Refused, Duplicate): `--danger` text on `--danger-bg`.
- Outline neutral (Not Paid, Inactive): 1px `--neutral-pill` border, `--text-secondary` text, transparent fill.

**Icon chip** (category coding): 40×40px, `--r-sm`, colored bg per category (see per-module mapping tables), white or `--ink` icon, centered.

**Table**: header row `--text-secondary` 13px/600 sentence case, 1px `--border` bottom rule. Body rows 1px `--border` between, hover = `--muted` tint. No zebra striping.

**Card**: `--card` bg, `--r-lg`, `--shadow-card` (near-invisible), no border needed — separation comes from sitting on `--page`.

**Smart button** (Odoo-style stat widget on Employee form): pill-shaped, `--muted` bg, count in `--ink` bold + label in `--text-secondary`, matches Twisty's role-badge pill sizing. Hover: `--card` bg + 1px `--border`.

## 6. The Seven Reusable Motifs — implementation detail

**A. Dot-stem trend chart** — baseline of small text/date labels; thin 1.5px `--border` vertical stem per point rising to a `--sky` filled dot (6px). The peak/highlighted point instead gets: a soft vertical bar (very light `--sky-bg` gradient fill) behind its stem, an `--ink` filled dot, and a floating `--ink`-bg pill tooltip above showing the exact value in white bold text with a small triangle pointer.

**B. Segmented tally/barcode stat** — 2–4 columns separated by 1px `--border` vertical rules. Each column: big number (Clash Display bold), label below (`--text-secondary`), then a row of ~12 thin vertical bars (3px wide, 2px gap) as a density indicator, colored per column's semantic (`--neutral-pill` for Draft, `--warning` for Pending, `--success` for Paid).

**C. Icon-chip category system** — see per-module color mapping tables in each module file. Rule: the same category always gets the same chip color everywhere it appears (e.g. "Paid Time Off" is always `--sky`, never recolored per screen).

**D. Accordion list row** — list lives in one `--card` container, rows separated by 1px `--border` (not separate card-per-row). One row (usually the most recent/most relevant) is expanded by default, showing secondary detail lines and a tag row inline. Chevron icon on the row's right toggles expand/collapse — rotates 180° on open, no other motion.

**E. Circular chip selector** — 32px circle, `--muted` bg + `--text-secondary` text when inactive; `--ink` bg + white text when active/selected. Used in a horizontal row with even gaps.

**F. Textured nudge card** — `--muted` bg with a very subtle dot-grid pattern (radial-gradient dots, 3% opacity) in one corner, used only for setup prompts/empty states, never for core data.

**G. Divided stat header** — 2–5 stat blocks in a row, separated by 1px `--border` vertical rules, each with a label (`--text-secondary` 13px) above a bold number (Clash Display, 20–24px).

## 7. Motion

One rule: motion answers an action, it doesn't run on its own.

| Moment | Behavior |
|---|---|
| KPI numbers (Dashboard) | Count up once on load/filter change |
| Accordion row | Expand/collapse height + chevron rotate, on click |
| Approve / Refuse | Button press (scale 0.98), pill updates immediately, no extra flourish needed — Twisty itself doesn't overdo this |
| Nav active state | Underline slides to new position, on click |
| Dropdown menus | Fade + 4px slide down, 120ms |

No infinite background animation, no stagger-fade on every card load.

## 8. Libraries

```bash
npm install framer-motion cmdk sonner recharts
```
- `recharts` — for the dot-stem trend line and department bar chart, restyled to tokens above (no default chart-library colors).
- `framer-motion` — accordion expand, nav underline slide.
- `cmdk` / `sonner` — optional, same role as before (command palette, toasts) if you want them; not required by any wireframe.
- Icons: `lucide-react`, stroke-width 1.6, sized 18–20px, colored `currentColor`.

## 9. Do / Don't

**Do**: keep shadows near-invisible and let fill-color contrast do the work · give every status pill the correct solid/soft/outline treatment from §5, don't invent new ones · keep the same icon-chip color for a category everywhere it appears · use accordion rows for any list where "recent/current" matters more than "complete."

**Don't**: recolor coral onto danger/error states · add a second bright accent "for variety" · stack fade-in animations · use ALL-CAPS or dot-joined meta text · give mono font to anything that isn't tabular numeric data in a dense table.
