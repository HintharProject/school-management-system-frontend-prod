"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@clerk/nextjs"
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Loader2,
  LogIn,
  Monitor,
  QrCode,
  RotateCcw,
  Search,
  Trash2,
  Undo2,
  UserCheck,
  X,
} from "lucide-react"

import { createApi, ApiError } from "@/lib/api"
import type {
  CheckIn,
  CheckInStatus,
  OverviewClassResponse,
  OverviewClassSummary,
  OverviewSchoolResponse,
  OverviewSearchResponse,
} from "@/lib/types"
import {
  SystemHeader,
  DataModule,
  CodeChip,
  TelemetryTag,
} from "@/components/design-system/v2-primitives"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { ConfirmDialog } from "@/components/confirm-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableHeadSortable,
  TableBody,
  TableCell,
} from "@/components/ui/table"
import { toast } from "@/components/ui/toast"
import {
  cn,
  toLocalDateString,
  formatBackendDateTime,
  formatBackendTime,
} from "@/lib/utils"

interface RollRow {
  studentId: number
  studentCode: string | null
  studentName: string
  classLabel?: string | null
  checkIn: CheckInStatus | null
}

function checkInStudentId(row: CheckIn): number {
  if (typeof row.student === "object" && row.student !== null) return row.student.id
  if (row.student_id != null) return row.student_id
  return Number(row.student)
}

function checkInStudentCode(row: CheckIn): string | null {
  if (typeof row.student === "object" && row.student !== null) {
    return row.student.unique_code ?? null
  }
  return null
}

function checkInStudentName(row: CheckIn): string {
  if (typeof row.student === "object" && row.student !== null) {
    return row.student.name || `Student #${row.student.id}`
  }
  return row.student_name || `Student #${checkInStudentId(row)}`
}

