# Hinthar Dashboard — Design System v2 & Staff Frontend Revamp Blueprint

> **Status:** Authoritative Specification (Locked In for Production Rollout)  
> **Live Interactive Prototype & Token Studio:** `/design-system`  
> **Shared Primitives Module:** `components/design-system/v2-primitives.tsx`

---

## 1. Aesthetic & Theme Architecture (Strict 2-Mode Monochrome)

Hinthar v2 retires the legacy 3-palette matrix (`emerald` / `mono` / `amoled`) and enforces **strictly two high-contrast operational modes (`Light` & `Dark`)** with zero decorative brand accents.

### 1.1 3-Tier Surface Contrast Hierarchy

| Surface Tier | Token | Light Mode Spec | Dark Mode Spec | Primary Usage |
| :--- | :--- | :--- | :--- | :--- |
| **Tier 01 — Canvas** | `--background` | `#F4F4F5` (`oklch(0.985 0.001 286)`) | `#09090B` (Zinc 950) | App shell viewport & recessed workspace floor so elevated modules stand out via 1px structural borders without drop shadows. |
| **Tier 02 — Module** | `--card` | `#FFFFFF` (Pure White) | `#121215` (Elevated Charcoal) | `SystemHeader`, `DataModule` frames, 7-day timetable cards, and slide-over `InspectorSheet` drawers. |
| **Tier 03 — Elevated / Chrome** | `--popover` / `--muted` | `#FAFAFA` / `#F4F4F5` | `#18181C` / `#1B1B20` | Docked command toolbars, uppercase table headers (`h-9`), dropdown menus, and sticky pagination footers. |
| **Structural Hairline** | `--border` | `#E4E4E7` (`oklch(0.92 0.004 286.32)`) | `#242429` | Crisp `1px` exposed structural grid dividers separating sidebar, command header, and table modules. |
| **Primary Monochrome** | `--primary` | `#18181B` (Zinc 900) | `#FAFAFA` (Zinc 50) | Primary CTAs, active tab underlines, active filter pills (`LVL`), and focus rings. |

### 1.2 Semantic Telemetry Colors (Reserved Strictly for Status Meaning)

Color is never used for decorative UI chrome. Chromatic tokens are reserved exclusively for real-time attendance, session, and gate telemetry:

- **Present / Completed (`--success`):** Emerald (`#109868` Light / `#22C58B` Dark)
- **Late / Substitute Active (`--warning`):** Amber (`#D9820F` Light / `#F59E0B` Dark)
- **Absent / Revoked / Exception (`--destructive`):** Crimson (`#E12D39` Light / `#F43F5E` Dark)
- **Excused / Archived:** Neutral Steel (`--attendance-excused` / `--muted-foreground`)

---

## 2. Geometry, Spacing & Typography

1. **Crisp Tactical Geometry (`--radius: 0.25rem` / `4px`):**
   - Outer module containers (`SystemHeader`, `DataModule`): `rounded-md` (`6px`) or `rounded-sm` (`4px`) with `1px border-border`.
   - Buttons (`components/ui/button.tsx`), inputs, select triggers, and slot cards: `rounded-sm` (`4px`).
   - Micro-badges (`CodeChip`, `TelemetryTag`): `rounded-[2px]` (`2px` corner radius).
2. **Zero Double Borders & Zero Detached Toolbars:**
   - Search inputs, filter pills, bulk-selection actions, data tables, and pagination footers must be docked inside a single unified `<DataModule />` frame (`0px` gap between toolbar, table header, body, and footer).
3. **Typography & Tabular Discipline:**
   - **Page Titles:** `text-xl font-bold tracking-tight text-foreground` (`20px`)
   - **Overlines & Table Headers:** `font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground`
   - **Primary Table Cell Copy:** `text-[13px] font-medium text-foreground`
   - **Codes, Timestamps, Rates & Counts:** Always `font-mono tabular-nums` (`HIS-26-1042`, `09:00 - 10:30`, `98.2%`, `23/24`) so vertical columns align to the pixel.
