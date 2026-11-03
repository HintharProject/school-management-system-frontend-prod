"use client"

import * as React from "react"
import {
  Layers,
  Moon,
  Plus,
  Rabbit,
  SlidersHorizontal,
  Sun,
  Turtle,
} from "lucide-react"
import { useMotionPreference } from "@/components/motion-preference-provider"
import { useTheme, type ThemeMode } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { V2FlowsShowcase } from "./v2-flows-showcase"
import {
  CodeChip,
  CohortSwitcher,
  DataModule,
  InspectorSheet,
  RollStatusControl,
  type RollAttendanceStatus,
  SystemHeader,
  TelemetryTag,
} from "./v2-primitives"

const SECTIONS = [
  { id: "mode", label: "00 // Mode & Motion" },
  { id: "colors", label: "01 // High-Contrast Color Spec" },
  { id: "geometry-typography", label: "02 // Geometry, Spacing & Type" },
  { id: "primitives", label: "03 // Enforced V2 Primitives" },
  { id: "flows", label: "04 // Interactive Staff Flow Prototypes" },
] as const

const SURFACE_SPECS = [
  {
    tier: "TIER 01 // CANVAS",
    name: "Canvas / Background",
    token: "--background",
    className: "bg-background border border-border",
    lightSpec: "oklch(0.975 0.002 286) · #F6F6F7",
    darkSpec: "oklch(0.130 0.005 286) · #0B0C0E",
    usage: "App shell viewport & recessed workspace floor so elevated modules pop without heavy drop shadows.",
  },
  {
    tier: "TIER 02 // MODULE",
    name: "Elevated Module / Card",
    token: "--card",
    className: "bg-card border border-border",
    lightSpec: "oklch(1.000 0 0) · #FFFFFF",
    darkSpec: "oklch(0.175 0.006 286) · #131519",
    usage: "DataModule tables, SystemHeader frames, and slide-over InspectorSheets.",
  },
  {
    tier: "TIER 03 // RECESSED CHROME",
    name: "Recessed Command Bar / Header",
    token: "--muted",
    className: "bg-muted border border-border",
    lightSpec: "oklch(0.952 0.003 286) · #EEEEF0",
    darkSpec: "oklch(0.215 0.007 286) · #1B1E24",
    usage: "Docked table command toolbars, uppercase table headers, and sticky pagination footers.",
  },
  {
    tier: "STRUCTURAL GRID",
    name: "Structural 1px Border",
    token: "--border",
    className: "bg-border",
    lightSpec: "oklch(0.885 0.005 286) · #DCDCE0",
    darkSpec: "oklch(0.275 0.008 286) · #262A32",
    usage: "Crisp 1px structural hairlines separating sidebar, command header, and module seams.",
  },
  {
    tier: "TACTICAL ACCENT",
    name: "Primary Monochrome Accent",
    token: "--primary",
    className: "bg-primary",
    lightSpec: "Zinc 900 · #18181B",
    darkSpec: "Zinc 50 · #FAFAFA",
    usage: "High-contrast monochrome active tabs, primary CTAs, accent CodeChips, and focus rings.",
  },
] as const

const SEMANTIC_STATUS_TONES = [
  {
    name: "Present / Success",
    status: "present" as const,
    token: "--attendance-present / --success",
    swatchClass: "bg-success",
    lightValue: "oklch(0.62 0.17 155) · #109868",
    darkValue: "oklch(0.72 0.17 157) · #22C58B",
  },
  {
    name: "Late / Warning",
    status: "late" as const,
    token: "--attendance-late / --warning",
    swatchClass: "bg-warning",
    lightValue: "oklch(0.75 0.16 78) · #D9820F",
    darkValue: "oklch(0.81 0.16 82) · #F59E0B",
  },
  {
    name: "Absent / Destructive",
    status: "absent" as const,
    token: "--attendance-absent / --destructive",
    swatchClass: "bg-destructive",
    lightValue: "oklch(0.60 0.21 20) · #E12D39",
    darkValue: "oklch(0.66 0.21 18) · #F43F5E",
  },
  {
    name: "Excused / Neutral",
    status: "excused" as const,
    token: "--attendance-excused / --muted",
    swatchClass: "bg-attendance-excused",
    lightValue: "oklch(0.58 0.04 292) · #7C7489",
    darkValue: "oklch(0.66 0.04 292) · #998FA8",
  },
  {
    name: "Campus / Info",
    status: "info" as const,
    token: "--attendance-campus / --chart-2",
    swatchClass: "bg-attendance-campus",
    lightValue: "oklch(0.58 0.19 259) · #2563EB",
    darkValue: "oklch(0.65 0.19 259) · #3B82F6",
  },
] as const

