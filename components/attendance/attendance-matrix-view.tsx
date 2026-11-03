"use client"

import * as React from "react"
import { useAuth } from "@clerk/nextjs"
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Filter,
  Download,
  RotateCcw,
  Save,
  ArrowUpRight,
  Sparkles,
  BookOpen,
  UserCheck,
  Check,
  AlertCircle,
} from "lucide-react"
import { createApi, ApiError } from "@/lib/api"
import type {
  Class,
  Subject,
  Teacher,
  AttendanceMatrixSession,
  AttendanceMatrixStudent,
  SessionAttendance,
  AdHocSessionAttendance,
} from "@/lib/types"
import { formatCohortIdentifier } from "@/lib/format-class"
import {
  DataModule,
  CodeChip,
  TelemetryTag,
  type RollAttendanceStatus,
} from "@/components/design-system/v2-primitives"
import { toast } from "@/components/ui/toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table"
import {
  cn,
  toLocalDateString,
  toSessionDateString,
  formatBackendTime,
  formatBackendDate,
} from "@/lib/utils"

export interface MatrixSummaryStats {
  totalSessions: number
  filteredSessionsCount: number
  subjectsCount: number
  overallRate: number
  presentCount: number
  lateCount: number
  absentCount: number
  excusedCount: number
  dirtyCount: number
  saving: boolean
}

export interface AttendanceMatrixViewProps {
  activeClass: Class | null
  isAdhoc: boolean
  subjects: Subject[]
  teachers: Teacher[]
  refreshTrigger?: number
  saveTrigger?: number
  onStatsChange?: (stats: MatrixSummaryStats) => void
  onJumpToSession?: (dateStr: string, sessionId: number) => void
}

const MONTHS = [
  { index: 0, label: "January", short: "JAN" },
  { index: 1, label: "February", short: "FEB" },
  { index: 2, label: "March", short: "MAR" },
  { index: 3, label: "April", short: "APR" },
  { index: 4, label: "May", short: "MAY" },
  { index: 5, label: "June", short: "JUN" },
  { index: 6, label: "July", short: "JUL" },
  { index: 7, label: "August", short: "AUG" },
  { index: 8, label: "September", short: "SEP" },
  { index: 9, label: "October", short: "OCT" },
  { index: 10, label: "November", short: "NOV" },
  { index: 11, label: "December", short: "DEC" },
] as const

const YEARS = [2024, 2025, 2026, 2027]

const MATRIX_CELL_META: Record<
  string,
  { label: string; short: string; dotClass: string; triggerClass: string }
> = {
  present: {
    label: "PRESENT",
    short: "P",
    dotClass: "bg-emerald-500",
    triggerClass: "border-success/40 bg-success/15 text-success hover:bg-success/25",
  },
  late: {
    label: "LATE",
    short: "L",
    dotClass: "bg-amber-500",
    triggerClass: "border-warning/40 bg-warning/15 text-warning hover:bg-warning/25",
  },
  absent: {
    label: "ABSENT",
    short: "A",
    dotClass: "bg-rose-500",
    triggerClass: "border-destructive/40 bg-destructive/15 text-destructive hover:bg-destructive/25",
  },
  excused: {
    label: "EXCUSED",
    short: "E",
    dotClass: "bg-zinc-400",
    triggerClass: "border-border bg-muted/60 text-foreground hover:bg-muted",
  },
  unrecorded: {
    label: "UNRECORDED",
    short: "—",
    dotClass: "bg-muted-foreground/30",
    triggerClass: "border-dashed border-border/70 bg-background text-muted-foreground hover:border-foreground/50",
  },
}