4. **Motion Discipline:**
   - Persistent layout chrome (`AppSidebar`, top command bar, tab bars) must **never** re-run entrance animations (`useGsapEnter`) on route transitions.

---

## 3. Education Center Domain Rules

Hinthar operates as a **7-day flexible education center**, not a traditional homeroom school. All frontend views must enforce these domain rules:

1. **No Homeroom Teachers or Fixed Academic Terms on Cohorts:**
   - Teachers are assigned per subject and timetable slot (`assignedTeacher` / `substituteTeacher`), never as a single homeroom teacher on a cohort.
   - The education center does not operate on traditional academic years or school terms.
   - Cohort tables and inspectors display: **Cohort Code** (`IG K1`, `IAL A1`, `Year8 A`), **Education Level** (`IGCSE`, `IAL`, `Year 6–9`), **Stream** (`K · 1`), **Enrolled Students** (`24 students`), and **Subject Offerings / Weekly Slots** (`6 subjects · 18 slots`).
2. **7-Day Flexible Timetable (`MON`–`SUN`, No Fixed Bell Periods or Lunch Rows):**
   - Classes run across all 7 days of the week (`Mon`, `Tue`, `Wed`, `Thu`, `Fri`, `Sat`, `Sun`), including weekend intensive clinics and practicals.
   - There are **no fixed bell periods (`P1 / P2 / P3`)** and **no fixed lunch break rows** in the timetable grid.
   - The Schedule workspace renders a **7-column day grid (`MON | TUE | WED | THU | FRI | SAT | SUN`)** where each day column stacks its time-sorted class cards with their exact start/end times (`09:00 - 10:30`, `11:00 - 13:00`, `14:00 - 15:30`, etc.).
3. **Option A — Global Subject Catalog Inside Academics Hub (`/classes`):**
   - `Subject` is a global catalog entity (supporting cross-cohort offerings and ad-hoc sessions where `class_obj = null`).
   - Instead of a separate top-level sidebar link, the Global Subject Catalog lives as a peer tab (`Cohorts | Subject Catalog`) inside `/classes` (**Academics Hub**), with inline quick-add and cohort/teacher mapping.

---

## 4. 16-to-7 Navigation & Route Consolidation Plan

The legacy 16 flat sidebar links and middleman class-picker pages are consolidated into **7 high-velocity staff hubs**:

| # | V2 Staff Hub | Primary Route | Legacy Routes Absorbed / Retired | Key UX Consolidation |
| :- | :--- | :--- | :--- | :--- |
| **01** | **Overview** | `/overview` | `/overview`, `/analytics-cards` | Real-time campus pulse, daily check-in telemetry, and active substitute/absence queues. |
| **02** | **Check-In** | `/check-in` | `/check-in`, `/check-in/passes`, `/check-in/management` | Retires the 980-line `/check-in/management` monolith into a clean `Daily Roll | Scan Log` workspace + terminal launcher. |
| **03** | **Attendance** | `/attendance` | `/attendance`, `/attendance/classes/[classId]` | Eliminates the middleman class-picker page; opens directly into the Roll Matrix with `<CohortSwitcher />` and `<RollStatusControl />`. |
| **04** | **Schedule** | `/schedule` | `/schedule`, `/schedule/[classId]`, `/substitutions` | Eliminates the middleman class-picker page; opens directly into the 7-day (`MON–SUN`) timetable with slide-over substitute override. |
| **05** | **Academics** | `/classes` | `/classes`, `/classes/[classId]`, `/subjects` | Unified `Cohorts | Subject Catalog` hub with deduplicated 5-column cohort table and slide-over cohort inspector. |
| **06** | **Directory** | `/students` | `/students`, `/students/[id]`, `/teachers`, `/check-in/passes` | Unified Student & Faculty directory with inline slide-over QR credential inspector (`View QR` / `Revoke` / `Regenerate`). |
| **07** | **Communications** | `/communications` | `/communications`, `/announcements`, `/guardian-alerts` | Broadcast announcements, absence notifications, and guardian dispatch logs. |

