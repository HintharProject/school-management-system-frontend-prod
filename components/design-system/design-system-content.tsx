"use client"

import * as React from "react"
import {
  Download,
  Layers,
  Moon,
  Plus,
  Printer,
  Rabbit,
  RefreshCw,
  RotateCw,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Table as TableIcon,
  Turtle,
} from "lucide-react"
import { useMotionPreference } from "@/components/motion-preference-provider"
import { useTheme, type ThemeMode } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { QrCanvas } from "@/components/qr-canvas"
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
  DUMMY_COHORTS,
  DUMMY_COHORTS_NO_IAL,
  DUMMY_STUDENTS,
} from "./v2-dummy-data"
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
    lightSpec: "Zinc 100 · #F4F4F5",
    darkSpec: "Zinc 950 Deep · #09090B",
    usage: "App shell viewport & recessed workspace floor so elevated modules pop without heavy drop shadows.",
  },
  {
    tier: "TIER 02 // MODULE",
    name: "Elevated Module / Card",
    token: "--card",
    className: "bg-card border border-border",
    lightSpec: "Pure White · #FFFFFF",
    darkSpec: "Zinc 900 Module · #121215",
    usage: "DataModule tables, SystemHeader frames, and slide-over InspectorSheets.",
  },
  {
    tier: "TIER 03 // RECESSED CHROME",
    name: "Recessed Command Bar / Popover",
    token: "--muted / --popover",
    className: "bg-muted border border-border",
    lightSpec: "Zinc 50 Chrome · #FAFAFA",
    darkSpec: "Zinc 900 Chrome · #18181C",
    usage: "Docked table command toolbars, uppercase table headers, and dropdown popovers.",
  },
  {
    tier: "STRUCTURAL GRID",
    name: "Structural 1px Border",
    token: "--border",
    className: "bg-border",
    lightSpec: "Zinc 200 · #E4E4E7",
    darkSpec: "Zinc 800 Seam · #242429",
    usage: "Crisp 1px structural hairlines separating sidebar, command header, and module seams.",
  },
  {
    tier: "CONTROL SURFACE",
    name: "Control & Input Border",
    token: "--input",
    className: "bg-input",
    lightSpec: "Zinc 300 · #D4D4D8",
    darkSpec: "Zinc 800 Input · #27272A",
    usage: "Interactive button borders, inputs, segmented controls, and focus indicators.",
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
    lightValue: "Emerald 500 · #10B981",
    darkValue: "Emerald 500 · #10B981",
  },
  {
    name: "Late / Warning",
    status: "late" as const,
    token: "--attendance-late / --warning",
    swatchClass: "bg-warning",
    lightValue: "Amber 500 · #F59E0B",
    darkValue: "Amber 500 · #F59E0B",
  },
  {
    name: "Absent / Destructive",
    status: "absent" as const,
    token: "--attendance-absent / --destructive",
    swatchClass: "bg-destructive",
    lightValue: "Rose 500 · #F43F5E",
    darkValue: "Rose 500 · #F43F5E",
  },
  {
    name: "Excused / Neutral",
    status: "excused" as const,
    token: "--attendance-excused / --muted-foreground",
    swatchClass: "bg-attendance-excused",
    lightValue: "Zinc 500 · #71717A",
    darkValue: "Zinc 400 · #A1A1AA",
  },
  {
    name: "Campus / Info",
    status: "info" as const,
    token: "--attendance-campus / --chart-2",
    swatchClass: "bg-attendance-campus",
    lightValue: "Blue 600 · #2563EB",
    darkValue: "Blue 500 · #3B82F6",
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

  // CohortSwitcher Empty Level & Refresh Simulation
  const [simulateNoIal, setSimulateNoIal] = React.useState<boolean>(false)
  const [isRefreshing, setIsRefreshing] = React.useState<boolean>(false)

  // InspectorSheet 2-Tab Mode Switcher Simulation
  const [inspectorMode, setInspectorMode] = React.useState<
    "directory" | "academics"
  >("directory")
  const [sheetTab, setSheetTab] = React.useState<"view" | "edit">("view")
  const [demoStudentQrActive, setDemoStudentQrActive] =
    React.useState<boolean>(true)
  const [demoQrToken, setDemoQrToken] =
    React.useState<string>("QR-HIS-1042-8K21")

  // Attendance Matrix Mini-Table Simulation
  const [matrixFilterSubject, setMatrixFilterSubject] =
    React.useState<string>("ALL")
  const [matrixRolls, setMatrixRolls] = React.useState<
    Record<string, RollAttendanceStatus>
  >({
    "0-0": "present",
    "0-1": "present",
    "0-2": "present",
    "0-3": "late",
    "0-4": "present",
    "1-0": "present",
    "1-1": "late",
    "1-2": "present",
    "1-3": "present",
    "1-4": "absent",
    "2-0": "absent",
    "2-1": "excused",
    "2-2": "present",
    "2-3": "present",
    "2-4": "present",
    "3-0": "present",
    "3-1": "present",
    "3-2": "present",
    "3-3": "present",
    "3-4": "present",
  })

  const rotateDemoToken = () => {
    const suffix = Math.random().toString(36).substring(2, 6).toUpperCase()
    setDemoQrToken(`QR-HIS-1042-${suffix}`)
    setDemoStudentQrActive(true)
  }

  const handleRefreshCohorts = () => {
    setIsRefreshing(true)
    setTimeout(() => {
      setIsRefreshing(false)
    }, 600)
  }

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
          description="Light mode separates the #F4F4F5 canvas from pure #FFFFFF data modules and #FAFAFA command bars. Dark mode steps cleanly from #09090B canvas to #121215 modules and #18181C chrome."
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
      <section className="space-y-6">
        <SectionHeaderBlock
          id="primitives"
          index="SECTION 03 // ENFORCED V2 COMPONENT PRIMITIVES"
          title="6 Shared V2 Primitives & Standard Patterns"
          description="Every revamped staff page composes these primitives: CohortSwitcher with empty-level dimming, unified 2-tab InspectorSheet, and sticky dual-mode Attendance Matrix."
        />

        {/* Primitive 1 & 2: TelemetryTag (Read-Only) vs RollStatusControl (Interactive) + CodeChip */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3 rounded-md border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-foreground">
                1. &lt;TelemetryTag /&gt; &amp; &lt;RollStatusControl /&gt;
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
            <div className="mt-4 border-t border-border/70 pt-3 text-xs text-muted-foreground">
              Used in table key columns, student code labels, and room badges for consistent monospace scannability.
            </div>
          </div>
        </div>

        {/* Primitive 3: CohortSwitcher with Empty-Level Dimming & Refresh Action */}
        <div className="space-y-3 rounded-md border border-border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-foreground">
                  3. &lt;CohortSwitcher /&gt; — Empty-Level Dimming &amp; Standard Refresh
                </span>
                <TelemetryTag status={simulateNoIal ? "late" : "info"}>
                  {simulateNoIal ? "SIMULATION: 0 IAL COHORTS" : "NORMAL: ALL LEVELS"}
                </TelemetryTag>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Levels with 0 registered cohorts dim in the LVL bar (<code className="font-mono text-foreground">text-muted-foreground/40</code>) and render <code className="font-mono text-foreground">COHORT // NO IAL COHORTS</code> with disabled steppers. The select trigger maintains a strictly fixed 260px width.
              </p>
            </div>

            {/* Simulation controls */}
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant={simulateNoIal ? "default" : "outline"}
                size="xs"
                className="h-7 font-mono text-[11px]"
                onClick={() => {
                  const nextState = !simulateNoIal
                  setSimulateNoIal(nextState)
                  if (nextState) {
                    setDemoCohort("")
                  } else {
                    setDemoCohort("IG K1")
                  }
                }}
              >
                {simulateNoIal ? "Reset Normal Cohorts" : "Simulate 0 IAL Cohorts"}
              </Button>
            </div>
          </div>

          {/* Interactive CohortSwitcher Instance */}
          <CohortSwitcher
            value={demoCohort}
            onValueChange={setDemoCohort}
            cohorts={simulateNoIal ? DUMMY_COHORTS_NO_IAL : DUMMY_COHORTS}
            includeAdhoc
            actions={
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 gap-1.5 rounded-[2px] font-mono text-[11px]"
                disabled={isRefreshing}
                onClick={handleRefreshCohorts}
              >
                <RefreshCw
                  className={cn("size-3", isRefreshing && "animate-spin")}
                />
                <span>{isRefreshing ? "SYNCING..." : "REFRESH"}</span>
              </Button>
            }
          />

          <div className="rounded-sm border border-border/80 bg-muted/20 p-2.5 font-mono text-[11px] text-muted-foreground">
            <span className="font-semibold text-foreground">OPERATIONAL CONTRACT:</span> If a staff member clicks <strong className="text-foreground">IAL</strong> while 0 IAL cohorts exist, the trigger shows placeholder <strong className="text-foreground">COHORT // NO IAL COHORTS</strong>, prev/next steppers disable, and no page crash occurs. The standard <strong className="text-foreground">REFRESH</strong> action in the right slot re-queries backend cohort lists.
          </div>
        </div>

        {/* Primitive 4, 5, 6: SystemHeader + DataModule + Unified InspectorSheet */}
        <div className="space-y-3 rounded-md border border-border bg-muted/20 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="font-mono text-xs font-bold text-foreground">
                4–6. &lt;SystemHeader /&gt; + &lt;DataModule /&gt; + &lt;InspectorSheet /&gt;
              </span>
              <p className="text-xs text-muted-foreground">
                Standardized slide-over drawer with 2-tab mode switcher (<code className="font-mono text-foreground">Directory</code> or <code className="font-mono text-foreground">Academics</code>) and inline QR pass actions.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-sm border border-border bg-card p-0.5 font-mono text-xs">
                <button
                  type="button"
                  onClick={() => setInspectorMode("directory")}
                  className={cn(
                    "rounded-[2px] px-2 py-0.5 text-[11px] transition-colors",
                    inspectorMode === "directory"
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Directory Mode
                </button>
                <button
                  type="button"
                  onClick={() => setInspectorMode("academics")}
                  className={cn(
                    "rounded-[2px] px-2 py-0.5 text-[11px] transition-colors",
                    inspectorMode === "academics"
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Academics Mode
                </button>
              </div>

              <Button
                size="xs"
                variant="default"
                onClick={() => setDemoSheetOpen(true)}
              >
                Open Live &lt;InspectorSheet /&gt; Drawer →
              </Button>
            </div>
          </div>

          <SystemHeader
            domain={inspectorMode === "directory" ? "DIRECTORY" : "ACADEMICS"}
            breadcrumb={[
              { label: inspectorMode === "directory" ? "STUDENTS" : "COHORTS" },
              { label: inspectorMode === "directory" ? "HIS-26-1042" : demoCohort || "IG K1" },
            ]}
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
                Inspect Drawer
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
                    Target Name
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
                    <CodeChip accent>
                      {inspectorMode === "directory" ? "HIS-26-1042" : (demoCohort || "IG K1")}
                    </CodeChip>
                  </TableCell>
                  <TableCell className="text-[13px] font-medium text-foreground">
                    {inspectorMode === "directory"
                      ? "Aung Kyaw Moe (IG K1)"
                      : "Cambridge International Stream"}
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

          {/* Unified 2-Tab InspectorSheet Demo */}
          <InspectorSheet
            open={demoSheetOpen}
            onOpenChange={setDemoSheetOpen}
            code={
              inspectorMode === "directory"
                ? "HIS-26-1042"
                : (demoCohort || "IG K1")
            }
            title={
              inspectorMode === "directory"
                ? "Aung Kyaw Moe"
                : `Cohort — ${demoCohort || "IG K1"}`
            }
            subtitle={
              inspectorMode === "directory"
                ? "Student Credential & Campus Telemetry"
                : "Academic Stream & Subject Offerings"
            }
            status={{
              label:
                inspectorMode === "directory"
                  ? demoStudentQrActive
                    ? "QR BADGE ACTIVE"
                    : "BADGE REVOKED"
                  : "ACTIVE STREAM",
              tone:
                inspectorMode === "directory"
                  ? demoStudentQrActive
                    ? "active"
                    : "inactive"
                  : "active",
            }}
            fields={
              inspectorMode === "directory"
                ? [
                    { label: "STUDENT CODE", value: "HIS-26-1042", mono: true },
                    { label: "STREAM", value: "IGCSE K · 1", mono: true },
                    { label: "GATE STATUS", value: "Arrived (08:42 AM)" },
                    { label: "ATTENDANCE", value: "98.4%", mono: true },
                  ]
                : [
                    { label: "COHORT CODE", value: demoCohort || "IG K1", mono: true },
                    { label: "ENROLLMENT", value: "24 students · 6 subjects", mono: true },
                    { label: "WEEKLY SLOTS", value: "18 slots", mono: true },
                  ]
            }
            footerActions={
              <div className="flex w-full items-center justify-between gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDemoSheetOpen(false)}
                >
                  Close
                </Button>
                <Button size="sm" onClick={() => setDemoSheetOpen(false)}>
                  Done
                </Button>
              </div>
            }
          >
            {/* Unified Segmented 2-Tab Switcher */}
            <div className="space-y-4">
              <div className="flex items-center gap-1 rounded-sm border border-border bg-muted/40 p-1 font-mono text-xs">
                <button
                  type="button"
                  onClick={() => setSheetTab("view")}
                  className={cn(
                    "flex-1 rounded-[2px] py-1 text-center font-medium transition-colors",
                    sheetTab === "view"
                      ? "bg-background text-foreground shadow-2xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {inspectorMode === "directory"
                    ? "QR Pass & Telemetry"
                    : "Overview & Offerings"}
                </button>
                <button
                  type="button"
                  onClick={() => setSheetTab("edit")}
                  className={cn(
                    "flex-1 rounded-[2px] py-1 text-center font-medium transition-colors",
                    sheetTab === "edit"
                      ? "bg-background text-foreground shadow-2xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {inspectorMode === "directory" ? "Edit Profile" : "Edit Cohort"}
                </button>
              </div>

              {/* Mode: Directory Content */}
              {inspectorMode === "directory" && (
                <>
                  {sheetTab === "view" ? (
                    <div className="space-y-4">
                      {/* QR Pass Card */}
                      <div className="flex flex-col items-center gap-3 rounded-md border border-border bg-muted/30 p-4">
                        <div className="flex w-full items-center justify-between">
                          <span className="font-mono text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                            CAMPUS QR CREDENTIAL
                          </span>
                          <CodeChip>{demoQrToken}</CodeChip>
                        </div>

                        {demoStudentQrActive ? (
                          <QrCanvas
                            value={demoQrToken}
                            size={160}
                            className="rounded-sm border border-border bg-white p-1"
                          />
                        ) : (
                          <div className="flex size-[160px] flex-col items-center justify-center rounded-sm border border-dashed border-destructive/50 bg-destructive/5 p-4 text-center">
                            <span className="font-mono text-xs font-semibold text-destructive uppercase">
                              PASS REVOKED
                            </span>
                            <span className="mt-1 text-[11px] text-muted-foreground">
                              Click Activate or Rotate Token below to re-issue.
                            </span>
                          </div>
                        )}

                        {/* Standard Action Buttons Aligned Below QR Code Card */}
                        <div className="grid w-full grid-cols-2 gap-2 pt-1 sm:grid-cols-4">
                          <Button
                            type="button"
                            variant="outline"
                            size="xs"
                            className="h-8 gap-1 font-mono text-[11px]"
                            onClick={rotateDemoToken}
                          >
                            <RefreshCw className="size-3" />
                            Rotate
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="xs"
                            className="h-8 gap-1 font-mono text-[11px]"
                          >
                            <Download className="size-3" />
                            PNG
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="xs"
                            className="h-8 gap-1 font-mono text-[11px]"
                          >
                            <Printer className="size-3" />
                            Print
                          </Button>
                          <Button
                            type="button"
                            variant={demoStudentQrActive ? "outline" : "default"}
                            size="xs"
                            className={cn(
                              "h-8 font-mono text-[11px]",
                              demoStudentQrActive && "text-destructive hover:text-destructive"
                            )}
                            onClick={() =>
                              setDemoStudentQrActive(!demoStudentQrActive)
                            }
                          >
                            {demoStudentQrActive ? "Deactivate" : "Activate"}
                          </Button>
                        </div>
                      </div>

                      <div className="rounded-sm border border-border/70 bg-card p-3 text-xs text-muted-foreground">
                        <div className="font-semibold text-foreground">Guardian Telemetry:</div>
                        <div className="mt-1 font-mono text-[11px]">
                          Daw Khin May · +95 9 1234 5678 · Yangon Kamayut
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 rounded-md border border-border bg-card p-3 text-xs">
                      <div className="space-y-1">
                        <label className="font-mono text-[10px] uppercase text-muted-foreground">
                          Full Student Name
                        </label>
                        <Input
                          defaultValue="Aung Kyaw Moe"
                          className="h-8 font-mono text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-mono text-[10px] uppercase text-muted-foreground">
                          Student Code
                        </label>
                        <Input
                          defaultValue="HIS-26-1042"
                          className="h-8 font-mono text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-mono text-[10px] uppercase text-muted-foreground">
                          Parent Contact Phone
                        </label>
                        <Input
                          defaultValue="+95 9 1234 5678"
                          className="h-8 font-mono text-xs"
                        />
                      </div>
                      <Button size="sm" className="mt-2 w-full">
                        Save Profile Changes
                      </Button>
                    </div>
                  )}
                </>
              )}

              {/* Mode: Academics Content */}
              {inspectorMode === "academics" && (
                <>
                  {sheetTab === "view" ? (
                    <div className="space-y-3">
                      <div className="rounded-md border border-border bg-card p-3 text-xs">
                        <div className="font-mono text-[10px] font-semibold uppercase text-muted-foreground">
                          ACTIVE SUBJECT OFFERINGS ({demoCohort || "IG K1"})
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {["Mathematics", "Physics", "Chemistry", "Biology", "English", "Economics"].map((sub) => (
                            <CodeChip key={sub}>{sub}</CodeChip>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 rounded-md border border-border bg-card p-3 text-xs">
                      <div className="space-y-1">
                        <label className="font-mono text-[10px] uppercase text-muted-foreground">
                          Cohort Code
                        </label>
                        <Input
                          defaultValue={demoCohort || "IG K1"}
                          className="h-8 font-mono text-xs uppercase"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-mono text-[10px] uppercase text-muted-foreground">
                          Assigned Base Room
                        </label>
                        <Input
                          defaultValue="RM-201"
                          className="h-8 font-mono text-xs uppercase"
                        />
                      </div>
                      <Button size="sm" className="mt-2 w-full">
                        Save Cohort Changes
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </InspectorSheet>
        </div>

        {/* Dedicated Attendance Workspace Matrix Architecture Pattern Spec */}
        <div className="space-y-3 rounded-md border border-border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
            <div>
              <span className="font-mono text-xs font-bold text-foreground">
                ATTENDANCE WORKSPACE DUAL-MODE PATTERN (ROLL VS MATRIX)
              </span>
              <p className="mt-0.5 text-xs text-muted-foreground">
                High-performance horizontal spreadsheet with strictly opaque sticky columns (Student + Range Summary) preventing cell bleed-through.
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <CodeChip accent>STICKY COL 1: LEFT-0</CodeChip>
              <CodeChip accent>STICKY COL 2: LEFT-230PX</CodeChip>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 text-xs">
            <div className="rounded-sm border border-border bg-muted/20 p-2.5">
              <div className="font-mono text-[11px] font-semibold text-foreground">
                1. Dual-Mode Switcher
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Tabs toggle between <strong className="text-foreground">Daily Session Roll</strong> (quick tactical list for today) and <strong className="text-foreground">Monthly &amp; Subject Matrix</strong> (full spreadsheet view).
              </p>
            </div>

            <div className="rounded-sm border border-border bg-muted/20 p-2.5">
              <div className="font-mono text-[11px] font-semibold text-foreground">
                2. Sticky Column Architecture
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Uses <code className="font-mono text-foreground">border-separate border-spacing-0</code> with 100% opaque <code className="font-mono text-foreground">bg-card group-hover:bg-muted</code> to guarantee zero text bleed when scrolling horizontally.
              </p>
            </div>

            <div className="rounded-sm border border-border bg-muted/20 p-2.5">
              <div className="font-mono text-[11px] font-semibold text-foreground">
                3. Sticky Range Summary (Col 2)
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Fixed at <code className="font-mono text-foreground">left-[230px]</code> with shadow border, providing instant rate telemetry (<strong className="text-foreground">96.4% · 14P 1L</strong>) alongside each student name.
              </p>
            </div>
          </div>

          {/* Mini Interactive Matrix Table Preview */}
          <div className="mt-2 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                LIVE STICKY MATRIX PREVIEW (HORIZONTALLY SCROLLABLE)
              </span>
              <div className="flex items-center gap-1">
                {(["ALL", "MATHEMATICS", "PHYSICS"] as const).map((sub) => (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => setMatrixFilterSubject(sub)}
                    className={cn(
                      "rounded-[2px] border px-2 py-0.5 font-mono text-[10px] uppercase transition-colors",
                      matrixFilterSubject === sub
                        ? "border-primary bg-primary text-primary-foreground font-semibold"
                        : "border-border bg-background text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {sub}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative max-h-[220px] w-full overflow-auto rounded-sm border border-border bg-card">
              <table className="w-max min-w-full border-separate border-spacing-0 text-left text-xs">
                <thead>
                  <tr className="h-9">
                    <th className="sticky top-0 left-0 z-30 w-[230px] border-b border-r border-border bg-muted/95 px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur-xs">
                      STUDENT
                    </th>
                    <th className="sticky top-0 left-[230px] z-30 w-[150px] border-b border-r border-border bg-muted/95 px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground shadow-[2px_0_4px_-1px_rgba(0,0,0,0.25)] backdrop-blur-xs">
                      RANGE SUMMARY
                    </th>
                    {["Nov 02", "Nov 04", "Nov 07", "Nov 09", "Nov 11", "Nov 14", "Nov 16", "Nov 18"].map((date) => (
                      <th
                        key={date}
                        className="sticky top-0 z-20 w-[110px] border-b border-r border-border bg-muted/95 px-2.5 py-1 text-center font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur-xs"
                      >
                        {date}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {DUMMY_STUDENTS.slice(0, 4).map((stu, sIdx) => (
                    <tr key={stu.id} className="group h-11 hover:bg-muted/40">
                      <td className="sticky left-0 z-20 w-[230px] border-b border-r border-border bg-card px-3 py-1.5 transition-colors group-hover:bg-muted">
                        <div className="flex items-center gap-2">
                          <CodeChip accent>{stu.code}</CodeChip>
                          <span className="truncate font-medium text-foreground">
                            {stu.name}
                          </span>
                        </div>
                      </td>
                      <td className="sticky left-[230px] z-20 w-[150px] border-b border-r border-border bg-card px-3 py-1.5 font-mono text-xs tabular-nums text-foreground shadow-[2px_0_4px_-1px_rgba(0,0,0,0.25)] transition-colors group-hover:bg-muted">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-success">96%</span>
                          <span className="text-[10px] text-muted-foreground">
                            (7P 1L 0A)
                          </span>
                        </div>
                      </td>
                      {[0, 1, 2, 3, 4, 5, 6, 7].map((colIdx) => {
                        const cellKey = `${sIdx}-${colIdx % 5}`
                        const currentStatus = matrixRolls[cellKey] ?? "present"
                        return (
                          <td
                            key={colIdx}
                            className="w-[110px] border-b border-r border-border px-2 py-1 text-center"
                          >
                            <RollStatusControl
                              value={currentStatus}
                              onChange={(val) =>
                                setMatrixRolls((prev) => ({
                                  ...prev,
                                  [cellKey]: val,
                                }))
                              }
                            />
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
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
