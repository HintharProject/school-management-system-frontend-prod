"use client"

import * as React from "react"
import {
  ArrowRight,
  Download,
  ExternalLink,
  Plus,
  Printer,
  QrCode,
  RefreshCw,
  Sparkles,
  Users,
} from "lucide-react"
import { QrCanvas } from "@/components/qr-canvas"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import {
  DUMMY_COHORTS,
  DUMMY_SLOTS,
  DUMMY_STUDENTS,
  DUMMY_SUBJECTS,
  V2_NAVIGATION_MAP,
  type DummyCohort,
  type DummyStudent,
  type DummySubject,
  type DummyTimetableSlot,
} from "./v2-dummy-data"
import {
  CodeChip,
  CohortSwitcher,
  DataModule,
  InspectorSheet,
  RollStatusControl,
  SystemHeader,
  TelemetryTag,
} from "./v2-primitives"

type ShowcaseFlowId =
  | "shell-nav"
  | "academics-hub"
  | "students-checkin"
  | "schedule-attendance"

const FLOW_TABS: {
  id: ShowcaseFlowId
  step: string
  title: string
  subtitle: string
}[] = [
  {
    id: "shell-nav",
    step: "FLOW 01",
    title: "Flush Shell & 16→7 Nav",
    subtitle: "1px structural grid + consolidated hubs",
  },
  {
    id: "academics-hub",
    step: "FLOW 02",
    title: "Academics Hub (Option A)",
    subtitle: "Cohorts | Subject Catalog + deduplicated table",
  },
  {
    id: "students-checkin",
    step: "FLOW 03",
    title: "Students + QR Sheet & Check-In",
    subtitle: "Slide-over QR inspector + unified Daily Roll",
  },
  {
    id: "schedule-attendance",
    step: "FLOW 04",
    title: "Schedule & Roll Workspace",
    subtitle: "Inline CohortSwitcher + zero middleman pages",
  },
]