function MatrixCellControl({
  value,
  isDirty,
  onChange,
}: {
  value: RollAttendanceStatus | ""
  isDirty?: boolean
  onChange: (val: RollAttendanceStatus | "") => void
}) {
  const meta = MATRIX_CELL_META[value || "unrecorded"] ?? MATRIX_CELL_META.unrecorded

  return (
    <Select
      value={value || "unrecorded"}
      onValueChange={(val) => {
        if (val === "unrecorded") onChange("")
        else if (val) onChange(val as RollAttendanceStatus)
      }}
    >
      <SelectTrigger
        size="sm"
        className={cn(
          "h-6 w-full min-w-[68px] justify-between rounded-sm border px-1.5 py-0 font-mono text-[10px] font-bold tracking-wider uppercase transition-colors data-[size=sm]:h-6 [&_svg]:size-2.5 [&_svg]:opacity-60",
          meta.triggerClass,
          isDirty && "ring-1 ring-amber-500 border-amber-500"
        )}
      >
        <span className="inline-flex items-center gap-1 truncate">
          <span
            aria-hidden="true"
            className={cn(
              "size-1.5 shrink-0 rounded-[1px]",
              isDirty ? "bg-amber-500 animate-pulse" : meta.dotClass
            )}
          />
          <span>{meta.short}</span>
        </span>
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false} className="min-w-[140px]">
        <SelectItem value="present" className="font-mono text-[11px] font-semibold uppercase">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-1.5 rounded-[1px] bg-emerald-500" />
            PRESENT [P]
          </span>
        </SelectItem>
        <SelectItem value="late" className="font-mono text-[11px] font-semibold uppercase">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-1.5 rounded-[1px] bg-amber-500" />
            LATE [L]
          </span>
        </SelectItem>
        <SelectItem value="absent" className="font-mono text-[11px] font-semibold uppercase">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-1.5 rounded-[1px] bg-rose-500" />
            ABSENT [A]
          </span>
        </SelectItem>
        <SelectItem value="excused" className="font-mono text-[11px] font-semibold uppercase">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-1.5 rounded-[1px] bg-zinc-400" />
            EXCUSED [E]
          </span>
        </SelectItem>
        <SelectItem value="unrecorded" className="font-mono text-[11px] font-normal uppercase text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-1.5 rounded-[1px] bg-muted-foreground/30" />
            UNRECORDED [—]
          </span>
        </SelectItem>
      </SelectContent>
    </Select>
  )
}