export default function ConsolidatedCheckInPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { getToken, isLoaded, isSignedIn } = useAuth()

  const todayStr = React.useMemo(() => toLocalDateString(), [])

  // Tab state: "roll" | "logs"
  const paramTab = searchParams.get("tab")
  const [activeTab, setActiveTab] = React.useState<string>(
    paramTab === "logs" ? "logs" : "roll"
  )

  React.useEffect(() => {
    if (paramTab === "logs" && activeTab !== "logs") {
      setActiveTab("logs")
    } else if (paramTab !== "logs" && activeTab === "logs" && !paramTab) {
      // Keep in sync if param cleared
    }
  }, [paramTab, activeTab])

  const handleTabChange = (nextTab: string) => {
    setActiveTab(nextTab)
    const params = new URLSearchParams(searchParams.toString())
    if (nextTab === "logs") {
      params.set("tab", "logs")
    } else {
      params.delete("tab")
    }
    const qs = params.toString()
    router.replace(qs ? `/check-in?${qs}` : "/check-in", { scroll: false })
  }

  // Common date state (strictly clamped to today or past dates)
  const [selectedDate, setSelectedDate] = React.useState<string>(() => {
    const paramDate = searchParams.get("date")
    if (paramDate && paramDate > todayStr) return todayStr
    return paramDate || todayStr
  })

  // =========================================================================
  // TAB 1: DAILY ROLL STATE & EFFECTS
  // =========================================================================
  const [selectedClassId, setSelectedClassId] = React.useState<string>(
    () => searchParams.get("class_id") || "all"
  )
  const [rollFilter, setRollFilter] = React.useState<"ALL" | "MISSING" | "ARRIVED">("ALL")
  const [rollSearch, setRollSearch] = React.useState("")
  const [debouncedRollSearch, setDebouncedRollSearch] = React.useState("")

  const [classesSummary, setClassesSummary] = React.useState<OverviewClassSummary[] | null>(null)
  const [classData, setClassData] = React.useState<OverviewClassResponse | null>(null)
  const [missingSchool, setMissingSchool] = React.useState<OverviewSchoolResponse | null>(null)
  const [arrivedSchool, setArrivedSchool] = React.useState<OverviewSchoolResponse | null>(null)
  const [searchData, setSearchData] = React.useState<OverviewSearchResponse | null>(null)

  const [rollLoading, setRollLoading] = React.useState(false)
  const [rollPage, setRollPage] = React.useState(1)
  const [checkingInId, setCheckingInId] = React.useState<number | null>(null)
  const [undoTarget, setUndoTarget] = React.useState<RollRow | null>(null)
  const [undoing, setUndoing] = React.useState(false)

  // Debounce roll search
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedRollSearch(rollSearch.trim()), 300)
    return () => clearTimeout(timer)
  }, [rollSearch])

  // Load classes summary on date/auth change
  const loadClassesSummary = React.useCallback(async () => {
    if (!isSignedIn) return
    try {
      const token = await getToken()
      if (!token) return
      const api = createApi(token)
      const data = await api.overviewClasses(selectedDate)
      setClassesSummary(data.classes)
    } catch {
      // Non-fatal summary load error
    }
  }, [getToken, isSignedIn, selectedDate])

  React.useEffect(() => {
    if (isLoaded && isSignedIn && activeTab === "roll") {
      void loadClassesSummary()
    }
  }, [isLoaded, isSignedIn, activeTab, loadClassesSummary])

  // Load roll roster based on selectedClassId or search query
  const loadRollData = React.useCallback(async () => {
    if (!isSignedIn) return
    setRollLoading(true)
    try {
      const token = await getToken()
      if (!token) return
      const api = createApi(token)

      if (debouncedRollSearch) {
        const res = await api.overviewSearch(selectedDate, debouncedRollSearch, {
          page: rollPage,
          page_size: 50,
        })
        setSearchData(res)
        setClassData(null)
        setMissingSchool(null)
        setArrivedSchool(null)
      } else if (selectedClassId === "all") {
        setSearchData(null)
        setClassData(null)
        const [missingRes, arrivedRes] = await Promise.all([
          api.overviewClass(selectedDate, "all", {
            page: rollPage,
            page_size: 50,
            status: "missing",
          }) as Promise<OverviewSchoolResponse>,
          api.overviewClass(selectedDate, "all", {
            page: rollPage,
            page_size: 50,
            status: "arrived",
          }) as Promise<OverviewSchoolResponse>,
        ])
        setMissingSchool(missingRes)
        setArrivedSchool(arrivedRes)
      } else {
        setSearchData(null)
        setMissingSchool(null)
        setArrivedSchool(null)
        const res = (await api.overviewClass(
          selectedDate,
          Number(selectedClassId)
        )) as OverviewClassResponse
        setClassData(res)
      }
    } catch (err) {
      if (err instanceof ApiError) {
        toast.add({ title: err.userMessage, type: "error" })
      }
    } finally {
      setRollLoading(false)
    }
  }, [getToken, isSignedIn, selectedDate, selectedClassId, debouncedRollSearch, rollPage])

  React.useEffect(() => {
    if (isLoaded && isSignedIn && activeTab === "roll") {
      void loadRollData()
    }
  }, [isLoaded, isSignedIn, activeTab, loadRollData])

  // Compute roll rows
  const rollRows = React.useMemo<RollRow[]>(() => {
    if (debouncedRollSearch && searchData) {
      return searchData.results.map((r) => ({
        studentId: r.student_id,
        studentCode: r.unique_code,
        studentName: r.name,
        classLabel: r.class_label,
        checkIn: r.check_in,
      }))
    }

    if (selectedClassId === "all") {
      const missingList: RollRow[] = (missingSchool?.students ?? []).map((s) => ({
        studentId: s.id,
        studentCode: s.unique_code,
        studentName: s.name,
        classLabel: s.class_label ?? null,
        checkIn: s.check_in,
      }))
      const arrivedList: RollRow[] = (arrivedSchool?.students ?? []).map((s) => ({
        studentId: s.id,
        studentCode: s.unique_code,
        studentName: s.name,
        classLabel: s.class_label ?? null,
        checkIn: s.check_in,
      }))

      if (rollFilter === "MISSING") return missingList
      if (rollFilter === "ARRIVED") return arrivedList
      return [...missingList, ...arrivedList]
    }

    if (classData) {
      const all: RollRow[] = (classData.students ?? []).map((s) => ({
        studentId: s.id,
        studentCode: s.unique_code,
        studentName: s.name,
        classLabel: classData.class?.label ?? null,
        checkIn: s.check_in,
      }))

      if (rollFilter === "MISSING") return all.filter((r) => !r.checkIn)
      if (rollFilter === "ARRIVED") return all.filter((r) => Boolean(r.checkIn))
      return all
    }

    return []
  }, [debouncedRollSearch, searchData, selectedClassId, missingSchool, arrivedSchool, classData, rollFilter])

  // Roll metrics
  const schoolWideTotals = React.useMemo(() => {
    const list = classesSummary ?? []
    const arrived = list.reduce((sum, item) => sum + item.arrived, 0)
    const total = list.reduce((sum, item) => sum + item.total, 0)
    return {
      arrived,
      total,
      missing: Math.max(0, total - arrived),
      rate: total === 0 ? 0 : Math.round((arrived / total) * 100),
    }
  }, [classesSummary])

  // Manual roll check-in
  const handleRollManualCheckIn = async (row: RollRow) => {
    if (!isSignedIn) return
    setCheckingInId(row.studentId)
    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token")
      const api = createApi(token)
      await api.createCheckInManual(row.studentId)
      toast.add({
        title: `${row.studentName} marked arrived`,
        type: "success",
      })
      await Promise.all([loadClassesSummary(), loadRollData()])
    } catch (err) {
      if (err instanceof ApiError) {
        toast.add({ title: err.userMessage, type: "error" })
      } else {
        toast.add({ title: "Failed to mark arrival", type: "error" })
      }
    } finally {
      setCheckingInId(null)
    }
  }

  // Roll undo check-in
  const handleRollConfirmUndo = async () => {
    if (!undoTarget?.checkIn || !isSignedIn) return
    setUndoing(true)
    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token")
      const api = createApi(token)
      await api.deleteCheckIn(undoTarget.checkIn.id)
      toast.add({
        title: `Reverted arrival for ${undoTarget.studentName}`,
        type: "success",
      })
      setUndoTarget(null)
      await Promise.all([loadClassesSummary(), loadRollData()])
    } catch (err) {
      if (err instanceof ApiError) {
        toast.add({ title: err.userMessage, type: "error" })
      } else {
        toast.add({ title: "Failed to revert arrival", type: "error" })
      }
    } finally {
      setUndoing(false)
    }
  }

  // =========================================================================
  // TAB 2: SCAN LOG & BULK UNDO STATE & EFFECTS
  // =========================================================================
  const [logRows, setLogRows] = React.useState<CheckIn[]>([])
  const [logTotalCount, setLogTotalCount] = React.useState(0)
  const [logPage, setLogPage] = React.useState(1)
  const [logLoading, setLogLoading] = React.useState(false)
  const [logSearch, setLogSearch] = React.useState("")
  const [debouncedLogSearch, setDebouncedLogSearch] = React.useState("")
  const [logTypeFilter, setLogTypeFilter] = React.useState<"all" | "qr" | "manual">("all")

  const [selectedLogIds, setSelectedLogIds] = React.useState<number[]>([])
  const [bulkUndoOpen, setBulkUndoOpen] = React.useState(false)
  const [bulkUndoing, setBulkUndoing] = React.useState(false)
  const [singleUndoId, setSingleUndoId] = React.useState<number | null>(null)
  const [singleUndoing, setSingleUndoing] = React.useState(false)

  // Debounce log search
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedLogSearch(logSearch.trim()), 300)
    return () => clearTimeout(timer)
  }, [logSearch])

  const fetchLogPage = React.useCallback(async () => {
    if (!isSignedIn) return
    setLogLoading(true)
    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token")
      const api = createApi(token)
      const data = await api.listCheckInsPage({
        page: logPage,
        page_size: 50,
        date: selectedDate || undefined,
        q: debouncedLogSearch || undefined,
        check_in_type: logTypeFilter === "all" ? undefined : logTypeFilter,
      })
      setLogRows(data.results)
      setLogTotalCount(data.count)
      setSelectedLogIds([])
    } catch (err) {
      if (err instanceof ApiError) {
        toast.add({ title: err.userMessage, type: "error" })
      }
    } finally {
      setLogLoading(false)
    }
  }, [getToken, isSignedIn, logPage, selectedDate, debouncedLogSearch, logTypeFilter])

  React.useEffect(() => {
    if (isLoaded && isSignedIn && activeTab === "logs") {
      void fetchLogPage()
    }
  }, [isLoaded, isSignedIn, activeTab, fetchLogPage])

  const allLogPageSelected =
    logRows.length > 0 && logRows.every((r) => selectedLogIds.includes(r.id))

  const toggleSelectAllLogs = () => {
    if (allLogPageSelected) {
      setSelectedLogIds((prev) => prev.filter((id) => !logRows.some((r) => r.id === id)))
    } else {
      setSelectedLogIds((prev) => {
        const next = new Set(prev)
        for (const r of logRows) next.add(r.id)
        return Array.from(next)
      })
    }
  }

  const toggleSelectLogRow = (id: number) => {
    setSelectedLogIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const handleBulkUndo = async () => {
    if (selectedLogIds.length === 0 || !isSignedIn) return
    setBulkUndoing(true)
    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token")
      const api = createApi(token)
      const res = await api.bulkDeleteCheckIns(selectedLogIds)
      const reverted =
        (res.reverted_session_attendances ?? 0) + (res.reverted_adhoc_attendances ?? 0)
      toast.add({
        title:
          `Reverted ${res.deleted_count} check-in(s)` +
          (reverted ? ` and ${reverted} lesson attendance record(s)` : "") +
          ".",
        type: "success",
      })
      setBulkUndoOpen(false)
      setSelectedLogIds([])
      await Promise.all([fetchLogPage(), loadClassesSummary()])
    } catch (err) {
      if (err instanceof ApiError) {
        toast.add({ title: err.userMessage, type: "error" })
      } else {
        toast.add({ title: "Failed to bulk undo check-ins", type: "error" })
      }
    } finally {
      setBulkUndoing(false)
    }
  }

  const handleSingleUndo = async () => {
    if (singleUndoId === null || !isSignedIn) return
    setSingleUndoing(true)
    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token")
      const api = createApi(token)
      await api.deleteCheckIn(singleUndoId)
      toast.add({
        title: "Check-in removed. Lesson attendance reverted to Absent.",
        type: "success",
      })
      setSingleUndoId(null)
      await Promise.all([fetchLogPage(), loadClassesSummary()])
    } catch (err) {
      if (err instanceof ApiError) {
        toast.add({ title: err.userMessage, type: "error" })
      } else {
        toast.add({ title: "Failed to undo check-in", type: "error" })
      }
    } finally {
      setSingleUndoing(false)
    }
  }

  // Fallback loading & unauthenticated screens
  if (!isLoaded) {
    return (
      <div className="space-y-4 p-4 sm:p-6">
        <div className="h-28 w-full animate-pulse rounded-sm border bg-card" />
        <div className="h-96 w-full animate-pulse rounded-sm border bg-card" />
      </div>
    )
  }

  if (!isSignedIn) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center p-6 text-center">
        <p className="font-mono text-sm text-muted-foreground">
          Authentication required. Please sign in to access Campus Check-In.
        </p>
      </div>
    )
  }

  const singlePendingCheckIn =
    singleUndoId !== null ? logRows.find((r) => r.id === singleUndoId) : null

  return (
    <div className="space-y-4 p-4 sm:p-6">
      {/* 1. Tactical System Header with Navigation & Live Kiosk CTA */}
      <SystemHeader
        domain="OPERATIONS"
        breadcrumb="GATE CHECK-IN"
        title="Campus Check-In & Scan Ledger"
        description="Unified gate operations for daily cohort roll, scan inspection, and single/bulk check-in reversals."
        metrics={[
          {
            label: "ARRIVED TODAY",
            value: schoolWideTotals.arrived,
            tone: "success",
          },
          {
            label: "MISSING",
            value: schoolWideTotals.missing,
            tone: schoolWideTotals.missing > 0 ? "destructive" : "default",
          },
          {
            label: "GATE RATE",
            value: `${schoolWideTotals.rate}%`,
          },
        ]}
        tabs={[
          {
            id: "roll",
            label: "Daily Roll",
            count: schoolWideTotals.total,
          },
          {
            id: "logs",
            label: "Scan Log & Bulk Undo",
            count: schoolWideTotals.arrived,
          },
        ]}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        actions={
          <Link
            href="/check-in/terminal"
            className={cn(
              buttonVariants({ size: "sm" }),
              "rounded-sm font-mono text-xs uppercase shadow-none"
            )}
          >
            <Monitor className="mr-1.5 size-3.5" />
            Launch Kiosk Terminal
          </Link>
        }
      />

      {/* Operational Information Alert */}
      <div className="flex items-start gap-2.5 rounded-sm border border-border bg-muted/25 px-3.5 py-2.5 font-mono text-xs text-muted-foreground">
        <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-foreground" />
        <div className="leading-relaxed">
          <span className="font-semibold text-foreground uppercase tracking-wider">
            Gate Sync Policy:
          </span>{" "}
          Campus scans automatically record presence and sync corresponding scheduled lesson
          attendance to <span className="font-bold text-foreground">Present</span>. Undoing a check-in
          clears the gate record and reverts auto-marked lesson attendance back to{" "}
          <span className="font-bold text-destructive">Absent</span>.
        </div>
      </div>

      {/* 2. TAB 1: DAILY ROLL WORKSPACE */}
      {activeTab === "roll" && (
        <DataModule
          searchPlaceholder="Filter roll by student name or unique ID..."
          searchValue={rollSearch}
          onSearchChange={setRollSearch}
          filters={
            <>
              {/* Date Input */}
              <Input
                type="date"
                max={todayStr}
                value={selectedDate}
                onChange={(e) => {
                  const raw = e.target.value || todayStr
                  const next = raw > todayStr ? todayStr : raw
                  setSelectedDate(next)
                }}
                className="h-8 w-36 rounded-sm border-border bg-background font-mono text-xs"
              />

              {/* Cohort / Class Selector */}
              <Select
                value={selectedClassId}
                onValueChange={(val) => {
                  setSelectedClassId(val ?? "all")
                  setRollPage(1)
                }}
              >
                <SelectTrigger className="h-8 min-w-[200px] max-w-[280px] rounded-sm border-border bg-background font-mono text-xs">
                  <span className="truncate">
                    {selectedClassId === "all"
                      ? "All Cohorts & Streams"
                      : (classesSummary?.find((c) => String(c.id) === selectedClassId)?.label ??
                         `Cohort #${selectedClassId}`)}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    All Cohorts & Streams ({schoolWideTotals.arrived}/{schoolWideTotals.total})
                  </SelectItem>
                  {(classesSummary ?? []).map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.label} ({c.arrived}/{c.total})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Roll Segment Filter */}
              <div className="inline-flex items-center gap-0.5 rounded-[2px] border border-border bg-muted/40 p-0.5">
                {(["ALL", "MISSING", "ARRIVED"] as const).map((filter) => {
                  const active = rollFilter === filter
                  return (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => setRollFilter(filter)}
                      className={cn(
                        "rounded-[2px] px-2 py-0.5 font-mono text-[11px] font-semibold uppercase transition-colors",
                        active
                          ? "bg-foreground text-background"
                          : "text-muted-foreground hover:bg-background/80 hover:text-foreground"
                      )}
                    >
                      {filter}
                    </button>
                  )
                })}
              </div>
            </>
          }
          toolbarRight={
            <Button
              variant="outline"
              size="xs"
              onClick={() => {
                void loadClassesSummary()
                void loadRollData()
              }}
              disabled={rollLoading}
              className="h-7 rounded-sm font-mono text-[11px] uppercase"
            >
              <RotateCcw className={cn("mr-1 size-3", rollLoading && "animate-spin")} />
              Refresh
            </Button>
          }
          totalCount={rollRows.length}
          countLabel="STUDENTS IN ROLL"
          page={rollPage}
          totalPages={1}
        >
          <Table>
            <TableHeader>
              <TableRow className="h-9 bg-muted/20 hover:bg-muted/20">
                <TableHead className="px-3.5 font-mono text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                  Identifier
                </TableHead>
                <TableHead className="font-mono text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                  Student Name
                </TableHead>
                <TableHead className="font-mono text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                  Cohort / Class
                </TableHead>
                <TableHead className="font-mono text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                  Campus Presence
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
              {rollLoading ? (
                Array.from({ length: 6 }).map((_, idx) => (
                  <TableRow key={idx} className="h-10">
                    <TableCell colSpan={6} className="px-3.5">
                      <div className="h-4 w-full animate-pulse rounded bg-muted/40" />
                    </TableCell>
                  </TableRow>
                ))
              ) : rollRows.length === 0 ? (
                <TableRow className="h-24">
                  <TableCell
                    colSpan={6}
                    className="text-center font-mono text-xs text-muted-foreground"
                  >
                    No students match the current campus filter.
                  </TableCell>
                </TableRow>
              ) : (
                rollRows.map((row) => {
                  const isArrived = Boolean(row.checkIn)
                  return (
                    <TableRow key={row.studentId} className="h-10 hover:bg-muted/30">
                      <TableCell className="px-3.5 font-mono">
                        <CodeChip accent>{row.studentCode || `#${row.studentId}`}</CodeChip>
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-foreground">
                        {row.studentName}
                      </TableCell>
                      <TableCell>
                        <CodeChip>{row.classLabel || "Unassigned"}</CodeChip>
                      </TableCell>
                      <TableCell>
                        <TelemetryTag status={isArrived ? "present" : "absent"}>
                          {isArrived ? "ARRIVED" : "MISSING"}
                        </TelemetryTag>
                      </TableCell>
                      <TableCell className="font-mono text-xs tabular-nums text-muted-foreground uppercase">
                        {isArrived && row.checkIn ? (
                          <>
                            {formatBackendTime(row.checkIn.timestamp)} ·{" "}
                            {row.checkIn.check_in_type.toUpperCase()}
                          </>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {isArrived ? (
                          <Button
                            variant="outline"
                            size="xs"
                            onClick={() => setUndoTarget(row)}
                            className="h-7 rounded-sm border-border px-2 font-mono text-[11px] text-destructive hover:bg-destructive/10 uppercase"
                          >
                            <Undo2 className="mr-1 size-3" />
                            Undo Check-In
                          </Button>
                        ) : (
                          <Button
                            variant="default"
                            size="xs"
                            disabled={checkingInId === row.studentId}
                            onClick={() => handleRollManualCheckIn(row)}
                            className="h-7 rounded-sm px-2 font-mono text-[11px] uppercase"
                          >
                            {checkingInId === row.studentId ? (
                              <Loader2 className="mr-1 size-3 animate-spin" />
                            ) : (
                              <LogIn className="mr-1 size-3" />
                            )}
                            Manual Check-In
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </DataModule>
      )}

      {/* 3. TAB 2: SCAN LOG & BULK UNDO WORKSPACE */}
      {activeTab === "logs" && (
        <DataModule
          searchPlaceholder="Filter scan log by student name or identifier..."
          searchValue={logSearch}
          onSearchChange={setLogSearch}
          filters={
            <>
              {/* Date Filter */}
              <Input
                type="date"
                max={todayStr}
                value={selectedDate}
                onChange={(e) => {
                  const raw = e.target.value || todayStr
                  const next = raw > todayStr ? todayStr : raw
                  setSelectedDate(next)
                  setLogPage(1)
                }}
                className="h-8 w-36 rounded-sm border-border bg-background font-mono text-xs"
              />

              {/* Scan Type Filter */}
              <Select
                value={logTypeFilter}
                onValueChange={(val) => {
                  setLogTypeFilter(val as "all" | "qr" | "manual")
                  setLogPage(1)
                }}
              >
                <SelectTrigger className="h-8 w-40 rounded-sm border-border bg-background font-mono text-xs">
                  <span className="truncate">
                    {logTypeFilter === "all"
                      ? "All Scan Methods"
                      : logTypeFilter === "qr"
                        ? "QR Terminal"
                        : "Manual Gate"}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Scan Methods</SelectItem>
                  <SelectItem value="qr">QR Terminal</SelectItem>
                  <SelectItem value="manual">Manual Gate</SelectItem>
                </SelectContent>
              </Select>
            </>
          }
          selectedCount={selectedLogIds.length}
          onClearSelection={() => setSelectedLogIds([])}
          bulkActions={
            <Button
              variant="destructive"
              size="xs"
              onClick={() => setBulkUndoOpen(true)}
              className="h-6 rounded-sm px-2 font-mono text-[11px] uppercase"
            >
              <Trash2 className="mr-1 size-3" />
              Undo Selected ({selectedLogIds.length})
            </Button>
          }
          toolbarRight={
            <Button
              variant="outline"
              size="xs"
              onClick={() => void fetchLogPage()}
              disabled={logLoading}
              className="h-7 rounded-sm font-mono text-[11px] uppercase"
            >
              <RotateCcw className={cn("mr-1 size-3", logLoading && "animate-spin")} />
              Refresh
            </Button>
          }
          totalCount={logTotalCount}
          countLabel="SCAN ENTRIES"
          page={logPage}
          totalPages={Math.max(1, Math.ceil(logTotalCount / 50))}
          onPageChange={setLogPage}
        >
          <Table>
            <TableHeader>
              <TableRow className="h-9 bg-muted/20 hover:bg-muted/20">
                <TableHead className="w-10 px-3 text-center">
                  <Checkbox
                    checked={allLogPageSelected}
                    onCheckedChange={toggleSelectAllLogs}
                    aria-label="Select all current scans"
                  />
                </TableHead>
                <TableHead className="font-mono text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                  Timestamp
                </TableHead>
                <TableHead className="font-mono text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                  Student ID
                </TableHead>
                <TableHead className="font-mono text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                  Student Name
                </TableHead>
                <TableHead className="font-mono text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                  Verification Method
                </TableHead>
                <TableHead className="text-right font-mono text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                  Action
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logLoading ? (
                Array.from({ length: 6 }).map((_, idx) => (
                  <TableRow key={idx} className="h-10">
                    <TableCell colSpan={6} className="px-3.5">
                      <div className="h-4 w-full animate-pulse rounded bg-muted/40" />
                    </TableCell>
                  </TableRow>
                ))
              ) : logRows.length === 0 ? (
                <TableRow className="h-24">
                  <TableCell
                    colSpan={6}
                    className="text-center font-mono text-xs text-muted-foreground"
                  >
                    No check-in scans recorded for this selection.
                  </TableCell>
                </TableRow>
              ) : (
                logRows.map((r) => {
                  const isSelected = selectedLogIds.includes(r.id)
                  const studentId = checkInStudentId(r)
                  const studentCode = checkInStudentCode(r)
                  const studentName = checkInStudentName(r)

                  return (
                    <TableRow
                      key={r.id}
                      data-state={isSelected ? "selected" : undefined}
                      className="h-10 hover:bg-muted/30"
                    >
                      <TableCell className="w-10 px-3 text-center">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelectLogRow(r.id)}
                          aria-label={`Select check-in ${r.id}`}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-xs tabular-nums text-foreground">
                        {formatBackendDateTime(r.timestamp)}
                      </TableCell>
                      <TableCell className="font-mono">
                        <CodeChip accent>{studentCode || `#${studentId}`}</CodeChip>
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-foreground">
                        {studentName}
                      </TableCell>
                      <TableCell>
                        <TelemetryTag
                          status={r.check_in_type === "qr" ? "info" : "neutral"}
                        >
                          {r.check_in_type === "qr" ? "QR SCAN" : "MANUAL ROLL"}
                        </TelemetryTag>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => setSingleUndoId(r.id)}
                          className="h-7 font-mono text-[11px] text-destructive hover:bg-destructive/10 uppercase"
                        >
                          <Undo2 className="mr-1 size-3" />
                          Undo
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </DataModule>
      )}

      {/* Confirmation Dialog: Daily Roll Undo */}
      <ConfirmDialog
        open={undoTarget !== null}
        title="Undo Campus Check-In"
        description={
          undoTarget
            ? `Undo check-in for ${undoTarget.studentName}? This clears campus arrival for today and reverts auto-marked lesson attendance back to Absent.`
            : ""
        }
        onConfirm={handleRollConfirmUndo}
        onCancel={() => setUndoTarget(null)}
        loading={undoing}
      />

      {/* Confirmation Dialog: Single Scan Log Undo */}
      <ConfirmDialog
        open={singleUndoId !== null}
        title="Undo Scan Entry"
        description={
          singlePendingCheckIn
            ? `Revert check-in for ${checkInStudentName(singlePendingCheckIn)}? Any auto-marked lesson attendance will be set back to Absent.`
            : "Revert this scan entry?"
        }
        onConfirm={handleSingleUndo}
        onCancel={() => setSingleUndoId(null)}
        loading={singleUndoing}
      />

      {/* Confirmation Dialog: Bulk Scan Log Undo */}
      <ConfirmDialog
        open={bulkUndoOpen}
        title="Bulk Undo Selected Check-Ins"
        description={`Are you sure you want to revert ${selectedLogIds.length} selected check-in(s)? Campus arrival will be cleared and lesson attendances auto-marked by these scans will be reset to Absent.`}
        onConfirm={handleBulkUndo}
        onCancel={() => setBulkUndoOpen(false)}
        loading={bulkUndoing}
      />
    </div>
  )
}