export function V2FlowsShowcase() {
  const [activeFlow, setActiveFlow] = React.useState<ShowcaseFlowId>("shell-nav")

  return (
    <div className="overflow-hidden rounded-md border border-border bg-card shadow-xs">
      {/* Studio Top Switcher Bar */}
      <div className="border-b border-border bg-muted/50 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-5 items-center rounded-[2px] border border-primary/30 bg-primary/10 px-1.5 font-mono text-[10px] font-semibold tracking-wider text-primary uppercase">
              LIVE PROTOTYPE STUDIO
            </span>
            <span className="text-xs font-medium text-muted-foreground">
              Click through all 4 redesigned staff workflows powered by v2 primitives & dummy data
            </span>
          </div>
          <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
            4 INTERACTIVE FLOWS · ZERO RELOADS
          </span>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {FLOW_TABS.map((tab) => {
            const active = activeFlow === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveFlow(tab.id)}
                className={cn(
                  "flex flex-col items-start gap-0.5 rounded-sm border px-3 py-2 text-left transition-colors",
                  active
                    ? "border-primary bg-background text-foreground shadow-2xs"
                    : "border-border/80 bg-background/50 text-muted-foreground hover:bg-background hover:text-foreground"
                )}
              >
                <div className="flex w-full items-center justify-between">
                  <span
                    className={cn(
                      "font-mono text-[10px] font-semibold tracking-wider uppercase",
                      active ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    {tab.step}
                  </span>
                  {active && (
                    <span className="size-1.5 rounded-full bg-primary" />
                  )}
                </div>
                <span className="text-[13px] font-semibold tracking-tight text-foreground">
                  {tab.title}
                </span>
                <span className="line-clamp-1 text-[11px] text-muted-foreground">
                  {tab.subtitle}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Active Flow Viewport */}
      <div className="p-4 sm:p-6">
        {activeFlow === "shell-nav" && <Flow1ShellAndNav onJumpToFlow={setActiveFlow} />}
        {activeFlow === "academics-hub" && <Flow2AcademicsHub />}
        {activeFlow === "students-checkin" && <Flow3StudentsAndCheckIn />}
        {activeFlow === "schedule-attendance" && <Flow4ScheduleAndAttendance />}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* FLOW 1: FLUSH APP SHELL & 16-TO-7 NAVIGATION CONSOLIDATION                 */
/* -------------------------------------------------------------------------- */

function Flow1ShellAndNav({
  onJumpToFlow,
}: {
  onJumpToFlow: (flow: ShowcaseFlowId) => void
}) {
  const [selectedNavId, setSelectedNavId] = React.useState<string>(
    V2_NAVIGATION_MAP[0]?.id ?? "overview"
  )
  const selectedNav =
    V2_NAVIGATION_MAP.find((item) => item.id === selectedNavId) ??
    V2_NAVIGATION_MAP[0]

  return (
    <div className="space-y-6">
      {/* Architecture Comparison: Legacy Inset vs v2 Flush Shell */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-mono text-[11px] font-semibold tracking-wider text-destructive uppercase">
              LEGACY SHELL (RETIRED)
            </span>
            <TelemetryTag status="absent">16 FLAT LINKS · INSET</TelemetryTag>
          </div>
          <ul className="space-y-1.5 text-xs text-muted-foreground">
            <li>
              • <code className="font-mono text-foreground">variant=&quot;inset&quot;</code>{" "}
              floating rounded canvas wasted 24px outer viewport gutter and clashed with sharp tables.
            </li>
            <li>
              • Top header re-animated on every route click via{" "}
              <code className="font-mono text-foreground">gsap.fromTo</code> and showed raw database IDs (
              <code className="font-mono text-foreground">/classes/14</code>).
            </li>
            <li>
              • 16 top-level sidebar items split single workflows across 3–4 separate pages.
            </li>
          </ul>
        </div>

        <div className="rounded-md border border-primary/30 bg-primary/5 p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-mono text-[11px] font-semibold tracking-wider text-primary uppercase">
              V2 FLUSH WORKSPACE SHELL
            </span>
            <TelemetryTag status="present">7 HUBS · 1PX STRUCTURAL GRID</TelemetryTag>
          </div>
          <ul className="space-y-1.5 text-xs text-muted-foreground">
            <li>
              • Flush <code className="font-mono text-foreground">1px border-r</code> sidebar docked directly to a{" "}
              <code className="font-mono text-foreground">h-12</code> non-animating top command bar.
            </li>
            <li>
              • Human-readable domain breadcrumbs (
              <code className="font-mono text-foreground">ACADEMICS // IG K1</code>) instead of raw URL paths.
            </li>
            <li>
              • 16 fragmented routes consolidated into <strong>7 primary staff hubs</strong> with zero middleman pages.
            </li>
          </ul>
        </div>
      </div>

      {/* Interactive Simulated Flush Shell & 7-Hub Map */}
      <div className="overflow-hidden rounded-md border border-border bg-background">
        {/* Simulated Flush Top Command Bar */}
        <div className="flex h-12 items-center justify-between border-b border-border bg-muted/40 px-4">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs font-semibold tracking-wider text-foreground uppercase">
              HINTHAR // OPS
            </span>
            <span className="text-border">//</span>
            <span className="font-mono text-xs font-medium text-primary uppercase">
              {selectedNav?.label ?? "Overview"}
            </span>
            <CodeChip>{selectedNav?.route ?? "/"}</CodeChip>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden rounded-sm border border-border bg-background px-2 py-1 font-mono text-[11px] text-muted-foreground sm:inline-block">
              Ctrl+K Command Palette
            </span>
            <TelemetryTag status="info">STATIC CHROME (NO GSAP RE-RUN)</TelemetryTag>
          </div>
        </div>

        {/* Flush 1px Sidebar + Hub Inspector */}
        <div className="grid md:grid-cols-[240px_1fr]">
          <div className="border-b border-border bg-muted/20 p-2.5 md:border-r md:border-b-0">
            <div className="mb-2 px-2 font-mono text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
              7 CONSOLIDATED HUBS
            </div>
            <div className="space-y-1">
              {V2_NAVIGATION_MAP.map((item, idx) => {
                const active = item.id === selectedNav?.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedNavId(item.id)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-sm px-2.5 py-2 text-left text-xs font-medium transition-colors",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground hover:bg-muted"
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className={cn(
                          "font-mono text-[10px] tabular-nums",
                          active ? "text-primary-foreground/80" : "text-muted-foreground"
                        )}
                      >
                        0{idx + 1}
                      </span>
                      <span>{item.label}</span>
                    </span>
                    {item.badge && (
                      <span
                        className={cn(
                          "rounded-[2px] px-1.5 py-0.5 font-mono text-[10px] uppercase",
                          active
                            ? "bg-primary-foreground/20 text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Hub Consolidation Details */}
          {selectedNav && (
            <div className="flex flex-col justify-between p-5">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] font-semibold tracking-wider text-primary uppercase">
                        CONSOLIDATED HUB
                      </span>
                      <CodeChip accent>{selectedNav.route}</CodeChip>
                    </div>
                    <h3 className="mt-1 text-lg font-bold tracking-tight text-foreground">
                      {selectedNav.label}
                    </h3>
                  </div>
                  <TelemetryTag status="active">
                    {selectedNav.badge ?? "CORE HUB"}
                  </TelemetryTag>
                </div>

                <p className="text-sm text-foreground">{selectedNav.description}</p>

                <div className="space-y-2">
                  <div className="font-mono text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                    LEGACY ROUTES ABSORBED INTO THIS HUB ({selectedNav.replaces.length})
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedNav.replaces.map((legacyRoute) => (
                      <div
                        key={legacyRoute}
                        className="flex items-center gap-1.5 rounded-sm border border-border bg-muted/40 px-2.5 py-1.5"
                      >
                        <span className="font-mono text-xs text-muted-foreground line-through">
                          {legacyRoute}
                        </span>
                        <ArrowRight className="size-3 text-primary" />
                        <span className="font-mono text-xs font-semibold text-foreground">
                          {selectedNav.route}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
                <span className="text-xs text-muted-foreground">
                  Want to test this hub&apos;s interactive workflow prototype?
                </span>
                <div className="flex flex-wrap gap-2">
                  {selectedNav.id === "academics" && (
                    <Button
                      size="sm"
                      onClick={() => onJumpToFlow("academics-hub")}
                      className="gap-1.5"
                    >
                      Open Academics Hub Prototype
                      <ArrowRight className="size-3.5" />
                    </Button>
                  )}
                  {(selectedNav.id === "directory" || selectedNav.id === "check-in") && (
                    <Button
                      size="sm"
                      onClick={() => onJumpToFlow("students-checkin")}
                      className="gap-1.5"
                    >
                      Open Students & Check-In Prototype
                      <ArrowRight className="size-3.5" />
                    </Button>
                  )}
                  {(selectedNav.id === "schedule" || selectedNav.id === "attendance") && (
                    <Button
                      size="sm"
                      onClick={() => onJumpToFlow("schedule-attendance")}
                      className="gap-1.5"
                    >
                      Open Schedule & Roll Prototype
                      <ArrowRight className="size-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* FLOW 2: ACADEMICS HUB (COHORTS | SUBJECT CATALOG OPTION A)                 */
/* -------------------------------------------------------------------------- */

function Flow2AcademicsHub() {
  const [activeTab, setActiveTab] = React.useState<string>("cohorts")
  const [search, setSearch] = React.useState("")
  const [levelFilter, setLevelFilter] = React.useState<string>("ALL")
  const [selectedIds, setSelectedIds] = React.useState<number[]>([])
  const [inspectedCohort, setInspectedCohort] = React.useState<DummyCohort | null>(
    null
  )

  // Subject catalog state for interactive quick-add
  const [subjects, setSubjects] = React.useState<DummySubject[]>(DUMMY_SUBJECTS)
  const [newSubjCode, setNewSubjCode] = React.useState("")
  const [newSubjName, setNewSubjName] = React.useState("")

  const filteredCohorts = React.useMemo(() => {
    return DUMMY_COHORTS.filter((c) => {
      const matchesLevel =
        levelFilter === "ALL" ||
        c.level === levelFilter ||
        (levelFilter === "YEAR" && c.level.startsWith("Year"))
      const q = search.trim().toLowerCase()
      const matchesQuery =
        !q ||
        c.code.toLowerCase().includes(q) ||
        c.levelLabel.toLowerCase().includes(q) ||
        c.stream.toLowerCase().includes(q)
      return matchesLevel && matchesQuery
    })
  }, [search, levelFilter])

  const filteredSubjects = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return subjects
    return subjects.filter(
      (s) =>
        s.code.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q) ||
        s.teachers.some((t) => t.toLowerCase().includes(q))
    )
  }, [subjects, search])

  const handleQuickAddSubject = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSubjCode.trim() || !newSubjName.trim()) return
    const created: DummySubject = {
      id: subjects.length + 100,
      code: newSubjCode.trim().toUpperCase(),
      name: newSubjName.trim(),
      cohorts: ["IG K1", "IAL A1"],
      teachers: ["U Kyaw Swar"],
      weeklyHours: 4.5,
    }
    setSubjects((prev) => [created, ...prev])
    setNewSubjCode("")
    setNewSubjName("")
  }

  const toggleSelectCohort = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  return (
    <div className="space-y-4">
      <SystemHeader
        domain="ACADEMICS"
        breadcrumb={[
          {
            label:
              activeTab === "cohorts"
                ? "COHORTS & STREAMS"
                : "GLOBAL SUBJECT POOL",
          },
        ]}
        title="Academics Hub"
        description="Unified Option A workspace: Cohorts and the Global Subject Catalog live side-by-side 1 tab apart without redundant columns."
        metrics={[
          { label: "TOTAL COHORTS", value: DUMMY_COHORTS.length },
          { label: "GLOBAL SUBJECTS", value: subjects.length },
          {
            label: "ACTIVE ENROLLMENTS",
            value: DUMMY_COHORTS.reduce((acc, c) => acc + c.studentCount, 0),
          },
        ]}
        tabs={[
          { id: "cohorts", label: "Cohorts", count: DUMMY_COHORTS.length },
          {
            id: "subjects",
            label: "Subject Catalog",
            count: subjects.length,
          },
        ]}
        activeTab={activeTab}
        onTabChange={(t) => {
          setActiveTab(t)
          setSearch("")
        }}
        actions={
          <Button size="sm" className="gap-1.5">
            <Plus className="size-3.5" />
            {activeTab === "cohorts" ? "New Cohort" : "New Global Subject"}
          </Button>
        }
      />

      {activeTab === "cohorts" ? (
        <DataModule
          searchPlaceholder="Filter cohorts by code, education level, or stream…"
          searchValue={search}
          onSearchChange={setSearch}
          filters={
            <div className="flex items-center gap-1">
              {(
                [
                  { id: "ALL", label: "ALL LEVELS" },
                  { id: "IG", label: "IGCSE" },
                  { id: "IAL", label: "IAL" },
                  { id: "YEAR", label: "YEAR 7–9" },
                ] as const
              ).map((lvl) => (
                <button
                  key={lvl.id}
                  type="button"
                  onClick={() => setLevelFilter(lvl.id)}
                  className={cn(
                    "h-8 rounded-sm border px-2.5 font-mono text-[11px] font-medium transition-colors",
                    levelFilter === lvl.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-muted-foreground hover:text-foreground"
                  )}
                >
                  {lvl.label}
                </button>
              ))}
            </div>
          }
          selectedCount={selectedIds.length}
          onClearSelection={() => setSelectedIds([])}
          bulkActions={
            <Button variant="outline" size="xs">
              Export Selected Timetables
            </Button>
          }
          totalCount={filteredCohorts.length}
          countLabel="COHORTS"
          page={1}
          totalPages={1}
        >
          <Table>
            <TableHeader>
              <TableRow className="h-9 bg-muted/30 hover:bg-muted/30">
                <TableHead className="w-10 px-3.5">
                  <Checkbox
                    checked={
                      filteredCohorts.length > 0 &&
                      selectedIds.length === filteredCohorts.length
                    }
                    onCheckedChange={(checked) =>
                      setSelectedIds(
                        checked ? filteredCohorts.map((c) => c.id) : []
                      )
                    }
                    aria-label="Select all cohorts"
                  />
                </TableHead>
                <TableHead className="font-mono text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                  Cohort Code
                </TableHead>
                <TableHead className="font-mono text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                  Education Level
                </TableHead>
                <TableHead className="font-mono text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                  Stream
                </TableHead>
                <TableHead className="font-mono text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                  Telemetry
                </TableHead>
                <TableHead className="text-right font-mono text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCohorts.map((cls) => (
                <TableRow
                  key={cls.id}
                  onClick={() => setInspectedCohort(cls)}
                  className="h-11 cursor-pointer transition-colors hover:bg-muted/40"
                >
                  <TableCell
                    className="px-3.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Checkbox
                      checked={selectedIds.includes(cls.id)}
                      onCheckedChange={() => toggleSelectCohort(cls.id)}
                      aria-label={`Select ${cls.code}`}
                    />
                  </TableCell>
                  <TableCell>
                    <CodeChip accent>{cls.code}</CodeChip>
                  </TableCell>
                  <TableCell className="text-[13px] font-medium text-foreground">
                    {cls.levelLabel}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {cls.stream}
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-xs tabular-nums text-foreground">
                      {cls.studentCount} students · {cls.subjectCount} subjects · {cls.slotCount} slots
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={(e) => {
                        e.stopPropagation()
                        setInspectedCohort(cls)
                      }}
                    >
                      Inspect →
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataModule>
      ) : (
        <div className="space-y-3">
          {/* Quick-Add Global Subject Bar */}
          <form
            onSubmit={handleQuickAddSubject}
            className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-muted/30 p-3"
          >
            <span className="font-mono text-[11px] font-semibold tracking-wider text-primary uppercase">
              + QUICK ADD GLOBAL SUBJECT
            </span>
            <Input
              value={newSubjCode}
              onChange={(e) => setNewSubjCode(e.target.value)}
              placeholder="Code (e.g. SUB-08)"
              className="h-8 w-40 bg-background font-mono text-xs"
            />
            <Input
              value={newSubjName}
              onChange={(e) => setNewSubjName(e.target.value)}
              placeholder="Subject title (e.g. Economics)"
              className="h-8 min-w-[200px] flex-1 bg-background text-xs"
            />
            <Button type="submit" size="sm" className="h-8 gap-1">
              <Plus className="size-3.5" />
              Add to Global Pool
            </Button>
          </form>

          <DataModule
            searchPlaceholder="Search global subject catalog by code, title, or teacher…"
            searchValue={search}
            onSearchChange={setSearch}
            totalCount={filteredSubjects.length}
            countLabel="GLOBAL SUBJECTS"
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
                    Subject Name
                  </TableHead>
                  <TableHead className="font-mono text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                    Active Cohorts
                  </TableHead>
                  <TableHead className="font-mono text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                    Assigned Teachers
                  </TableHead>
                  <TableHead className="text-right font-mono text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                    Weekly Hours
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubjects.map((sub) => (
                  <TableRow key={sub.id} className="h-11 hover:bg-muted/40">
                    <TableCell className="px-3.5">
                      <CodeChip accent>{sub.code}</CodeChip>
                    </TableCell>
                    <TableCell className="text-[13px] font-medium text-foreground">
                      {sub.name}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {sub.cohorts.map((c) => (
                          <CodeChip key={c}>{c}</CodeChip>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {sub.teachers.join(", ")}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs tabular-nums text-foreground">
                      {sub.weeklyHours} hrs/wk
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </DataModule>
        </div>
      )}

      {/* Slide-Over Cohort Inspector Sheet */}
      <InspectorSheet
        open={Boolean(inspectedCohort)}
        onOpenChange={(open) => {
          if (!open) setInspectedCohort(null)
        }}
        code={inspectedCohort?.code ?? "COHORT"}
        title={
          inspectedCohort
            ? `${inspectedCohort.code} — ${inspectedCohort.levelLabel}`
            : ""
        }
        subtitle="Deduplicated Cohort Inspector · Zero redundant columns in main table"
        status={{ label: "ACTIVE COHORT", tone: "active" }}
        fields={
          inspectedCohort
            ? [
                { label: "COHORT CODE", value: inspectedCohort.code, mono: true },
                { label: "LEVEL", value: inspectedCohort.levelLabel },
                { label: "STREAM", value: inspectedCohort.stream, mono: true },
                {
                  label: "ENROLLED STUDENTS",
                  value: `${inspectedCohort.studentCount} enrolled`,
                  mono: true,
                },
                {
                  label: "SUBJECT OFFERINGS",
                  value: `${inspectedCohort.subjectCount} subjects · ${inspectedCohort.slotCount} weekly slots`,
                  mono: true,
                },
              ]
            : []
        }
        footerActions={
          <div className="flex w-full items-center justify-between gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInspectedCohort(null)}
            >
              Close
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                Open Schedule Grid
              </Button>
              <Button size="sm">Take Cohort Roll</Button>
            </div>
          </div>
        }
      >
        <div className="space-y-2 rounded-sm border border-border bg-muted/20 p-3">
          <div className="font-mono text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
            WHY THIS REPLACES THE LEGACY 7-COLUMN TABLE
          </div>
          <p className="text-xs text-muted-foreground">
            Previously, <code className="font-mono text-foreground">Code</code>,{" "}
            <code className="font-mono text-foreground">Display Name</code>, and{" "}
            <code className="font-mono text-foreground">Title</code> repeated{" "}
            <strong className="text-foreground">{inspectedCohort?.code}</strong>{" "}
            three times per row. Now the table is scannable in 5 columns and
            opens this slide-over inspector for quick actions.
          </p>
        </div>
      </InspectorSheet>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* FLOW 3: STUDENT DIRECTORY + SLIDE-OVER QR INSPECTOR & DAILY CHECK-IN HUB   */
/* -------------------------------------------------------------------------- */

function Flow3StudentsAndCheckIn() {
  const [subMode, setSubMode] = React.useState<"directory" | "checkin">(
    "directory"
  )
  const [search, setSearch] = React.useState("")
  const [students, setStudents] =
    React.useState<DummyStudent[]>(DUMMY_STUDENTS)
  const [inspectedStudentId, setInspectedStudentId] = React.useState<
    number | null
  >(DUMMY_STUDENTS[0]?.id ?? null)
  const [checkInTab, setCheckInTab] = React.useState<string>("daily-roll")
  const [rollFilter, setRollFilter] = React.useState<
    "ALL" | "ARRIVED" | "MISSING"
  >("ALL")

  // Unified InspectorSheet 2-tab state & Check-in date clamp state
  const [studentSheetTab, setStudentSheetTab] = React.useState<
    "pass" | "profile"
  >("pass")
  const todayStr = React.useMemo(
    () => new Date().toISOString().split("T")[0],
    []
  )
  const [checkInDate, setCheckInDate] = React.useState<string>(todayStr)

  const inspectedStudent =
    students.find((s) => s.id === inspectedStudentId) ?? null

  const filteredStudents = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    return students.filter((s) => {
      const matchesQ =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        s.schoolCode.toLowerCase().includes(q) ||
        s.cohorts.some((c) => c.toLowerCase().includes(q))
      return matchesQ
    })
  }, [students, search])

  const toggleStudentQrStatus = (studentId: number) => {
    setStudents((prev) =>
      prev.map((s) =>
        s.id === studentId ? { ...s, qrActive: !s.qrActive } : s
      )
    )
  }

  const regenerateStudentQrToken = (studentId: number) => {
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase()
    setStudents((prev) =>
      prev.map((s) =>
        s.id === studentId
          ? {
              ...s,
              qrActive: true,
              qrToken: `QR-${s.code}-${randomSuffix}`,
            }
          : s
      )
    )
  }

  const toggleArrival = (studentId: number) => {
    setStudents((prev) =>
      prev.map((s) =>
        s.id === studentId
          ? {
              ...s,
              checkedInToday: !s.checkedInToday,
              checkInTime: !s.checkedInToday ? "08:42 AM" : null,
              checkInMethod: !s.checkedInToday ? "manual" : null,
            }
          : s
      )
    )
  }

  const arrivedCount = students.filter((s) => s.checkedInToday).length
  const missingCount = students.length - arrivedCount

  return (
    <div className="space-y-4">
      {/* Sub-mode switcher */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-muted/30 p-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSubMode("directory")}
            className={cn(
              "flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-xs font-semibold transition-colors",
              subMode === "directory"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-background hover:text-foreground"
            )}
          >
            <Users className="size-3.5" />
            Students Directory (with Slide-Over QR Sheet)
          </button>
          <button
            type="button"
            onClick={() => setSubMode("checkin")}
            className={cn(
              "flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-xs font-semibold transition-colors",
              subMode === "checkin"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-background hover:text-foreground"
            )}
          >
            <QrCode className="size-3.5" />
            Check-In Hub (Daily Roll | Scan Log)
          </button>
        </div>
        <TelemetryTag status="info">
          RETIRES 980-LINE /check-in/management PAGE
        </TelemetryTag>
      </div>

      {subMode === "directory" ? (
        <>
          <SystemHeader
            domain="PEOPLE"
            breadcrumb={[
              { label: "STUDENT DIRECTORY" },
              { label: "QR BADGE DRAWER" },
            ]}
            title="Students"
            description="Click any student row or 'View QR' to open the slide-over QR credential inspector directly in context."
            metrics={[
              { label: "TOTAL STUDENTS", value: students.length },
              {
                label: "ACTIVE QR BADGES",
                value: `${students.filter((s) => s.qrActive).length}/${students.length}`,
                tone: "success",
              },
            ]}
            actions={
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Download className="size-3.5" />
                  Export All QR Badges (ZIP)
                </Button>
                <Button size="sm" className="gap-1.5">
                  <Plus className="size-3.5" />
                  Enroll Student
                </Button>
              </div>
            }
          />

          <DataModule
            searchPlaceholder="Search by student name, HIS/MYA code, or cohort…"
            searchValue={search}
            onSearchChange={setSearch}
            totalCount={filteredStudents.length}
            countLabel="STUDENTS"
            page={1}
            totalPages={1}
          >
            <Table>
              <TableHeader>
                <TableRow className="h-9 bg-muted/30 hover:bg-muted/30">
                  <TableHead className="px-3.5 font-mono text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                    Student Code
                  </TableHead>
                  <TableHead className="font-mono text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                    Student Name
                  </TableHead>
                  <TableHead className="font-mono text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                    Cohorts
                  </TableHead>
                  <TableHead className="font-mono text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                    Attendance Rate
                  </TableHead>
                  <TableHead className="font-mono text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                    QR Badge Status
                  </TableHead>
                  <TableHead className="text-right font-mono text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                    QR Inspector
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map((stu) => (
                  <TableRow
                    key={stu.id}
                    onClick={() => setInspectedStudentId(stu.id)}
                    className="h-11 cursor-pointer hover:bg-muted/40"
                  >
                    <TableCell className="px-3.5">
                      <CodeChip accent>{stu.code}</CodeChip>
                    </TableCell>
                    <TableCell className="text-[13px] font-medium text-foreground">
                      {stu.name}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {stu.cohorts.map((c) => (
                          <CodeChip key={c}>{c}</CodeChip>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs tabular-nums text-foreground">
                      {stu.attendanceRate}
                    </TableCell>
                    <TableCell>
                      <TelemetryTag
                        status={stu.qrActive ? "active" : "inactive"}
                      >
                        {stu.qrActive ? "QR ACTIVE" : "REVOKED"}
                      </TelemetryTag>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="xs"
                        className="gap-1"
                        onClick={(e) => {
                          e.stopPropagation()
                          setInspectedStudentId(stu.id)
                        }}
                      >
                        <QrCode className="size-3" />
                        View QR
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </DataModule>

          {/* Student Slide-Over QR Inspector Sheet with Segmented 2-Tab Switcher */}
          <InspectorSheet
            open={Boolean(inspectedStudent)}
            onOpenChange={(open) => {
              if (!open) {
                setInspectedStudentId(null)
                setStudentSheetTab("pass")
              }
            }}
            code={inspectedStudent?.code ?? "STUDENT"}
            title={inspectedStudent?.name ?? ""}
            subtitle="Slide-Over Student Credential & Telemetry Inspector"
            status={
              inspectedStudent
                ? {
                    label: inspectedStudent.qrActive
                      ? "QR BADGE ACTIVE"
                      : "QR REVOKED",
                    tone: inspectedStudent.qrActive ? "active" : "inactive",
                  }
                : undefined
            }
            fields={
              inspectedStudent
                ? [
                    {
                      label: "STUDENT CODE",
                      value: inspectedStudent.code,
                      mono: true,
                    },
                    {
                      label: "SCHOOL STREAM",
                      value: inspectedStudent.schoolCode,
                      mono: true,
                    },
                    {
                      label: "ENROLLED COHORTS",
                      value: inspectedStudent.cohorts.join(", "),
                    },
                    {
                      label: "ATTENDANCE RATE",
                      value: inspectedStudent.attendanceRate,
                      mono: true,
                    },
                  ]
                : []
            }
            footerActions={
              inspectedStudent ? (
                <div className="flex w-full items-center justify-between gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setInspectedStudentId(null)
                      setStudentSheetTab("pass")
                    }}
                  >
                    Done
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => toggleStudentQrStatus(inspectedStudent.id)}
                  >
                    {inspectedStudent.qrActive
                      ? "Deactivate Pass"
                      : "Activate Pass"}
                  </Button>
                </div>
              ) : null
            }
          >
            {inspectedStudent && (
              <div className="space-y-4">
                {/* Unified Segmented 2-Tab Switcher */}
                <div className="flex items-center gap-1 rounded-sm border border-border bg-muted/40 p-1 font-mono text-xs">
                  <button
                    type="button"
                    onClick={() => setStudentSheetTab("pass")}
                    className={cn(
                      "flex-1 rounded-[2px] py-1 text-center font-medium transition-colors",
                      studentSheetTab === "pass"
                        ? "bg-background text-foreground shadow-2xs font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    QR Pass & Telemetry
                  </button>
                  <button
                    type="button"
                    onClick={() => setStudentSheetTab("profile")}
                    className={cn(
                      "flex-1 rounded-[2px] py-1 text-center font-medium transition-colors",
                      studentSheetTab === "profile"
                        ? "bg-background text-foreground shadow-2xs font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Edit Profile
                  </button>
                </div>

                {studentSheetTab === "pass" ? (
                  <div className="space-y-4">
                    {/* QR Pass Card */}
                    <div className="flex flex-col items-center gap-3 rounded-md border border-border bg-muted/30 p-4">
                      <div className="flex w-full items-center justify-between">
                        <span className="font-mono text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                          LIVE CAMPUS QR CREDENTIAL
                        </span>
                        <CodeChip>{inspectedStudent.qrToken}</CodeChip>
                      </div>

                      {inspectedStudent.qrActive ? (
                        <QrCanvas
                          value={inspectedStudent.qrToken}
                          size={160}
                          className="rounded-sm border border-border bg-white p-1"
                        />
                      ) : (
                        <div className="flex size-[160px] flex-col items-center justify-center rounded-sm border border-dashed border-destructive/50 bg-destructive/5 p-4 text-center">
                          <span className="font-mono text-xs font-semibold text-destructive uppercase">
                            TOKEN REVOKED
                          </span>
                          <span className="mt-1 text-[11px] text-muted-foreground">
                            Click Activate or Rotate Token below to issue a new badge.
                          </span>
                        </div>
                      )}

                      {/* Action buttons aligned directly below the QR code card */}
                      <div className="grid w-full grid-cols-2 gap-2 pt-1 sm:grid-cols-4">
                        <Button
                          variant="outline"
                          size="xs"
                          className="h-8 gap-1 font-mono text-[11px]"
                          onClick={() =>
                            regenerateStudentQrToken(inspectedStudent.id)
                          }
                        >
                          <RefreshCw className="size-3" />
                          Rotate
                        </Button>
                        <Button
                          variant="outline"
                          size="xs"
                          className="h-8 gap-1 font-mono text-[11px]"
                        >
                          <Download className="size-3" />
                          PNG
                        </Button>
                        <Button
                          variant="outline"
                          size="xs"
                          className="h-8 gap-1 font-mono text-[11px]"
                        >
                          <Printer className="size-3" />
                          Print
                        </Button>
                        <Button
                          variant={inspectedStudent.qrActive ? "outline" : "default"}
                          size="xs"
                          className={cn(
                            "h-8 font-mono text-[11px]",
                            inspectedStudent.qrActive && "text-destructive hover:text-destructive"
                          )}
                          onClick={() =>
                            toggleStudentQrStatus(inspectedStudent.id)
                          }
                        >
                          {inspectedStudent.qrActive ? "Deactivate" : "Activate"}
                        </Button>
                      </div>
                    </div>

                    {/* Telemetry info */}
                    <div className="space-y-2 rounded-sm border border-border bg-card p-3 text-xs">
                      <div className="flex items-center justify-between border-b border-border/60 pb-1.5">
                        <span className="text-muted-foreground">Guardian Contact:</span>
                        <span className="font-mono font-medium text-foreground">
                          {inspectedStudent.contact}
                        </span>
                      </div>
                      <div className="flex items-center justify-between border-b border-border/60 pb-1.5">
                        <span className="text-muted-foreground">Campus Status:</span>
                        <span className="font-medium text-foreground">
                          {inspectedStudent.checkedInToday
                            ? `Arrived (${inspectedStudent.checkInTime})`
                            : "Not Checked In Today"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Enrolled Cohorts:</span>
                        <div className="flex flex-wrap gap-1">
                          {inspectedStudent.cohorts.map((c) => (
                            <CodeChip key={c}>{c}</CodeChip>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 rounded-md border border-border bg-card p-3 text-xs">
                    <div className="space-y-1">
                      <label className="font-mono text-[10px] uppercase text-muted-foreground">
                        Student Full Name
                      </label>
                      <Input
                        defaultValue={inspectedStudent.name}
                        className="h-8 font-mono text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-mono text-[10px] uppercase text-muted-foreground">
                        Student Code
                      </label>
                      <Input
                        defaultValue={inspectedStudent.code}
                        className="h-8 font-mono text-xs uppercase"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-mono text-[10px] uppercase text-muted-foreground">
                        School Stream
                      </label>
                      <Input
                        defaultValue={inspectedStudent.schoolCode}
                        className="h-8 font-mono text-xs uppercase"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-mono text-[10px] uppercase text-muted-foreground">
                        Guardian Contact Phone
                      </label>
                      <Input
                        defaultValue={inspectedStudent.contact}
                        className="h-8 font-mono text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-mono text-[10px] uppercase text-muted-foreground">
                        Administrative Notes
                      </label>
                      <Input
                        defaultValue="Enrolled for academic session 2026-2027. Transport route kamayut."
                        className="h-8 text-xs"
                      />
                    </div>
                    <Button size="sm" className="mt-2 w-full">
                      Save Profile Changes
                    </Button>
                  </div>
                )}
              </div>
            )}
          </InspectorSheet>
        </>
      ) : (
        <>
          <SystemHeader
            domain="CAMPUS GATE"
            breadcrumb={[{ label: "DAILY CHECK-IN HUB" }]}
            title="Campus Check-In"
            description="Single operational hub for Daily Roll (Missing vs Arrived) and Scan Log & Bulk Undo, plus Kiosk launcher."
            metrics={[
              {
                label: "ARRIVED TODAY",
                value: arrivedCount,
                tone: "success",
              },
              {
                label: "MISSING",
                value: missingCount,
                tone: missingCount > 0 ? "destructive" : "default",
              },
              {
                label: "GATE RATE",
                value: `${Math.round((arrivedCount / students.length) * 100)}%`,
              },
            ]}
            tabs={[
              {
                id: "daily-roll",
                label: "Daily Roll (Missing vs Arrived)",
                count: students.length,
              },
              {
                id: "scan-log",
                label: "Scan Log & Bulk Undo",
                count: arrivedCount,
              },
            ]}
            activeTab={checkInTab}
            onTabChange={setCheckInTab}
            actions={
              <Button size="sm" variant="default" className="gap-1.5">
                Launch Kiosk Terminal
                <ExternalLink className="size-3.5" />
              </Button>
            }
          />

          <DataModule
            searchPlaceholder="Filter campus roll by student or HIS/MYA code…"
            searchValue={search}
            onSearchChange={setSearch}
            filters={
              <div className="flex flex-wrap items-center gap-2">
                {/* Date Picker with Today/Past Clamp */}
                <div className="flex items-center gap-1.5 rounded-sm border border-border bg-background px-2 py-1">
                  <span className="font-mono text-[10px] font-semibold text-muted-foreground uppercase">
                    ROLL DATE:
                  </span>
                  <input
                    type="date"
                    value={checkInDate}
                    max={todayStr}
                    onChange={(e) => {
                      if (e.target.value <= todayStr) {
                        setCheckInDate(e.target.value)
                      }
                    }}
                    className="bg-transparent font-mono text-xs text-foreground outline-hidden"
                  />
                </div>
                <span className="hidden items-center gap-1 rounded-[2px] border border-border bg-muted/40 px-2 py-1 font-mono text-[10px] font-semibold text-muted-foreground uppercase sm:inline-flex">
                  <span className="size-1.5 rounded-[1px] bg-emerald-500" />
                  max={todayStr} clamp enforced
                </span>

                {checkInTab === "daily-roll" && (
                  <div className="flex items-center gap-1">
                    {(["ALL", "MISSING", "ARRIVED"] as const).map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => setRollFilter(status)}
                        className={cn(
                          "h-8 rounded-sm border px-2.5 font-mono text-[11px] font-medium transition-colors",
                          rollFilter === status
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-background text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            }
            totalCount={students.length}
            countLabel="GATE RECORDS"
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
                    Student
                  </TableHead>
                  <TableHead className="font-mono text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                    Campus Status
                  </TableHead>
                  <TableHead className="font-mono text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                    Timestamp / Method
                  </TableHead>
                  <TableHead className="text-right font-mono text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                    Gate Action
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students
                  .filter((s) => {
                    if (checkInTab === "scan-log") return s.checkedInToday
                    if (rollFilter === "ARRIVED") return s.checkedInToday
                    if (rollFilter === "MISSING") return !s.checkedInToday
                    return true
                  })
                  .map((stu) => (
                    <TableRow key={stu.id} className="h-11 hover:bg-muted/40">
                      <TableCell className="px-3.5">
                        <CodeChip accent>{stu.code}</CodeChip>
                      </TableCell>
                      <TableCell className="text-[13px] font-medium text-foreground">
                        {stu.name}
                      </TableCell>
                      <TableCell>
                        <TelemetryTag
                          status={stu.checkedInToday ? "present" : "absent"}
                        >
                          {stu.checkedInToday ? "ARRIVED" : "MISSING"}
                        </TelemetryTag>
                      </TableCell>
                      <TableCell className="font-mono text-xs tabular-nums text-muted-foreground uppercase">
                        {stu.checkedInToday
                          ? `${stu.checkInTime} · ${stu.checkInMethod}`
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant={stu.checkedInToday ? "outline" : "default"}
                          size="xs"
                          onClick={() => toggleArrival(stu.id)}
                        >
                          {stu.checkedInToday
                            ? "Undo Check-In"
                            : "Manual Check-In"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </DataModule>
        </>
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* FLOW 4: DIRECT SCHEDULE & ATTENDANCE WORKSPACE (ZERO MIDDLEMAN PAGES)      */
/* -------------------------------------------------------------------------- */

function Flow4ScheduleAndAttendance() {
  const [selectedCohort, setSelectedCohort] = React.useState<string>("IG K1")
  const [viewMode, setViewMode] = React.useState<string>("weekly-grid")
  const [slots, setSlots] = React.useState<DummyTimetableSlot[]>(DUMMY_SLOTS)
  const [inspectedSlotId, setInspectedSlotId] = React.useState<string | null>(
    null
  )
  const [newSlotDay, setNewSlotDay] = React.useState<
    DummyTimetableSlot["day"] | null
  >(null)
  const [newSlotTimeRange, setNewSlotTimeRange] =
    React.useState<string>("16:00 - 17:30")
  const [newSlotSubject, setNewSlotSubject] =
    React.useState<string>("Mathematics")
  const [newSlotTeacher, setNewSlotTeacher] =
    React.useState<string>("Daw Su Su")
  const [newSlotRoom, setNewSlotRoom] = React.useState<string>("RM-201")
  const [drawerTab, setDrawerTab] = React.useState<"occurrences" | "template">(
    "occurrences"
  )
  const [subTeacherInput, setSubTeacherInput] = React.useState<string>("")

  // Generate Sessions date-range confirmation drawer state:
  const [generateSessionsOpen, setGenerateSessionsOpen] =
    React.useState<boolean>(false)
  const [genPreset, setGenPreset] = React.useState<"month" | "30days" | "term">(
    "month"
  )
  const [genStartDate, setGenStartDate] = React.useState<string>("2026-11-01")
  const [genEndDate, setGenEndDate] = React.useState<string>("2026-11-30")
  const [generationExecuted, setGenerationExecuted] =
    React.useState<boolean>(false)

  // Attendance Dual-Mode (Daily Session Roll vs Monthly Matrix) state:
  const [attendanceSubMode, setAttendanceSubMode] = React.useState<
    "daily" | "matrix"
  >("matrix")
  const [matrixSubjectFilter, setMatrixSubjectFilter] =
    React.useState<string>("ALL")

  const MATRIX_OCCURRENCES = [
    { id: "s0", date: "Nov 02", time: "Mon 09:00", subject: "Mathematics" },
    { id: "s1", date: "Nov 04", time: "Wed 10:45", subject: "Physics" },
    { id: "s2", date: "Nov 06", time: "Fri 14:00", subject: "Chemistry" },
    { id: "s3", date: "Nov 09", time: "Mon 09:00", subject: "Mathematics" },
    { id: "s4", date: "Nov 11", time: "Wed 10:45", subject: "Physics" },
    { id: "s5", date: "Nov 13", time: "Fri 14:00", subject: "Chemistry" },
    { id: "s6", date: "Nov 16", time: "Mon 09:00", subject: "Mathematics" },
    { id: "s7", date: "Nov 18", time: "Wed 10:45", subject: "Physics" },
    { id: "s8", date: "Nov 20", time: "Fri 14:00", subject: "Chemistry" },
    { id: "s9", date: "Nov 23", time: "Mon 09:00", subject: "Mathematics" },
  ]

  const filteredMatrixOccurrences = React.useMemo(() => {
    if (matrixSubjectFilter === "ALL") return MATRIX_OCCURRENCES
    return MATRIX_OCCURRENCES.filter(
      (o) => o.subject.toUpperCase() === matrixSubjectFilter.toUpperCase()
    )
  }, [matrixSubjectFilter])

  const [matrixStatuses, setMatrixStatuses] = React.useState<
    Record<string, "present" | "late" | "absent" | "excused">
  >({
    "0-s0": "present", "0-s1": "present", "0-s2": "present", "0-s3": "late", "0-s4": "present", "0-s5": "present", "0-s6": "present", "0-s7": "present", "0-s8": "present", "0-s9": "present",
    "1-s0": "present", "1-s1": "late", "1-s2": "present", "1-s3": "present", "1-s4": "absent", "1-s5": "present", "1-s6": "present", "1-s7": "late", "1-s8": "present", "1-s9": "present",
    "2-s0": "absent", "2-s1": "excused", "2-s2": "present", "2-s3": "present", "2-s4": "present", "2-s5": "present", "2-s6": "excused", "2-s7": "present", "2-s8": "present", "2-s9": "absent",
    "3-s0": "present", "3-s1": "present", "3-s2": "present", "3-s3": "present", "3-s4": "present", "3-s5": "present", "3-s6": "present", "3-s7": "present", "3-s8": "present", "3-s9": "present",
    "4-s0": "present", "4-s1": "present", "4-s2": "late", "4-s3": "present", "4-s4": "present", "4-s5": "present", "4-s6": "present", "4-s7": "late", "4-s8": "present", "4-s9": "present",
    "5-s0": "excused", "5-s1": "present", "5-s2": "present", "5-s3": "present", "5-s4": "present", "5-s5": "present", "5-s6": "present", "5-s7": "present", "5-s8": "present", "5-s9": "present",
  })

  // Tactical daily roll statuses
  const [dailyStatuses, setDailyStatuses] = React.useState<
    Record<number, "present" | "late" | "absent" | "excused">
  >({
    1: "present",
    2: "late",
    3: "absent",
    4: "present",
    5: "present",
    6: "excused",
  })

  const cohortSlots = React.useMemo(
    () => slots.filter((s) => s.cohortCode === selectedCohort),
    [slots, selectedCohort]
  )

  const inspectedSlot =
    slots.find((s) => s.id === inspectedSlotId) ?? null

  const handleAssignSubstitute = (slotId: string) => {
    if (!subTeacherInput.trim()) return
    setSlots((prev) =>
      prev.map((s) =>
        s.id === slotId
          ? { ...s, substituteTeacher: subTeacherInput.trim() }
          : s
      )
    )
    setSubTeacherInput("")
  }

  const handleCreateSlot = () => {
    if (!newSlotDay || !newSlotTimeRange.trim() || !newSlotRoom.trim()) return
    const created: DummyTimetableSlot = {
      id: `SLOT-${selectedCohort.replace(/\s+/g, "")}-${newSlotDay.toUpperCase()}-${Date.now()}`,
      cohortCode: selectedCohort,
      day: newSlotDay,
      timeRange: newSlotTimeRange.trim(),
      subject: newSlotSubject,
      assignedTeacher: newSlotTeacher,
      substituteTeacher: null,
      room: newSlotRoom.trim().toUpperCase(),
      upcomingDates: [
        {
          date: "2026-11-09",
          status: "scheduled",
          actualTeacher: newSlotTeacher,
          presentCount: 0,
          totalCount: 24,
        },
      ],
    }
    setSlots((prev) => [...prev, created])
    setNewSlotDay(null)
  }

  const handleExecuteGenerateSessions = () => {
    setGenerationExecuted(true)
    setTimeout(() => {
      setGenerateSessionsOpen(false)
      setViewMode("dated-sessions")
    }, 600)
  }

  const handleMarkAllDailyPresent = () => {
    const updated: Record<number, "present"> = {}
    DUMMY_STUDENTS.slice(0, 6).forEach((s) => {
      updated[s.id] = "present"
    })
    setDailyStatuses(updated)
  }

  return (
    <div className="space-y-4">
      <SystemHeader
        domain="SCHEDULE & ROLL"
        breadcrumb={[
          { label: "DIRECT WORKSPACE" },
          { label: selectedCohort },
        ]}
        title={`Schedule & Attendance — ${selectedCohort}`}
        description="Switch cohorts inline via CohortSwitcher. Zero middleman class-picker pages; click any slot to assign substitutes or take roll."
        metrics={[
          { label: "ACTIVE COHORT", value: selectedCohort },
          { label: "WEEKLY SLOTS", value: cohortSlots.length },
          { label: "MIDDLEMAN PAGES", value: "0", tone: "success" },
        ]}
        tabs={[
          { id: "weekly-grid", label: "Weekly Grid", count: cohortSlots.length },
          {
            id: "dated-sessions",
            label: "Dated Sessions",
            count: cohortSlots.flatMap((s) => s.upcomingDates).length,
          },
          { id: "roll-matrix", label: "Attendance Workspace" },
        ]}
        activeTab={viewMode}
        onTabChange={setViewMode}
        actions={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="gap-1.5 font-mono text-xs"
              onClick={() => setGenerateSessionsOpen(true)}
            >
              <Sparkles className="size-3.5" />
              + Generate Sessions
            </Button>
          </div>
        }
      />

      {/* Inline CohortSwitcher Bar */}
      <CohortSwitcher
        value={selectedCohort}
        onValueChange={setSelectedCohort}
        includeAdhoc
      />

      {viewMode === "weekly-grid" && (
        <div className="overflow-hidden rounded-md border border-border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/40 px-4 py-2.5">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs font-semibold text-foreground uppercase">
                7-DAY EDUCATION CENTER TIMETABLE · {selectedCohort}
              </span>
              <span className="hidden items-center gap-3 font-mono text-[10px] text-muted-foreground sm:inline-flex">
                <span className="inline-flex items-center gap-1">
                  <span className="size-1.5 rounded-[1px] bg-foreground" />
                  REGULAR CLASS
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="size-1.5 rounded-[1px] bg-amber-500" />
                  SUBSTITUTE ACTIVE
                </span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="xs"
                variant="outline"
                className="h-7 gap-1 font-mono text-[11px]"
                onClick={() => setGenerateSessionsOpen(true)}
              >
                <Sparkles className="size-3" />
                Generate Sessions
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[1020px]">
              {/* 7-Day Column Header Row (MON .. SUN) */}
              <div className="grid grid-cols-7 divide-x divide-border border-b border-border bg-muted/30">
                {(
                  ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const
                ).map((day) => {
                  const isWeekend = day === "Sat" || day === "Sun"
                  const dayCount = cohortSlots.filter(
                    (s) => s.day === day
                  ).length
                  return (
                    <div
                      key={day}
                      className={cn(
                        "flex items-center justify-between px-3 py-2.5 font-mono text-[11px] font-bold tracking-wider uppercase",
                        isWeekend ? "bg-muted/50 text-foreground" : "text-foreground"
                      )}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>{day.toUpperCase()}</span>
                        {isWeekend && (
                          <span className="rounded-[2px] border border-border bg-background px-1 py-0.2 text-[9px] font-semibold text-muted-foreground">
                            WKND
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-normal text-muted-foreground">
                        {dayCount} {dayCount === 1 ? "CLASS" : "CLASSES"}
                      </span>
                    </div>
                  )
                })}
              </div>

              {/* 7-Day Columns Body (Flexible Time-Sorted Slots per Day) */}
              <div className="grid grid-cols-7 divide-x divide-border">
                {(
                  ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const
                ).map((day) => {
                  const isWeekend = day === "Sat" || day === "Sun"
                  const daySlots = [...cohortSlots]
                    .filter((s) => s.day === day)
                    .sort((a, b) => a.timeRange.localeCompare(b.timeRange))

                  return (
                    <div
                      key={day}
                      className={cn(
                        "flex min-h-[280px] flex-col justify-between gap-2 p-2",
                        isWeekend && "bg-muted/10"
                      )}
                    >
                      <div className="space-y-2">
                        {daySlots.map((slot) => {
                          const hasSub = Boolean(slot.substituteTeacher)
                          return (
                            <button
                              key={slot.id}
                              type="button"
                              onClick={() => {
                                setInspectedSlotId(slot.id)
                                setDrawerTab("occurrences")
                              }}
                              className={cn(
                                "group flex w-full flex-col justify-between rounded-sm border border-border bg-card p-2.5 text-left transition-colors hover:border-foreground/50 hover:bg-muted/20 border-l-2",
                                hasSub
                                  ? "border-l-amber-500"
                                  : "border-l-foreground"
                              )}
                            >
                              {/* Flexible Time Range + Room Badge */}
                              <div className="flex w-full items-center justify-between gap-1">
                                <span className="font-mono text-[11px] font-bold tabular-nums text-foreground">
                                  {slot.timeRange}
                                </span>
                                <CodeChip>{slot.room}</CodeChip>
                              </div>

                              {/* Subject Title */}
                              <div className="my-1.5">
                                <div className="line-clamp-2 text-xs font-semibold text-foreground">
                                  {slot.subject}
                                </div>
                              </div>

                              {/* Teacher / Substitute Footer */}
                              <div className="flex w-full items-center justify-between gap-1 border-t border-border/60 pt-1.5 text-[11px] text-muted-foreground">
                                <span
                                  className={cn(
                                    "truncate",
                                    hasSub && "font-medium text-warning"
                                  )}
                                >
                                  {hasSub
                                    ? `Sub: ${slot.substituteTeacher}`
                                    : slot.assignedTeacher}
                                </span>
                                <span
                                  className={cn(
                                    "inline-flex shrink-0 items-center gap-1 font-mono text-[9px] font-semibold uppercase",
                                    hasSub
                                      ? "text-warning"
                                      : "text-muted-foreground"
                                  )}
                                >
                                  <span
                                    className={cn(
                                      "size-1.5 rounded-[1px]",
                                      hasSub ? "bg-amber-500" : "bg-foreground"
                                    )}
                                  />
                                  {hasSub ? "SUB" : "REG"}
                                </span>
                              </div>
                            </button>
                          )
                        })}
                      </div>

                      {/* Interactive + Schedule Slot button at bottom of each day column */}
                      <button
                        type="button"
                        onClick={() => {
                          setInspectedSlotId(null)
                          setNewSlotDay(day)
                        }}
                        className="flex min-h-[44px] w-full cursor-pointer items-center justify-center rounded-sm border border-dashed border-border/70 bg-muted/10 px-2 py-2 text-center font-mono text-[10px] font-semibold tracking-wider text-muted-foreground/70 uppercase transition-colors hover:border-foreground hover:bg-muted/30 hover:text-foreground"
                      >
                        + SCHEDULE SLOT
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {viewMode === "dated-sessions" && (
        <DataModule
          searchPlaceholder="Filter dated session occurrences…"
          searchValue=""
          onSearchChange={() => {}}
          totalCount={cohortSlots.flatMap((s) => s.upcomingDates).length}
          countLabel="DATED OCCURRENCES"
          page={1}
          totalPages={1}
        >
          <Table>
            <TableHeader>
              <TableRow className="h-9 bg-muted/30 hover:bg-muted/30">
                <TableHead className="px-3.5 font-mono text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                  Date
                </TableHead>
                <TableHead className="font-mono text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                  Cohort & Subject
                </TableHead>
                <TableHead className="font-mono text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                  Actual Teacher
                </TableHead>
                <TableHead className="font-mono text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                  Roll Status
                </TableHead>
                <TableHead className="text-right font-mono text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                  Action
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cohortSlots.map((slot) =>
                slot.upcomingDates.map((occ) => (
                  <TableRow
                    key={`${slot.id}-${occ.date}`}
                    className="h-11 hover:bg-muted/40"
                  >
                    <TableCell className="px-3.5 font-mono text-xs tabular-nums text-foreground">
                      {occ.date} ({slot.timeRange})
                    </TableCell>
                    <TableCell className="text-[13px] font-medium text-foreground">
                      <CodeChip accent className="mr-2">
                        {slot.cohortCode}
                      </CodeChip>
                      {slot.subject}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {occ.actualTeacher}
                    </TableCell>
                    <TableCell>
                      <TelemetryTag
                        status={
                          occ.status === "completed"
                            ? "present"
                            : occ.status === "substituted"
                              ? "late"
                              : "info"
                        }
                      >
                        {occ.status.toUpperCase()} ({occ.presentCount})
                      </TelemetryTag>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => setViewMode("roll-matrix")}
                      >
                        Open Roll Matrix →
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </DataModule>
      )}

      {/* Attendance Workspace Dual-Mode: Daily Session Roll vs Monthly Matrix */}
      {viewMode === "roll-matrix" && (
        <div className="space-y-3">
          {/* Sub-mode Segmented Switcher */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-sm border border-border bg-card p-2">
            <div className="flex items-center gap-1 font-mono text-xs">
              <button
                type="button"
                onClick={() => setAttendanceSubMode("daily")}
                className={cn(
                  "rounded-[2px] px-3 py-1 font-semibold transition-colors",
                  attendanceSubMode === "daily"
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )}
              >
                Daily Session Roll
              </button>
              <button
                type="button"
                onClick={() => setAttendanceSubMode("matrix")}
                className={cn(
                  "rounded-[2px] px-3 py-1 font-semibold transition-colors",
                  attendanceSubMode === "matrix"
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )}
              >
                Monthly &amp; Subject Matrix
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground">
                COHORT // <strong className="text-foreground">{selectedCohort}</strong>
              </span>
            </div>
          </div>

          {attendanceSubMode === "daily" ? (
            /* Mode 1: Daily Session Roll (Tactical List) */
            <div className="overflow-hidden rounded-md border border-border bg-card">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/40 px-4 py-2.5">
                <div>
                  <div className="font-mono text-xs font-semibold text-foreground uppercase">
                    DAILY SESSION ROLL // MON 09:00 - 10:30 · MATHEMATICS · RM-201
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Daw Su Su · Enrolled Students in {selectedCohort}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="xs"
                    className="h-7 font-mono text-[11px]"
                    onClick={handleMarkAllDailyPresent}
                  >
                    Mark All Present
                  </Button>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow className="h-9 bg-muted/30 hover:bg-muted/30">
                    <TableHead className="px-3.5 font-mono text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                      Student Code
                    </TableHead>
                    <TableHead className="font-mono text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                      Student Name
                    </TableHead>
                    <TableHead className="font-mono text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                      Session Roll Status
                    </TableHead>
                    <TableHead className="font-mono text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                      Campus Gate
                    </TableHead>
                    <TableHead className="text-right font-mono text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                      Remarks
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {DUMMY_STUDENTS.slice(0, 6).map((stu) => {
                    const status = dailyStatuses[stu.id] ?? "present"
                    return (
                      <TableRow key={stu.id} className="h-11 hover:bg-muted/40">
                        <TableCell className="px-3.5">
                          <CodeChip accent>{stu.code}</CodeChip>
                        </TableCell>
                        <TableCell className="text-[13px] font-medium text-foreground">
                          {stu.name}
                        </TableCell>
                        <TableCell>
                          <RollStatusControl
                            value={status}
                            onChange={(val) =>
                              setDailyStatuses((prev) => ({
                                ...prev,
                                [stu.id]: val,
                              }))
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <TelemetryTag
                            status={stu.checkedInToday ? "present" : "absent"}
                          >
                            {stu.checkedInToday
                              ? `ARRIVED (${stu.checkInTime})`
                              : "NOT CHECKED IN"}
                          </TelemetryTag>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs text-muted-foreground">
                          Regular Session
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            /* Mode 2: Monthly & Subject Matrix (Sticky-Column Architecture) */
            <div className="space-y-3">
              {/* Matrix Command & Subject Filter Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-sm border border-border bg-card p-2.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    SUBJECT:
                  </span>
                  {(["ALL", "MATHEMATICS", "PHYSICS", "CHEMISTRY"] as const).map(
                    (sub) => (
                      <button
                        key={sub}
                        type="button"
                        onClick={() => setMatrixSubjectFilter(sub)}
                        className={cn(
                          "rounded-[2px] border px-2.5 py-0.5 font-mono text-[11px] uppercase transition-colors",
                          matrixSubjectFilter === sub
                            ? "border-primary bg-primary text-primary-foreground font-semibold"
                            : "border-border bg-background text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {sub}
                      </button>
                    )
                  )}
                </div>

                <div className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
                  <span>SPAN: <strong>NOV 01 — NOV 30, 2026</strong></span>
                  <span>·</span>
                  <span>OCCURRENCES: <strong>{filteredMatrixOccurrences.length}</strong></span>
                </div>
              </div>

              {/* Fixed-Height Native Scroll Container with Sticky Columns */}
              <div className="relative max-h-[calc(100vh-310px)] min-h-[380px] w-full overflow-auto rounded-sm border border-border bg-card">
                <table className="w-max min-w-full border-separate border-spacing-0 text-left text-xs">
                  <thead className="sticky top-0 z-30 bg-muted/95 backdrop-blur-xs">
                    <tr className="h-9">
                      {/* Sticky Col 1 Header */}
                      <th className="sticky top-0 left-0 z-30 w-[230px] border-b border-r border-border bg-muted/95 px-3 py-2 font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur-xs">
                        STUDENT ({selectedCohort})
                      </th>
                      {/* Sticky Col 2 Header (Range Summary) */}
                      <th className="sticky top-0 left-[230px] z-30 w-[150px] border-b border-r border-border bg-muted/95 px-3 py-2 font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground shadow-[2px_0_4px_-1px_rgba(0,0,0,0.25)] backdrop-blur-xs">
                        RANGE SUMMARY
                      </th>
                      {/* Occurrence Date Headers */}
                      {filteredMatrixOccurrences.map((occ) => (
                        <th
                          key={occ.id}
                          className="sticky top-0 z-20 w-[110px] border-b border-r border-border bg-muted/95 px-2 py-1 text-center font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur-xs"
                        >
                          <div>{occ.date}</div>
                          <div className="text-[9px] font-normal text-muted-foreground/80">
                            {occ.time}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {DUMMY_STUDENTS.slice(0, 6).map((stu, sIdx) => {
                      // Calculate range rate breakdown
                      let pCount = 0
                      let lCount = 0
                      let aCount = 0
                      filteredMatrixOccurrences.forEach((occ) => {
                        const st = matrixStatuses[`${sIdx}-${occ.id}`] ?? "present"
                        if (st === "present") pCount++
                        else if (st === "late") lCount++
                        else if (st === "absent") aCount++
                      })
                      const totalOcc = filteredMatrixOccurrences.length || 1
                      const pct = Math.round(((pCount + lCount * 0.5) / totalOcc) * 100)

                      return (
                        <tr
                          key={stu.id}
                          className="group h-11 hover:bg-muted/40"
                        >
                          {/* Sticky Col 1 Td (Student) */}
                          <td className="sticky left-0 z-20 w-[230px] border-b border-r border-border bg-card px-3 py-2 transition-colors group-hover:bg-muted">
                            <div className="flex items-center gap-2">
                              <CodeChip accent>{stu.code}</CodeChip>
                              <span className="truncate font-medium text-foreground">
                                {stu.name}
                              </span>
                            </div>
                          </td>

                          {/* Sticky Col 2 Td (Range Summary) */}
                          <td className="sticky left-[230px] z-20 w-[150px] border-b border-r border-border bg-card px-3 py-2 font-mono text-xs tabular-nums text-foreground shadow-[2px_0_4px_-1px_rgba(0,0,0,0.25)] transition-colors group-hover:bg-muted">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={cn(
                                  "font-bold",
                                  pct >= 90
                                    ? "text-success"
                                    : pct >= 75
                                      ? "text-warning"
                                      : "text-destructive"
                                )}
                              >
                                {pct}%
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                ({pCount}P {lCount}L {aCount}A)
                              </span>
                            </div>
                          </td>

                          {/* Occurrence Cell Tds */}
                          {filteredMatrixOccurrences.map((occ) => {
                            const cellKey = `${sIdx}-${occ.id}`
                            const status = matrixStatuses[cellKey] ?? "present"
                            return (
                              <td
                                key={occ.id}
                                className="w-[110px] border-b border-r border-border px-2 py-1 text-center"
                              >
                                <RollStatusControl
                                  value={status}
                                  onChange={(val) =>
                                    setMatrixStatuses((prev) => ({
                                      ...prev,
                                      [cellKey]: val,
                                    }))
                                  }
                                />
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Slide-Over Slot & Substitute Inspector */}
      <InspectorSheet
        open={Boolean(inspectedSlot)}
        onOpenChange={(open) => {
          if (!open) setInspectedSlotId(null)
        }}
        code={
          inspectedSlot
            ? `${inspectedSlot.cohortCode} // ${inspectedSlot.day}`
            : "SLOT"
        }
        title={inspectedSlot?.subject ?? ""}
        subtitle={
          inspectedSlot
            ? `${inspectedSlot.timeRange} · Room ${inspectedSlot.room}`
            : ""
        }
        status={
          inspectedSlot
            ? {
                label: inspectedSlot.substituteTeacher
                  ? `SUB: ${inspectedSlot.substituteTeacher}`
                  : "REGULAR SCHEDULE",
                tone: inspectedSlot.substituteTeacher ? "late" : "present",
              }
            : undefined
        }
        fields={
          inspectedSlot
            ? [
                {
                  label: "COHORT",
                  value: inspectedSlot.cohortCode,
                  mono: true,
                },
                { label: "SUBJECT", value: inspectedSlot.subject },
                {
                  label: "ASSIGNED TEACHER",
                  value: inspectedSlot.assignedTeacher,
                },
                {
                  label: "SUBSTITUTE OVERRIDE",
                  value: inspectedSlot.substituteTeacher ?? "None assigned",
                },
              ]
            : []
        }
        footerActions={
          <div className="flex w-full items-center justify-between gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInspectedSlotId(null)}
            >
              Close
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setInspectedSlotId(null)
                setViewMode("roll-matrix")
              }}
            >
              Take Roll for Slot →
            </Button>
          </div>
        }
      >
        {inspectedSlot && (
          <div className="space-y-4">
            {/* 2-Tab Switcher inside the drawer */}
            <div className="flex border-b border-border">
              <button
                type="button"
                onClick={() => setDrawerTab("occurrences")}
                className={cn(
                  "border-b-2 px-3 py-2 font-mono text-[11px] font-semibold uppercase transition-colors",
                  drawerTab === "occurrences"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                Occurrences &amp; Substitute
              </button>
              <button
                type="button"
                onClick={() => setDrawerTab("template")}
                className={cn(
                  "border-b-2 px-3 py-2 font-mono text-[11px] font-semibold uppercase transition-colors",
                  drawerTab === "template"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                Slot Template
              </button>
            </div>

            {drawerTab === "occurrences" ? (
              <div className="space-y-4">
                <div className="space-y-2 rounded-sm border border-border bg-muted/30 p-3">
                  <label className="block font-mono text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                    ASSIGN SUBSTITUTE TEACHER (INLINE OVERRIDE)
                  </label>
                  <div className="flex gap-2">
                    <Input
                      value={subTeacherInput}
                      onChange={(e) => setSubTeacherInput(e.target.value)}
                      placeholder="e.g. Daw Su Su"
                      className="h-8 bg-background text-xs"
                    />
                    <Button
                      size="sm"
                      className="h-8"
                      onClick={() => handleAssignSubstitute(inspectedSlot.id)}
                    >
                      Assign Sub
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="font-mono text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                    UPCOMING &amp; RECENT DATED SESSIONS
                  </div>
                  {inspectedSlot.upcomingDates.map((occ) => (
                    <div
                      key={occ.date}
                      className="flex items-center justify-between rounded-sm border border-border px-3 py-2"
                    >
                      <div>
                        <span className="font-mono text-xs font-semibold text-foreground">
                          {occ.date}
                        </span>
                        <span className="ml-2 text-xs text-muted-foreground">
                          {occ.actualTeacher} ({occ.presentCount})
                        </span>
                      </div>
                      <TelemetryTag
                        status={
                          occ.status === "completed"
                            ? "present"
                            : occ.status === "substituted"
                              ? "late"
                              : "info"
                        }
                      >
                        {occ.status.toUpperCase()}
                      </TelemetryTag>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-2 rounded-sm border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
                <p>
                  <strong className="text-foreground">Recurring Rule:</strong>{" "}
                  Every {inspectedSlot.day} at {inspectedSlot.timeRange} in{" "}
                  {inspectedSlot.room}.
                </p>
                <p>
                  Editing the recurring template updates future generated
                  sessions while preserving historical attendance records.
                </p>
              </div>
            )}
          </div>
        )}
      </InspectorSheet>

      {/* Generate Sessions Date-Range Confirmation Drawer */}
      <InspectorSheet
        open={generateSessionsOpen}
        onOpenChange={setGenerateSessionsOpen}
        code={`GEN // ${selectedCohort}`}
        title={`Generate Sessions — ${selectedCohort}`}
        subtitle="Materialize timetable slots into dated calendar session occurrences"
        status={{ label: "SESSION MATERIALIZER", tone: "active" }}
        fields={[
          { label: "TARGET COHORT", value: selectedCohort, mono: true },
          { label: "WEEKLY SLOTS", value: `${cohortSlots.length} slots/week`, mono: true },
          { label: "TARGET SPAN", value: `${genStartDate} → ${genEndDate}`, mono: true },
          { label: "PROJECTED SESSIONS", value: `${cohortSlots.length * 4} sessions`, mono: true },
        ]}
        footerActions={
          <div className="flex w-full items-center justify-between gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setGenerateSessionsOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="gap-1.5"
              onClick={handleExecuteGenerateSessions}
            >
              <Sparkles className="size-3.5" />
              {generationExecuted ? "Regenerate Sessions" : "Generate Sessions Now"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="block font-mono text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
              QUICK DATE PRESETS
            </label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant={genPreset === "month" ? "default" : "outline"}
                size="xs"
                className="h-7 font-mono text-[11px]"
                onClick={() => {
                  setGenPreset("month")
                  setGenStartDate("2026-11-01")
                  setGenEndDate("2026-11-30")
                }}
              >
                This Month (Nov)
              </Button>
              <Button
                type="button"
                variant={genPreset === "30days" ? "default" : "outline"}
                size="xs"
                className="h-7 font-mono text-[11px]"
                onClick={() => {
                  setGenPreset("30days")
                  setGenStartDate("2026-11-04")
                  setGenEndDate("2026-12-04")
                }}
              >
                Next 30 Days
              </Button>
              <Button
                type="button"
                variant={genPreset === "term" ? "default" : "outline"}
                size="xs"
                className="h-7 font-mono text-[11px]"
                onClick={() => {
                  setGenPreset("term")
                  setGenStartDate("2026-11-01")
                  setGenEndDate("2027-01-31")
                }}
              >
                Full Term (90d)
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-mono text-[10px] font-semibold uppercase text-muted-foreground">
                START DATE
              </label>
              <Input
                type="date"
                value={genStartDate}
                onChange={(e) => setGenStartDate(e.target.value)}
                className="h-8 font-mono text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="font-mono text-[10px] font-semibold uppercase text-muted-foreground">
                END DATE
              </label>
              <Input
                type="date"
                value={genEndDate}
                onChange={(e) => setGenEndDate(e.target.value)}
                className="h-8 font-mono text-xs"
              />
            </div>
          </div>

          <div className="rounded-sm border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
            <div className="font-semibold text-foreground">Materialization Preview:</div>
            <p className="mt-1">
              Iterates through every active weekly slot for <strong>{selectedCohort}</strong> and generates dated attendance session rows between {genStartDate} and {genEndDate}. Existing completed roll records are safely preserved without data loss.
            </p>
          </div>
        </div>
      </InspectorSheet>

      {/* Slide-Over Add New Timetable Slot Drawer */}
      <InspectorSheet
        open={Boolean(newSlotDay)}
        onOpenChange={(open) => {
          if (!open) setNewSlotDay(null)
        }}
        code={`${selectedCohort} // ${newSlotDay?.toUpperCase() ?? "DAY"}`}
        title={`NEW SLOT // ${selectedCohort} · ${newSlotDay?.toUpperCase() ?? ""}`}
        subtitle="Schedule a flexible education-center class session on this day"
        status={{ label: "NEW RECURRING SLOT", tone: "active" }}
        fields={[
          { label: "COHORT", value: selectedCohort, mono: true },
          { label: "DAY OF WEEK", value: newSlotDay ?? "", mono: true },
        ]}
        footerActions={
          <div className="flex w-full items-center justify-between gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setNewSlotDay(null)}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={handleCreateSlot}>
              Create Slot
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="block font-mono text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
              FLEXIBLE TIME RANGE (START - END)
            </label>
            <Input
              value={newSlotTimeRange}
              onChange={(e) => setNewSlotTimeRange(e.target.value)}
              placeholder="e.g. 09:00 - 10:30 or 16:00 - 18:00"
              className="h-8 bg-background font-mono text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block font-mono text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
              SUBJECT (GLOBAL CATALOG)
            </label>
            <Select
              value={newSlotSubject}
              onValueChange={(val) => {
                if (val) setNewSlotSubject(val)
              }}
            >
              <SelectTrigger size="sm" className="w-full font-mono text-xs">
                <SelectValue placeholder="Select subject" />
              </SelectTrigger>
              <SelectContent>
                {DUMMY_SUBJECTS.map((sub) => (
                  <SelectItem
                    key={sub.id}
                    value={sub.name}
                    className="font-mono text-xs"
                  >
                    {sub.code} — {sub.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="block font-mono text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
              ASSIGNED TEACHER
            </label>
            <Select
              value={newSlotTeacher}
              onValueChange={(val) => {
                if (val) setNewSlotTeacher(val)
              }}
            >
              <SelectTrigger size="sm" className="w-full font-mono text-xs">
                <SelectValue placeholder="Select teacher" />
              </SelectTrigger>
              <SelectContent>
                {[
                  "Daw Su Su",
                  "U Kyaw Swar",
                  "Dr. Myo Min",
                  "Daw Hnin Wai",
                  "U Nay Lin",
                  "Daw May Thu",
                ].map((teacher) => (
                  <SelectItem
                    key={teacher}
                    value={teacher}
                    className="font-mono text-xs"
                  >
                    {teacher}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="block font-mono text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
              ROOM / LAB CODE
            </label>
            <Input
              value={newSlotRoom}
              onChange={(e) => setNewSlotRoom(e.target.value)}
              placeholder="e.g. RM-201, LAB-A2, HALL-01"
              className="h-8 bg-background font-mono text-xs uppercase"
            />
          </div>
        </div>
      </InspectorSheet>
    </div>
  )
}