---

## 5. Enforced V2 Component Primitives (`components/design-system/v2-primitives.tsx`)

Every production page in the rollout must compose these 7 shared primitives:

1. **`<SystemHeader />`**:
   - Unified page header frame with top monospace domain/breadcrumb overline, `20px` bold title, inline tabular telemetry metrics separated by `1px` vertical dividers, primary action slot, and optional docked bottom underline tabs (`tabs`).
2. **`<DataModule />`**:
   - Single-border container (`rounded-md border border-border bg-card overflow-hidden`) housing a docked command toolbar (search input + filter pills + contextual bulk-selection bar), flush table/grid viewport, and docked `COUNT ALL //` pagination footer.
3. **`<CohortSwitcher />`**:
   - Full-width (`w-full`) non-shifting command bar for `/schedule` and `/attendance`: left `LVL` segmented filter (`ALL | IG | IAL | YR`) + fixed-width `w-[260px]` `<Select>` cohort trigger + anchored `<` `>` stepper buttons + right-aligned term/enrollment summary and `Ad-hoc` session toggle.
4. **`<RollStatusControl />`**:
   - Interactive spreadsheet-cell dropdown trigger (`h-7 min-w-[128px]`) for editable attendance matrices, displaying a semantic status dot + uppercase status (`PRESENT`, `LATE`, `ABSENT`, `EXCUSED`) + divided chevron trigger with `[P] / [L] / [A] / [E]` option shortcuts.
5. **`<TelemetryTag />`**:
   - **Strictly read-only** `2px`-radius (`rounded-[2px]`) status badge with `size-1.5` indicator pip and uppercase monospace label.
6. **`<CodeChip />`**:
   - `2px`-radius monospace identifier chip for cohort codes (`IG K1`), student IDs (`HIS-26-1042`), subject codes (`SUB-01`), and rooms (`RM-201`), with optional `border-l-2 border-l-foreground` accent.
7. **`<InspectorSheet />`**:
   - Contextual right-hand slide-over drawer (`sm:max-w-[420px]`) with tactical `CodeChip` + `TelemetryTag` header, 2-column `TELEMETRY ATTRIBUTES` grid, scrollable custom body (QR badge preview, substitute teacher override, dated occurrences), and sticky footer action bar.

---

## 6. Phased Production Rollout Checklist

- [x] **Phase 0 — Design System v2 & Interactive Flow Studio (`/design-system`)**:
  - Locked in strict Light/Dark monochrome tokens in `app/globals.css` and `4px` button geometry in `components/ui/button.tsx`.
  - Built all 7 shared primitives in `components/design-system/v2-primitives.tsx` and validated all 4 interactive staff workflows in `components/design-system/v2-flows-showcase.tsx`.
- [ ] **Phase 1 — App Shell & Navigation Consolidation (`components/app-sidebar.tsx`, `components/site-header.tsx`)**:
  - Switch `Sidebar` from `variant="inset"` to flush `1px border-r` structural layout, remove `gsap.fromTo` header re-animations, and consolidate the sidebar to the 7 staff hubs.
- [ ] **Phase 2 — Academics Hub (`/classes` + `/subjects` Tab Integration)**:
  - Deduplicate the `/classes` cohort table using `<SystemHeader />`, `<DataModule />`, and `<InspectorSheet />` (no homeroom column) and mount the Global Subject Catalog as the second tab.
- [ ] **Phase 3 — Directory & Check-In Hub (`/students`, `/check-in`)**:
  - Add the slide-over QR credential inspector (`<InspectorSheet />` + `<QrCanvas />`) to `/students` and replace `/check-in/management` with the unified `Daily Roll | Scan Log` workspace.
- [ ] **Phase 4 — Direct Schedule & Attendance Workspaces (`/schedule`, `/attendance`)**:
  - Eliminate the middleman class-picker pages, mount the full-width `<CohortSwitcher />`, render the 7-day (`MON–SUN`) flexible education-center timetable on `/schedule`, and wire `<RollStatusControl />` into `/attendance`.