function SectionHeaderBlock({
  id,
  index,
  title,
  description,
}: {
  id: string
  index: string
  title: string
  description: string
}) {
  return (
    <div id={id} className="scroll-mt-28 border-b border-border pb-3">
      <div className="flex items-center gap-2 font-mono text-[11px] font-semibold tracking-wider text-primary uppercase">
        <span className="size-1.5 rounded-[1px] bg-primary" />
        <span>{index}</span>
      </div>
      <h2 className="mt-1 text-lg font-bold tracking-tight text-foreground">
        {title}
      </h2>
      <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
    </div>
  )
}

export function DesignSystemContent() {
  const { theme, setTheme } = useTheme()
  const { reducedMotion, toggleReducedMotion } = useMotionPreference()
  const [activeId, setActiveId] = React.useState<string>("mode")

  // Interactive states for Section 3 (Primitives Playground)
  const [demoTab, setDemoTab] = React.useState<string>("cohorts")
  const [demoSearch, setDemoSearch] = React.useState<string>("")
  const [demoCohort, setDemoCohort] = React.useState<string>("IG K1")
  const [demoRollStatus, setDemoRollStatus] =
    React.useState<RollAttendanceStatus>("present")
  const [demoSheetOpen, setDemoSheetOpen] = React.useState<boolean>(false)

  React.useEffect(() => {
    const nodes = SECTIONS.map((s) => document.getElementById(s.id)).filter(
      Boolean
    ) as HTMLElement[]
    if (nodes.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
        if (visible[0]?.target.id) setActiveId(visible[0].target.id)
      },
      { rootMargin: "-15% 0px -65% 0px", threshold: [0, 0.25, 0.5] }
    )
    nodes.forEach((n) => observer.observe(n))
    return () => observer.disconnect()
  }, [])

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-6 sm:px-6 md:px-8">
      {/* Top V2 System Header */}
      <SystemHeader
        domain="HINTHAR V2 DESIGN SYSTEM"
        breadcrumb={[
          { label: "SPECIFICATION & LIVE PROTOTYPE STUDIO" },
          { label: theme.toUpperCase() },
        ]}
        title="Design System v2 & Staff UX Revamp"
        description="High-contrast Light & Dark specification, structural 1px modular grid, enforced v2 primitives, and interactive staff workflow prototypes."
        metrics={[
          { label: "THEME MODES", value: "LIGHT / DARK ONLY" },
          { label: "STAFF NAV HUBS", value: "16 → 7", tone: "success" },
          { label: "ENFORCED PRIMITIVES", value: 6 },
        ]}
        actions={
          <div className="flex items-center gap-1.5">
            {(
              [
                { id: "light" as ThemeMode, label: "Light", icon: Sun },
                { id: "dark" as ThemeMode, label: "Dark", icon: Moon },
              ] as const
            ).map(({ id, label, icon: Icon }) => (
              <Button
                key={id}
                type="button"
                variant={theme === id ? "default" : "outline"}
                size="sm"
                className="h-8 gap-1.5 rounded-sm font-mono text-xs"
                onClick={() => setTheme(id)}
              >
                <Icon className="size-3.5" />
                {label}
              </Button>
            ))}
          </div>
        }
      />

      {/* Sticky Section Anchor Bar */}
      <nav
        aria-label="Design system v2 sections"
        className="sticky top-0 z-20 -mx-4 border-y border-border bg-background/95 px-4 py-2 backdrop-blur-sm sm:-mx-6 sm:px-6 md:-mx-8 md:px-8"
      >
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {SECTIONS.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className={cn(
                "shrink-0 rounded-sm border px-2.5 py-1 font-mono text-[11px] font-semibold uppercase transition-colors",
                activeId === section.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-transparent text-muted-foreground hover:border-border hover:bg-muted/60 hover:text-foreground"
              )}
            >
              {section.label}
            </a>
          ))}
        </div>
      </nav>

      {/* SECTION 00: STRICT LIGHT & DARK MODE + MOTION */}
      <section className="space-y-4">
        <SectionHeaderBlock
          id="mode"
          index="SECTION 00 // THEME & MOTION CONTRACT"
          title="Strictly Light & Dark Mode Only"
          description="The legacy 3-palette (emerald / mono / amoled) switcher is retired. Hinthar v2 enforces two high-contrast operational modes (Light & Dark) plus a reduced-motion gate."
        />

        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col justify-between rounded-md border border-border bg-card p-4">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                  SURFACE POLARITY
                </span>
                <TelemetryTag status="active">
                  ACTIVE: {theme.toUpperCase()} MODE
                </TelemetryTag>
              </div>
              <h3 className="text-sm font-bold text-foreground">
                Light Mode & Dark Mode Switcher
              </h3>
              <p className="text-xs text-muted-foreground">
                One-click polarity toggle with explicit 3-tier surface separation in both daylight classrooms and low-light admin offices.
              </p>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-3">
              <Button
                type="button"
                variant={theme === "light" ? "default" : "outline"}
                size="sm"
                className="gap-1.5 rounded-sm"
                onClick={() => setTheme("light")}
              >
                <Sun className="size-3.5" />
                Light Mode
              </Button>
              <Button
                type="button"
                variant={theme === "dark" ? "default" : "outline"}
                size="sm"
                className="gap-1.5 rounded-sm"
                onClick={() => setTheme("dark")}
              >
                <Moon className="size-3.5" />
                Dark Mode
              </Button>
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-md border border-border bg-card p-4">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                  MOTION GATE
                </span>
                <TelemetryTag status={reducedMotion ? "late" : "present"}>
                  {reducedMotion ? "REDUCED MOTION" : "FULL MOTION"}
                </TelemetryTag>
              </div>
              <h3 className="text-sm font-bold text-foreground">
                Static Chrome + Gated Content Transitions
              </h3>
              <p className="text-xs text-muted-foreground">
                Top command bar and sidebar never re-animate on navigation. Content transitions respect <code className="font-mono text-foreground">data-reduced-motion</code>.
              </p>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-3">
              <Button
                type="button"
                variant={!reducedMotion ? "default" : "outline"}
                size="sm"
                className="gap-1.5 rounded-sm"
                onClick={() => {
                  if (reducedMotion) toggleReducedMotion()
                }}
              >
                <Turtle className="size-3.5" />
                Full motion
              </Button>
              <Button
                type="button"
                variant={reducedMotion ? "default" : "outline"}
                size="sm"
                className="gap-1.5 rounded-sm"
                onClick={() => {
                  if (!reducedMotion) toggleReducedMotion()
                }}
              >
                <Rabbit className="size-3.5" />
                Animations reduced
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 01: HIGH-CONTRAST COLOR TONES */}
      <section className="space-y-4">
        <SectionHeaderBlock
          id="colors"
          index="SECTION 01 // SURFACE & SEMANTIC COLOR ARCHITECTURE"
          title="3-Tier Surface Contrast & Semantic Telemetry Tones"
          description="Light mode separates the #F6F6F7 canvas from pure #FFFFFF data modules and #EEEEF0 command bars. Dark mode steps cleanly from #0B0C0E canvas to #131519 modules."
        />

        {/* 3-Tier Surface Contrast Table/Grid */}
        <div className="overflow-hidden rounded-md border border-border bg-card">
          <div className="border-b border-border bg-muted/40 px-4 py-2.5 font-mono text-[11px] font-semibold tracking-wider text-foreground uppercase">
            3-TIER STRUCTURAL SURFACE SPECIFICATION
          </div>
          <div className="divide-y divide-border">
            {SURFACE_SPECS.map((item) => (
              <div
                key={item.token}
                className="grid items-center gap-4 p-4 sm:grid-cols-[180px_1fr_240px]"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "size-10 shrink-0 rounded-sm shadow-2xs",
                      item.className
                    )}
                  />
                  <div>
                    <div className="font-mono text-[10px] font-semibold text-primary uppercase">
                      {item.tier}
                    </div>
                    <div className="text-xs font-bold text-foreground">
                      {item.name}
                    </div>
                    <code className="font-mono text-[11px] text-muted-foreground">
                      var({item.token})
                    </code>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">{item.usage}</p>

                <div className="space-y-1 rounded-sm border border-border/80 bg-muted/20 p-2 font-mono text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">LIGHT:</span>
                    <span className="text-foreground">{item.lightSpec}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">DARK:</span>
                    <span className="text-foreground">{item.darkSpec}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Semantic Status Tones */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {SEMANTIC_STATUS_TONES.map((tone) => (
            <div
              key={tone.name}
              className="flex flex-col justify-between rounded-md border border-border bg-card p-3.5"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div
                    className={cn("size-4 rounded-[2px]", tone.swatchClass)}
                  />
                  <TelemetryTag status={tone.status}>
                    {tone.status.toUpperCase()}
                  </TelemetryTag>
                </div>
                <div className="text-xs font-bold text-foreground">
                  {tone.name}
                </div>
                <div className="font-mono text-[10px] text-muted-foreground">
                  {tone.token}
                </div>
              </div>
              <div className="mt-3 space-y-0.5 border-t border-border pt-2 font-mono text-[10px] text-muted-foreground">
                <div>L: {tone.lightValue}</div>
                <div>D: {tone.darkValue}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 02: GEOMETRY, SPACING & TYPOGRAPHY STANDARDS */}
      <section className="space-y-4">
        <SectionHeaderBlock
          id="geometry-typography"
          index="SECTION 02 // GEOMETRY, DENSITY & TYPE SCALE"
          title="Disciplined Radii, Zero-Seam Density & Tabular Mono"
          description="Eliminates bloated rounded-4xl pills and double-bordered cards in favor of sharp 6px/4px/2px radii, docked toolbars, and tabular monospace telemetry."
        />

        <div className="grid gap-4 lg:grid-cols-3">
          {/* Card 1: Radii */}
          <div className="space-y-3 rounded-md border border-border bg-card p-4">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="font-mono text-[11px] font-semibold tracking-wider text-primary uppercase">
                01 // CORNER RADII HIERARCHY
              </span>
              <CodeChip>MAX 6PX</CodeChip>
            </div>
            <div className="space-y-2.5 text-xs">
              <div className="rounded-md border border-border bg-muted/30 p-2.5">
                <div className="flex items-center justify-between font-mono text-[11px] font-semibold text-foreground">
                  <span>Module Frame</span>
                  <span>6px (rounded-md)</span>
                </div>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Outer DataModule, SystemHeader, and card containers.
                </p>
              </div>

              <div className="rounded-sm border border-border bg-muted/30 p-2.5">
                <div className="flex items-center justify-between font-mono text-[11px] font-semibold text-foreground">
                  <span>Interactive Controls</span>
                  <span>4px (rounded-sm)</span>
                </div>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Buttons, inputs, selects, and filter triggers (no rounded-4xl pills).
                </p>
              </div>

              <div className="rounded-[2px] border border-border bg-muted/30 p-2.5">
                <div className="flex items-center justify-between font-mono text-[11px] font-semibold text-foreground">
                  <span>Telemetry Tags & Chips</span>
                  <span>2px (rounded-[2px])</span>
                </div>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Precision rectangular status tags and CodeChips.
                </p>
              </div>
            </div>
          </div>

          {/* Card 2: Spacing & Density */}
          <div className="space-y-3 rounded-md border border-border bg-card p-4">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="font-mono text-[11px] font-semibold tracking-wider text-primary uppercase">
                02 // SPACING & DENSITY RULES
              </span>
              <CodeChip>0PX SEAM</CodeChip>
            </div>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li className="flex items-start justify-between gap-2 border-b border-border/60 pb-2">
                <span className="font-medium text-foreground">
                  Docked Command Toolbar
                </span>
                <code className="font-mono text-[11px] text-primary">
                  px-3.5 py-2.5
                </code>
              </li>
              <li className="flex items-start justify-between gap-2 border-b border-border/60 pb-2">
                <span className="font-medium text-foreground">
                  Uppercase Table Header
                </span>
                <code className="font-mono text-[11px] text-primary">
                  h-9 bg-muted/30
                </code>
              </li>
              <li className="flex items-start justify-between gap-2 border-b border-border/60 pb-2">
                <span className="font-medium text-foreground">
                  Standard Data Row
                </span>
                <code className="font-mono text-[11px] text-primary">
                  h-11 (44px)
                </code>
              </li>
              <li className="flex items-start justify-between gap-2">
                <span className="font-medium text-foreground">
                  Toolbar → Table → Footer Seam
                </span>
                <code className="font-mono text-[11px] text-primary">
                  0px (Docked 1px border)
                </code>
              </li>
            </ul>
          </div>

          {/* Card 3: Typography Scale */}
          <div className="space-y-3 rounded-md border border-border bg-card p-4">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="font-mono text-[11px] font-semibold tracking-wider text-primary uppercase">
                03 // TYPOGRAPHY SCALE
              </span>
              <CodeChip>GEIST SANS + MONO</CodeChip>
            </div>
            <div className="space-y-2.5">
              <div>
                <div className="text-xl font-bold tracking-tight text-foreground">
                  20px Bold Page Title
                </div>
                <span className="font-mono text-[10px] text-muted-foreground">
                  text-xl font-bold tracking-tight
                </span>
              </div>
              <div>
                <div className="text-sm font-semibold text-foreground">
                  14px Section Header
                </div>
                <span className="font-mono text-[10px] text-muted-foreground">
                  text-sm font-semibold
                </span>
              </div>
              <div>
                <div className="font-mono text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                  11PX UPPERCASE OVERLINE / TABLE HEAD
                </div>
              </div>
              <div>
                <div className="text-[13px] font-medium text-foreground">
                  13px Medium Primary Table Cell Copy
                </div>
              </div>
              <div>
                <div className="font-mono text-xs tabular-nums text-foreground">
                  12px font-mono tabular-nums (HIS-26-1042 · 98.4%)
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 03: NEW ENFORCED V2 PRIMITIVES */}
      <section className="space-y-4">
        <SectionHeaderBlock
          id="primitives"
          index="SECTION 03 // ENFORCED V2 COMPONENT PRIMITIVES"
          title="6 Shared V2 Primitives (components/design-system/v2-primitives.tsx)"
          description="Every revamped staff page composes these 6 primitives instead of ad-hoc Card + Table + Badge boilerplate."
        />

        {/* Primitive 1 & 2: TelemetryTag (Read-Only) vs RollStatusControl (Interactive) + CodeChip */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3 rounded-md border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-foreground">
                1. &lt;TelemetryTag /&gt; (Read-Only) &amp; &lt;RollStatusControl /&gt; (Interactive)
              </span>
              <span className="font-mono text-[11px] text-muted-foreground">
                Static vs Input
              </span>
            </div>
            <div>
              <div className="mb-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                READ-ONLY STATUS DISPLAY (&lt;TelemetryTag /&gt;)
              </div>
              <div className="flex flex-wrap gap-2">
                <TelemetryTag status="present">PRESENT</TelemetryTag>
                <TelemetryTag status="late">LATE</TelemetryTag>
                <TelemetryTag status="absent">ABSENT</TelemetryTag>
                <TelemetryTag status="excused">EXCUSED</TelemetryTag>
                <TelemetryTag status="active">QR ACTIVE</TelemetryTag>
                <TelemetryTag status="inactive">REVOKED</TelemetryTag>
              </div>
            </div>
            <div className="border-t border-border/70 pt-2.5">
              <div className="mb-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                EDITABLE ROLL MATRIX INPUT (&lt;RollStatusControl /&gt;)
              </div>
              <RollStatusControl
                value={demoRollStatus}
                onChange={setDemoRollStatus}
              />
            </div>
          </div>

          <div className="rounded-md border border-border bg-card p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-foreground">
                2. &lt;CodeChip /&gt;
              </span>
              <span className="font-mono text-[11px] text-muted-foreground">
                Monospace identifier chip for cohorts, rooms, and IDs
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <CodeChip accent>IG K1</CodeChip>
              <CodeChip accent>IAL A1</CodeChip>
              <CodeChip accent>HIS-26-1042</CodeChip>
              <CodeChip>SUB-01</CodeChip>
              <CodeChip>RM-201</CodeChip>
              <CodeChip>LAB-A2</CodeChip>
            </div>
          </div>
        </div>

        {/* Primitive 3: CohortSwitcher */}
        <div className="rounded-md border border-border bg-card p-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="font-mono text-xs font-bold text-foreground">
                3. &lt;CohortSwitcher /&gt;
              </span>
              <p className="text-xs text-muted-foreground">
                Replaces the middleman class-picker pages on Schedule & Attendance with 1-click level filtering and cohort switching.
              </p>
            </div>
            <TelemetryTag status="info">SELECTED: {demoCohort}</TelemetryTag>
          </div>
          <CohortSwitcher
            value={demoCohort}
            onValueChange={setDemoCohort}
            includeAdhoc
          />
        </div>

        {/* Primitive 4, 5, 6: SystemHeader + DataModule + InspectorSheet */}
        <div className="space-y-3 rounded-md border border-border bg-muted/20 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-mono text-xs font-bold text-foreground">
              4–6. &lt;SystemHeader /&gt; + &lt;DataModule /&gt; + &lt;InspectorSheet /&gt;
            </span>
            <Button
              size="xs"
              variant="outline"
              onClick={() => setDemoSheetOpen(true)}
            >
              Open Live &lt;InspectorSheet /&gt; Drawer →
            </Button>
          </div>

          <SystemHeader
            domain="ACADEMICS"
            breadcrumb={[{ label: "COHORTS" }, { label: demoCohort }]}
            title="Unified Header with Inline Telemetry & Docked Tabs"
            description="Replaces multi-row KPI cards with compact tabular telemetry and docked bottom tabs."
            metrics={[
              { label: "COHORTS", value: 7 },
              { label: "SUBJECTS", value: 7 },
              { label: "ATTENDANCE", value: "96.4%", tone: "success" },
            ]}
            tabs={[
              { id: "cohorts", label: "Cohorts", count: 7 },
              { id: "subjects", label: "Subject Catalog", count: 7 },
            ]}
            activeTab={demoTab}
            onTabChange={setDemoTab}
            actions={
              <Button
                size="sm"
                onClick={() => setDemoSheetOpen(true)}
                className="gap-1.5"
              >
                <SlidersHorizontal className="size-3.5" />
                Inspect {demoCohort}
              </Button>
            }
          />

          <DataModule
            searchPlaceholder="Docked command bar search..."
            searchValue={demoSearch}
            onSearchChange={setDemoSearch}
            totalCount={2}
            countLabel="SAMPLE ROWS"
            page={1}
            totalPages={1}
          >
            <Table>
              <TableHeader>
                <TableRow className="h-9 bg-muted/30 hover:bg-muted/30">
                  <TableHead className="px-3.5 font-mono text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                    Code
                  </TableHead>
                  <TableHead className="font-mono text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                    Cohort
                  </TableHead>
                  <TableHead className="font-mono text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                    Status
                  </TableHead>
                  <TableHead className="text-right font-mono text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                    Action
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow
                  onClick={() => setDemoSheetOpen(true)}
                  className="h-11 cursor-pointer hover:bg-muted/40"
                >
                  <TableCell className="px-3.5">
                    <CodeChip accent>{demoCohort}</CodeChip>
                  </TableCell>
                  <TableCell className="text-[13px] font-medium text-foreground">
                    Cambridge International Stream
                  </TableCell>
                  <TableCell>
                    <TelemetryTag status="present">ACTIVE</TelemetryTag>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="xs">
                      Open Drawer →
                    </Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </DataModule>

          <InspectorSheet
            open={demoSheetOpen}
            onOpenChange={setDemoSheetOpen}
            code={demoCohort}
            title={`Slide-Over Inspector — ${demoCohort}`}
            subtitle="Keeps staff in context without navigating away from the table or grid"
            status={{ label: "ACTIVE STREAM", tone: "active" }}
            fields={[
              { label: "COHORT CODE", value: demoCohort, mono: true },
              { label: "ENROLLMENT", value: "24 students · 6 subjects", mono: true },
              { label: "WEEKLY SLOTS", value: "18 slots", mono: true },
            ]}
            footerActions={
              <Button size="sm" onClick={() => setDemoSheetOpen(false)}>
                Done
              </Button>
            }
          />
        </div>
      </section>

      {/* SECTION 04: INTERACTIVE STAFF FLOW PROTOTYPES */}
      <section className="space-y-4">
        <SectionHeaderBlock
          id="flows"
          index="SECTION 04 // LIVE INTERACTIVE STAFF FLOW PROTOTYPES"
          title="End-to-End Staff Workflow Revamp Showcase"
          description="Click through all 4 redesigned staff workflows below using realistic dummy data before rolling out across production routes."
        />
        <V2FlowsShowcase />
      </section>
    </div>
  )
}