export function AttendanceMatrixView({
  activeClass,
  isAdhoc,
  subjects,
  teachers,
  refreshTrigger = 0,
  saveTrigger = 0,
  onStatsChange,
  onJumpToSession,
}: AttendanceMatrixViewProps) {
  const { getToken, isSignedIn } = useAuth()

  // ---------------------------------------------------------------------------
  // Date & Range State
  // ---------------------------------------------------------------------------
  const now = React.useMemo(() => new Date(), [])
  const [rangeMode, setRangeMode] = React.useState<"monthly" | "custom">("monthly")
  const [selectedMonth, setSelectedMonth] = React.useState<number>(now.getMonth())
  const [selectedYear, setSelectedYear] = React.useState<number>(now.getFullYear())

  // Custom date picker range (default current month)
  const defaultFrom = React.useMemo(
    () => `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`,
    [now]
  )
  const defaultTo = React.useMemo(() => {
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`
  }, [now])

  const [customDateFrom, setCustomDateFrom] = React.useState<string>(defaultFrom)
  const [customDateTo, setCustomDateTo] = React.useState<string>(defaultTo)

  // Compute effective date range
  const { dateFrom, dateTo } = React.useMemo(() => {
    if (rangeMode === "custom") {
      return { dateFrom: customDateFrom, dateTo: customDateTo }
    }
    const fromStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-01`
    const lastDay = new Date(selectedYear, selectedMonth + 1, 0).getDate()
    const toStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`
    return { dateFrom: fromStr, dateTo: toStr }
  }, [rangeMode, selectedYear, selectedMonth, customDateFrom, customDateTo])

  // Stepper handlers
  const handleStepMonth = (direction: -1 | 1) => {
    let nextMonth = selectedMonth + direction
    let nextYear = selectedYear
    if (nextMonth < 0) {
      nextMonth = 11
      nextYear -= 1
    } else if (nextMonth > 11) {
      nextMonth = 0
      nextYear += 1
    }
    setSelectedMonth(nextMonth)
    setSelectedYear(nextYear)
  }

  // ---------------------------------------------------------------------------
  // Backend Matrix State
  // ---------------------------------------------------------------------------
  const [loading, setLoading] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [sessions, setSessions] = React.useState<AttendanceMatrixSession[]>([])
  const [students, setStudents] = React.useState<AttendanceMatrixStudent[]>([])
  const [originalStatusMap, setOriginalStatusMap] = React.useState<Record<string, RollAttendanceStatus>>({})
  const [dirtyCells, setDirtyCells] = React.useState<
    Record<string, { sessionId: number; studentId: number; status: RollAttendanceStatus | "" }>
  >({})

  // Student filter search
  const [studentSearch, setStudentSearch] = React.useState("")

  // Fetch Matrix Data
  const fetchMatrix = React.useCallback(async () => {
    if ((!activeClass && !isAdhoc) || !isSignedIn) return
    setLoading(true)
    try {
      const token = await getToken()
      if (!token) throw new Error("No authentication token")
      const api = createApi(token)

      let res: {
        sessions: AttendanceMatrixSession[]
        students: AttendanceMatrixStudent[]
        attendances: (SessionAttendance | AdHocSessionAttendance)[]
      }

      if (isAdhoc) {
        res = await api.getAdHocAttendanceMatrix({
          date_from: dateFrom,
          date_to: dateTo,
        })
      } else {
        res = await api.getAttendanceMatrix({
          class_id: activeClass!.id,
          date_from: dateFrom,
          date_to: dateTo,
        })
      }

      // Chronological session ordering
      const sortedSessions = [...(res.sessions || [])].sort((a, b) => {
        return a.start_time.localeCompare(b.start_time)
      })

      const studentList = res.students || []
      const attendances = res.attendances || []

      // Build initial status map key: `${sessionId}:${studentId}`
      const statusMap: Record<string, RollAttendanceStatus> = {}

      // 1. From student.records (if present)
      studentList.forEach((stu) => {
        if (stu.records) {
          Object.entries(stu.records).forEach(([sessIdStr, raw]) => {
            if (raw) {
              const lower = raw.toLowerCase()
              if (lower === "present" || lower === "late" || lower === "absent" || lower === "excused") {
                statusMap[`${sessIdStr}:${stu.id}`] = lower as RollAttendanceStatus
              }
            }
          })
        }
      })

      // 2. From attendances array (authoritative)
      attendances.forEach((att: any) => {
        const sessId =
          att.session_id ||
          att.adhoc_session_id ||
          att.ad_hoc_session_id ||
          (typeof att.session === "object" ? att.session?.id : att.session) ||
          (typeof att.adhoc_session === "object" ? att.adhoc_session?.id : att.adhoc_session)

        const stuId =
          att.student_id ||
          (typeof att.student === "object" ? att.student?.id : att.student)

        if (sessId && stuId) {
          const raw = (att.status || (att.attended ? "present" : "absent")).toLowerCase()
          if (raw === "present" || raw === "late" || raw === "absent" || raw === "excused") {
            statusMap[`${sessId}:${stuId}`] = raw as RollAttendanceStatus
          }
        }
      })

      setSessions(sortedSessions)
      setStudents(studentList)
      setOriginalStatusMap(statusMap)
      setDirtyCells({})
    } catch (err) {
      toast.add({
        title: "Matrix Load Failed",
        description: err instanceof ApiError ? err.userMessage : "Failed to load attendance matrix",
        type: "error",
      })
    } finally {
      setLoading(false)
    }
  }, [activeClass, isAdhoc, dateFrom, dateTo, isSignedIn, getToken])

  React.useEffect(() => {
    fetchMatrix()
  }, [fetchMatrix])

  // External refresh trigger
  const prevRefreshTriggerRef = React.useRef(refreshTrigger)
  React.useEffect(() => {
    if (refreshTrigger !== undefined && refreshTrigger !== prevRefreshTriggerRef.current) {
      prevRefreshTriggerRef.current = refreshTrigger
      fetchMatrix()
    }
  }, [refreshTrigger, fetchMatrix])

  // ---------------------------------------------------------------------------
  // Subject & Teacher Filters
  // ---------------------------------------------------------------------------
  const [selectedSubjectId, setSelectedSubjectId] = React.useState<string>("ALL")
  const [selectedTeacherName, setSelectedTeacherName] = React.useState<string>("ALL")

  // Extract unique subjects
  const availableSubjects = React.useMemo(() => {
    const map = new Map<string, string>() // id/key -> display name
    sessions.forEach((s) => {
      if (s.subject_id && s.subject) {
        map.set(String(s.subject_id), s.subject)
      } else if (s.subject) {
        map.set(s.subject, s.subject)
      }
    })
    subjects.forEach((sub) => {
      map.set(String(sub.id), sub.name)
    })
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [sessions, subjects])

  // Extract unique teachers
  const availableTeachers = React.useMemo(() => {
    const names = new Set<string>()
    sessions.forEach((s) => {
      if (s.teacher_name) names.add(s.teacher_name)
    })
    teachers.forEach((t) => {
      if (t.name) names.add(t.name)
    })
    return Array.from(names).sort()
  }, [sessions, teachers])

  // Label resolvers for Base UI Trigger content
  const selectedSubjectLabel = React.useMemo(() => {
    if (selectedSubjectId === "ALL") return `All Subjects (${availableSubjects.length})`
    const found = availableSubjects.find((s) => s.id === selectedSubjectId)
    return found ? found.name : selectedSubjectId
  }, [selectedSubjectId, availableSubjects])

  const selectedTeacherLabel = React.useMemo(() => {
    if (selectedTeacherName === "ALL") return "All Teachers"
    return selectedTeacherName
  }, [selectedTeacherName])

  // Filter sessions by subject and teacher
  const filteredSessions = React.useMemo(() => {
    return sessions.filter((s) => {
      if (selectedSubjectId !== "ALL") {
        const matchId = String(s.subject_id) === selectedSubjectId
        const matchName = s.subject?.toLowerCase() === selectedSubjectLabel.toLowerCase()
        if (!matchId && !matchName) return false
      }
      if (selectedTeacherName !== "ALL") {
        if (s.teacher_name !== selectedTeacherName) return false
      }
      return true
    })
  }, [sessions, selectedSubjectId, selectedSubjectLabel, selectedTeacherName])

  // ---------------------------------------------------------------------------
  // Per-Student Monthly Breakdown & Telemetry
  // ---------------------------------------------------------------------------
  const studentRows = React.useMemo(() => {
    return students.map((stu) => {
      let p = 0
      let l = 0
      let a = 0
      let e = 0

      filteredSessions.forEach((sess) => {
        const key = `${sess.id}:${stu.id}`
        const status = dirtyCells[key] !== undefined ? dirtyCells[key].status : originalStatusMap[key] ?? ""
        if (status === "present") p++
        else if (status === "late") l++
        else if (status === "absent") a++
        else if (status === "excused") e++
      })

      const recordedCount = p + l + a + e
      const rate = recordedCount > 0 ? Math.round(((p + l) / recordedCount) * 100) : null
      return {
        student: stu,
        present: p,
        late: l,
        absent: a,
        excused: e,
        recordedCount,
        rate,
      }
    })
  }, [students, filteredSessions, dirtyCells, originalStatusMap])

  // Filter students by search term
  const filteredStudents = React.useMemo(() => {
    const q = studentSearch.toLowerCase().trim()
    if (!q) return studentRows
    return studentRows.filter(
      (row) =>
        row.student.name.toLowerCase().includes(q) ||
        (row.student.unique_code && row.student.unique_code.toLowerCase().includes(q))
    )
  }, [studentRows, studentSearch])

  // Summary Metrics across matrix
  const matrixStats = React.useMemo<MatrixSummaryStats>(() => {
    let totalP = 0
    let totalL = 0
    let totalA = 0
    let totalE = 0

    studentRows.forEach((row) => {
      totalP += row.present
      totalL += row.late
      totalA += row.absent
      totalE += row.excused
    })

    const totalRecorded = totalP + totalL + totalA + totalE
    const overallRate = totalRecorded > 0 ? Math.round(((totalP + totalL) / totalRecorded) * 100) : 0

    return {
      totalSessions: sessions.length,
      filteredSessionsCount: filteredSessions.length,
      subjectsCount: availableSubjects.length,
      overallRate,
      presentCount: totalP,
      lateCount: totalL,
      absentCount: totalA,
      excusedCount: totalE,
      dirtyCount: Object.keys(dirtyCells).length,
      saving,
    }
  }, [sessions.length, filteredSessions.length, availableSubjects.length, studentRows, dirtyCells, saving])

  React.useEffect(() => {
    onStatsChange?.(matrixStats)
  }, [matrixStats, onStatsChange])

  // ---------------------------------------------------------------------------
  // Inline Cell Edit & Bulk Save
  // ---------------------------------------------------------------------------
  const handleCellChange = (sessionId: number, studentId: number, status: RollAttendanceStatus | "") => {
    const key = `${sessionId}:${studentId}`
    const original = originalStatusMap[key] ?? ""

    setDirtyCells((prev) => {
      const next = { ...prev }
      if (status === original) {
        delete next[key]
      } else {
        next[key] = { sessionId, studentId, status }
      }
      return next
    })
  }

  const handleDiscardChanges = () => {
    setDirtyCells({})
  }

  const handleSaveDirtyCells = async () => {
    const dirtyEntries = Object.values(dirtyCells).filter(
      (entry): entry is { sessionId: number; studentId: number; status: RollAttendanceStatus } =>
        entry.status !== ""
    )
    if (dirtyEntries.length === 0 || !isSignedIn) {
      setDirtyCells({})
      return
    }

    setSaving(true)
    try {
      const token = await getToken()
      if (!token) throw new Error("No token")
      const api = createApi(token)

      if (isAdhoc) {
        const payload = dirtyEntries.map((item) => ({
          adhoc_session_id: item.sessionId,
          student_id: item.studentId,
          status: item.status,
          attended: item.status === "present" || item.status === "late",
        }))
        await api.bulkUpsertAdHocSessionAttendances(payload)
      } else {
        const payload = dirtyEntries.map((item) => ({
          session_id: item.sessionId,
          student_id: item.studentId,
          status: item.status,
        }))
        await api.bulkUpsertSessionAttendances(payload)
      }

      setDirtyCells({})
      toast.add({
        title: "Matrix Changes Saved",
        description: `Successfully saved ${dirtyEntries.length} attendance updates`,
        type: "success",
      })
      await fetchMatrix()
    } catch (err) {
      toast.add({
        title: "Save Failed",
        description: err instanceof ApiError ? err.userMessage : "Failed to save matrix attendance updates",
        type: "error",
      })
    } finally {
      setSaving(false)
    }
  }

  // External save trigger from SystemHeader
  const prevSaveTriggerRef = React.useRef(saveTrigger)
  React.useEffect(() => {
    if (saveTrigger !== undefined && saveTrigger !== prevSaveTriggerRef.current) {
      prevSaveTriggerRef.current = saveTrigger
      if (Object.keys(dirtyCells).length > 0) {
        handleSaveDirtyCells()
      }
    }
  }, [saveTrigger, dirtyCells, handleSaveDirtyCells])

  // ---------------------------------------------------------------------------
  // Export CSV
  // ---------------------------------------------------------------------------
  const handleExportCSV = () => {
    if (filteredSessions.length === 0 || students.length === 0) {
      toast.add({
        title: "No Data to Export",
        description: "There are no sessions or students matching the current filter",
        type: "info",
      })
      return
    }

    const sessionHeaders = filteredSessions.map((s) => {
      const dateStr = toSessionDateString(s.date || s.start_time)
      const timeStr = formatBackendTime(s.start_time)
      const subj = s.subject || "Session"
      const teacher = s.teacher_name || "Teacher"
      return `"${dateStr} ${timeStr} - ${subj} (${teacher})"`
    })

    const headerRow = [
      "Student Code",
      "Student Name",
      "Attendance Rate (%)",
      "Present",
      "Late",
      "Absent",
      "Excused",
      ...sessionHeaders,
    ].join(",")

    const rows = studentRows.map((row) => {
      const stu = row.student
      const code = `"${stu.unique_code || `STU-${stu.id}`}"`
      const name = `"${stu.name.replace(/"/g, '""')}"`
      const rate = row.rate !== null ? `${row.rate}%` : "—"

      const sessionStatuses = filteredSessions.map((sess) => {
        const key = `${sess.id}:${stu.id}`
        const status = dirtyCells[key] !== undefined ? dirtyCells[key].status : originalStatusMap[key] ?? ""
        return `"${status ? status.toUpperCase() : "—"}"`
      })

      return [
        code,
        name,
        `"${rate}"`,
        row.present,
        row.late,
        row.absent,
        row.excused,
        ...sessionStatuses,
      ].join(",")
    })

    const csvContent = [headerRow, ...rows].join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    const cohortName = activeClass ? formatCohortIdentifier(activeClass) : isAdhoc ? "ADHOC" : "COHORT"
    link.setAttribute("href", url)
    link.setAttribute(
      "download",
      `Attendance_Matrix_${cohortName.replace(/\s+/g, "_")}_${dateFrom}_to_${dateTo}.csv`
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    toast.add({
      title: "CSV Export Complete",
      description: `Exported matrix for ${studentRows.length} students across ${filteredSessions.length} sessions`,
      type: "success",
    })
  }

  const dirtyCount = Object.keys(dirtyCells).length

  return (
    <div className="space-y-3 min-w-0 w-full">
      {/* --------------------------------------------------------------------- */}
      {/* FILTER BAR: DATES, RANGE MODE, SUBJECT & TEACHER                       */}
      {/* --------------------------------------------------------------------- */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-sm border border-border bg-card px-3.5 py-2">
        <div className="flex flex-wrap items-center gap-2">
          {/* Segmented Range Mode Switcher */}
          <div className="flex items-center gap-0.5 rounded-sm border border-border bg-muted/40 p-0.5 font-mono text-[11px]">
            <button
              type="button"
              onClick={() => setRangeMode("monthly")}
              className={cn(
                "rounded-[2px] px-2 py-0.5 font-semibold transition-colors",
                rangeMode === "monthly"
                  ? "bg-foreground text-background shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              MONTHLY
            </button>
            <button
              type="button"
              onClick={() => setRangeMode("custom")}
              className={cn(
                "rounded-[2px] px-2 py-0.5 font-semibold transition-colors",
                rangeMode === "custom"
                  ? "bg-foreground text-background shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              CUSTOM RANGE
            </button>
          </div>

          {/* Month / Year Stepper Mode */}
          {rangeMode === "monthly" && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleStepMonth(-1)}
                title="Previous month"
                aria-label="Previous month"
                className="inline-flex size-8 shrink-0 items-center justify-center rounded-sm border border-border bg-muted/30 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <ChevronLeft className="size-3.5" />
              </button>

              <Select
                value={String(selectedMonth)}
                onValueChange={(val) => {
                  if (val != null) setSelectedMonth(Number(val))
                }}
              >
                <SelectTrigger className="h-8 min-w-[110px] rounded-sm font-mono text-xs">
                  <span className="truncate">{MONTHS[selectedMonth]?.label || "Month"}</span>
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m) => (
                    <SelectItem key={m.index} value={String(m.index)} className="font-mono text-xs">
                      {m.label} ({m.short})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={String(selectedYear)}
                onValueChange={(val) => {
                  if (val != null) setSelectedYear(Number(val))
                }}
              >
                <SelectTrigger className="h-8 min-w-[76px] rounded-sm font-mono text-xs">
                  <span className="truncate">{selectedYear}</span>
                </SelectTrigger>
                <SelectContent>
                  {YEARS.map((y) => (
                    <SelectItem key={y} value={String(y)} className="font-mono text-xs">
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <button
                type="button"
                onClick={() => handleStepMonth(1)}
                title="Next month"
                aria-label="Next month"
                className="inline-flex size-8 shrink-0 items-center justify-center rounded-sm border border-border bg-muted/30 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <ChevronRight className="size-3.5" />
              </button>
            </div>
          )}

          {/* Custom Date Pickers Mode */}
          {rangeMode === "custom" && (
            <div className="flex flex-wrap items-center gap-1.5">
              <div className="flex items-center gap-1">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  FROM //
                </span>
                <Input
                  type="date"
                  value={customDateFrom}
                  onChange={(e) => setCustomDateFrom(e.target.value)}
                  className="h-8 w-34 rounded-sm font-mono text-xs"
                />
              </div>
              <div className="flex items-center gap-1">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  TO //
                </span>
                <Input
                  type="date"
                  value={customDateTo}
                  onChange={(e) => setCustomDateTo(e.target.value)}
                  className="h-8 w-34 rounded-sm font-mono text-xs"
                />
              </div>
            </div>
          )}

          {/* Subject Filter */}
          <div className="flex items-center gap-1">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              SUBJECT //
            </span>
            <Select
              value={selectedSubjectId}
              onValueChange={(val) => {
                if (val != null) setSelectedSubjectId(val)
              }}
            >
              <SelectTrigger className="h-8 min-w-[170px] rounded-sm font-mono text-xs">
                <span className="truncate">{selectedSubjectLabel}</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL" className="font-mono text-xs">
                  All Subjects ({availableSubjects.length})
                </SelectItem>
                {availableSubjects.map((sub) => (
                  <SelectItem key={sub.id} value={sub.id} className="font-mono text-xs">
                    {sub.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Teacher Filter */}
          <div className="flex items-center gap-1">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              TEACHER //
            </span>
            <Select
              value={selectedTeacherName}
              onValueChange={(val) => {
                if (val != null) setSelectedTeacherName(val)
              }}
            >
              <SelectTrigger className="h-8 min-w-[145px] rounded-sm font-mono text-xs">
                <span className="truncate">{selectedTeacherLabel}</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL" className="font-mono text-xs">
                  All Teachers
                </SelectItem>
                {availableTeachers.map((tName) => (
                  <SelectItem key={tName} value={tName} className="font-mono text-xs">
                    {tName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Right Info: Date Range String */}
        <div className="font-mono text-xs text-muted-foreground whitespace-nowrap">
          <span className="font-bold text-foreground">{filteredSessions.length}</span> SESSIONS IN VIEW
          <span className="hidden xl:inline text-muted-foreground/80">
            {" "}({formatBackendDate(dateFrom)} – {formatBackendDate(dateTo)})
          </span>
        </div>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* MATRIX GRID DATAMODULE                                                */}
      {/* --------------------------------------------------------------------- */}
      <DataModule
        searchPlaceholder="Search student by name or STU code..."
        searchValue={studentSearch}
        onSearchChange={setStudentSearch}
        toolbarRight={
          <div className="flex items-center gap-2">
            {/* Discard Button (Only when Dirty) */}
            {dirtyCount > 0 && (
              <Button
                size="xs"
                variant="outline"
                onClick={handleDiscardChanges}
                disabled={saving}
                className="h-8 gap-1 rounded-sm font-mono text-xs border-destructive/40 text-destructive hover:bg-destructive/10"
              >
                <RotateCcw className="size-3" />
                Discard ({dirtyCount})
              </Button>
            )}

            {/* Export CSV */}
            <Button
              size="xs"
              variant="outline"
              onClick={handleExportCSV}
              disabled={filteredSessions.length === 0 || studentRows.length === 0}
              className="h-8 gap-1.5 rounded-sm font-mono text-xs uppercase"
            >
              <Download className="size-3.5" />
              Export CSV
            </Button>
          </div>
        }
        totalCount={filteredStudents.length}
        countLabel="STUDENTS"
      >
        <div className="w-full max-w-full min-w-0 overflow-hidden">
          {/* Viewport-Bounded Table Scroll Container */}
          <div className="relative max-h-[calc(100vh-310px)] min-h-[380px] w-full max-w-full overflow-auto border-t border-border">
            <table className="w-max min-w-full border-separate border-spacing-0 text-left text-xs">
            <thead className="sticky top-0 z-30 bg-card">
              <tr className="h-14">
                {/* Sticky Column 1: Student Name & Code */}
                <th className="sticky top-0 left-0 z-40 w-[230px] min-w-[230px] max-w-[230px] box-border border-b border-r border-border bg-card px-3 py-2 text-left font-mono">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-foreground">
                      STUDENT
                    </span>
                    <span className="font-mono text-[10px] uppercase text-muted-foreground">
                      CODE & FULL NAME
                    </span>
                  </div>
                </th>

                {/* Sticky Column 2: Range Summary & Rate */}
                <th className="sticky top-0 left-[230px] z-40 w-[150px] min-w-[150px] max-w-[150px] box-border border-b border-r border-border bg-card px-3 py-2 text-center font-mono shadow-[2px_0_4px_-1px_rgba(0,0,0,0.25)]">
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-foreground">
                      RANGE SUMMARY
                    </span>
                    <span className="font-mono text-[10px] uppercase text-muted-foreground">
                      RATE · P / L / A
                    </span>
                  </div>
                </th>

                {/* Dynamic Session Columns */}
                {filteredSessions.map((sess) => {
                  const sessionDateStr = toSessionDateString(sess.date || sess.start_time)
                  const dayName = formatBackendDate(sess.start_time, { weekday: "short" }).toUpperCase()
                  const dayNum = formatBackendDate(sess.start_time, { day: "numeric", month: "short" }).toUpperCase()
                  const timeStart = formatBackendTime(sess.start_time)

                  return (
                    <th
                      key={sess.id}
                      className="sticky top-0 z-30 w-[165px] min-w-[165px] max-w-[165px] box-border border-b border-r border-border bg-card px-3 py-2 text-left align-top font-normal transition-colors hover:bg-muted"
                    >
                      <div className="flex flex-col gap-1">
                        {/* Top Line: Subject + Jump Link */}
                        <div className="flex items-center justify-between gap-1 w-full">
                          <span
                            className="truncate font-mono text-[11px] font-bold uppercase text-foreground"
                            title={sess.subject || "Session"}
                          >
                            {sess.subject || "Session"}
                          </span>
                          {onJumpToSession && (
                            <button
                              type="button"
                              onClick={() => onJumpToSession(sessionDateStr, sess.id)}
                              title={`Jump to ${dayNum} ${timeStart} session in Daily Roll`}
                              className="shrink-0 rounded-[2px] p-0.5 text-muted-foreground hover:bg-muted-foreground/15 hover:text-foreground"
                            >
                              <ArrowUpRight className="size-3" />
                            </button>
                          )}
                        </div>

                        {/* Second Line: Teacher */}
                        <div
                          className="w-full truncate font-mono text-[10px] text-muted-foreground uppercase text-left"
                          title={sess.teacher_name || "Unassigned"}
                        >
                          {sess.teacher_name || "Teacher —"}
                        </div>

                        {/* Third Line: Date & Time strictly whitespace-nowrap */}
                        <div className="w-full truncate whitespace-nowrap font-mono text-[10px] font-semibold text-foreground/90 text-left">
                          {dayName}, {dayNum} · {timeStart}
                        </div>
                      </div>
                    </th>
                  )
                })}

                {filteredSessions.length === 0 && (
                  <th className="border-b border-border bg-card px-6 py-6 text-center font-mono text-xs text-muted-foreground">
                    No sessions match the selected period or filters.
                  </th>
                )}
              </tr>
            </thead>

            <tbody>
              {filteredStudents.map((row) => {
                const stu = row.student
                const rateColor =
                  row.rate === null
                    ? "text-muted-foreground"
                    : row.rate >= 90
                      ? "text-success font-bold"
                      : row.rate >= 75
                        ? "text-warning font-bold"
                        : "text-destructive font-bold"

                return (
                  <tr key={stu.id} className="group h-10 hover:bg-muted/40 transition-colors">
                    {/* Sticky Column 1: Student Code & Name */}
                    <td className="sticky left-0 z-20 w-[230px] min-w-[230px] max-w-[230px] box-border border-b border-r border-border bg-card px-3 py-1.5 group-hover:bg-muted transition-colors">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <CodeChip accent className="shrink-0 text-[10px]">
                          {stu.unique_code || `STU-${stu.id}`}
                        </CodeChip>
                        <div className="truncate text-xs font-semibold text-foreground" title={stu.name}>
                          {stu.name}
                        </div>
                      </div>
                    </td>

                    {/* Sticky Column 2: Rate & Monospace Breakdown */}
                    <td className="sticky left-[230px] z-20 w-[150px] min-w-[150px] max-w-[150px] box-border border-b border-r border-border bg-card px-3 py-1.5 text-center group-hover:bg-muted transition-colors shadow-[2px_0_4px_-1px_rgba(0,0,0,0.25)]">
                      <div className="flex flex-col items-center justify-center">
                        <span className={cn("font-mono text-xs", rateColor)}>
                          {row.rate !== null ? `${row.rate}%` : "—"}
                        </span>
                        <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
                          P:{row.present} L:{row.late} A:{row.absent}
                        </span>
                      </div>
                    </td>

                    {/* Dynamic Session Cells */}
                    {filteredSessions.map((sess) => {
                      const key = `${sess.id}:${stu.id}`
                      const isDirty = dirtyCells[key] !== undefined
                      const status = isDirty ? dirtyCells[key].status : originalStatusMap[key] ?? ""

                      return (
                        <td
                          key={sess.id}
                          className="w-[165px] min-w-[165px] max-w-[165px] box-border border-b border-r border-border/50 bg-background px-2 py-1 text-center group-hover:bg-muted/40"
                        >
                          <MatrixCellControl
                            value={status}
                            isDirty={isDirty}
                            onChange={(nextVal) => handleCellChange(sess.id, stu.id, nextVal)}
                          />
                        </td>
                      )
                    })}

                    {filteredSessions.length === 0 && (
                      <td className="border-b border-border px-6 py-4 text-center font-mono text-xs text-muted-foreground">
                        —
                      </td>
                    )}
                  </tr>
                )
              })}

              {filteredStudents.length === 0 && (
                <tr>
                  <td
                    colSpan={2 + Math.max(1, filteredSessions.length)}
                    className="border-b border-border py-12 text-center font-mono text-xs text-muted-foreground"
                  >
                    {loading
                      ? "Loading monthly attendance matrix..."
                      : studentSearch
                        ? "No students matching your search query."
                        : "No students registered for this cohort."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </div>
      </DataModule>
    </div>
  )
}
