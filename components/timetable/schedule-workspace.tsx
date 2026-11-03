"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@clerk/nextjs"
import {
  CalendarDays,
  Clock,
  Sparkles,
  Plus,
  Trash2,
  Edit3,
  UserCheck,
  Search,
  Filter,
  Check,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Users,
  BookOpen,
  X,
  Layers,
  ArrowRight,
} from "lucide-react"
import { createApi, ApiError } from "@/lib/api"
import type {
  Class,
  TimetableSlot,
  Session,
  Teacher,
  Subject,
  TimetableSlotPayload,
  SessionPayload,
  SessionStatus,
} from "@/lib/types"
import { formatClassLabel, formatCohortIdentifier, educationLevelLabel } from "@/lib/format-class"
import { useClassesQuery, useSubjectsQuery, useTeachersSelectQuery } from "@/hooks/use-api-queries"
import {
  SystemHeader,
  CohortSwitcher,
  type CohortSwitcherOption,
  DataModule,
  InspectorSheet,
  CodeChip,
  TelemetryTag,
} from "@/components/design-system/v2-primitives"
import { toast } from "@/components/ui/toast"
import { Button } from "@/components/ui/button"
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
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { cn, toLocalDateString, toMonthEndDateString, parseBackendDateTime, formatBackendTime, formatBackendDate } from "@/lib/utils"

export const DAYS_CONFIG = [
  { index: 0, label: "MON", full: "Monday", isWeekend: false },
  { index: 1, label: "TUE", full: "Tuesday", isWeekend: false },
  { index: 2, label: "WED", full: "Wednesday", isWeekend: false },
  { index: 3, label: "THU", full: "Thursday", isWeekend: false },
  { index: 4, label: "FRI", full: "Friday", isWeekend: false },
  { index: 5, label: "SAT", full: "Saturday", isWeekend: true },
  { index: 6, label: "SUN", full: "Sunday", isWeekend: true },
] as const

interface ScheduleWorkspaceProps {
  initialClassId?: string | number
  initialTab?: "grid" | "sessions"
  initialSlotId?: string | number
}

export function ScheduleWorkspace({
  initialClassId,
  initialTab = "grid",
  initialSlotId,
}: ScheduleWorkspaceProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { getToken, isLoaded, isSignedIn } = useAuth()

  // Queries for base metadata
  const classesQuery = useClassesQuery(!!isLoaded && !!isSignedIn)
  const teachersQuery = useTeachersSelectQuery(!!isLoaded && !!isSignedIn)
  const subjectsQuery = useSubjectsQuery(!!isLoaded && !!isSignedIn)

  const classes = React.useMemo(() => classesQuery.data ?? [], [classesQuery.data])
  const teachers = React.useMemo(() => teachersQuery.data ?? [], [teachersQuery.data])
  const subjects = React.useMemo(() => subjectsQuery.data ?? [], [subjectsQuery.data])

  // Active Tab state
  const tabFromUrl = searchParams.get("tab")
  const [activeTab, setActiveTab] = React.useState<string>(
    tabFromUrl === "sessions" || initialTab === "sessions" ? "sessions" : "grid"
  )

  // Map classes to CohortSwitcherOption
  const cohortOptions: CohortSwitcherOption[] = React.useMemo(() => {
    return classes.map((c) => ({
      id: c.id,
      code: formatCohortIdentifier(c),
      level: c.education_level,
      levelLabel: educationLevelLabel(c.education_level),
      studentCount: undefined,
      subjectCount: undefined,
    }))
  }, [classes])

  // Selected Cohort
  const classIdParam = searchParams.get("classId") || (initialClassId ? String(initialClassId) : null)
  const [selectedCohortCode, setSelectedCohortCode] = React.useState<string>("")
  const initializedRef = React.useRef(false)

  // Sync selected cohort with classes once loaded
  React.useEffect(() => {
    if (initializedRef.current || classes.length === 0) return
    initializedRef.current = true

    if (classIdParam) {
      const match = classes.find((c) => String(c.id) === classIdParam)
      if (match) {
        setSelectedCohortCode(formatCohortIdentifier(match))
        return
      }
    }

    if (!selectedCohortCode) {
      setSelectedCohortCode(formatCohortIdentifier(classes[0]))
    }
  }, [classes, classIdParam, selectedCohortCode])

  // Find active Class
  const activeClass = React.useMemo(() => {
    if (!classes.length || !selectedCohortCode) return null
    return (
      classes.find(
        (c) =>
          formatCohortIdentifier(c) === selectedCohortCode ||
          String(c.id) === selectedCohortCode
      ) ?? null
    )
  }, [classes, selectedCohortCode])

  // Timetable slots and Sessions state
  const [slots, setSlots] = React.useState<TimetableSlot[]>([])
  const [sessions, setSessions] = React.useState<Session[]>([])
  const [loading, setLoading] = React.useState(false)

  // Fetch slots and sessions for active cohort
  const fetchData = React.useCallback(async () => {
    if (!activeClass || !isSignedIn) return
    setLoading(true)
    try {
      const token = await getToken()
      if (!token) throw new Error("Authentication token unavailable")
      const api = createApi(token)

      const [slotsData, sessionsData] = await Promise.all([
        api.listTimetableSlots({ class_id: activeClass.id }, true),
        api.listSessions({ class_id: activeClass.id }),
      ])

      const classSlots = (slotsData || []).filter(
        (s) => !s.class_obj || s.class_obj.id === activeClass.id
      )
      const slotIds = new Set(classSlots.map((s) => s.id))
      const classSessions = (sessionsData || [])
        .filter(
          (s) =>
            s.class_obj?.id === activeClass.id ||
            s.timetable_slot?.class_obj?.id === activeClass.id ||
            (s.timetable_slot?.id != null && slotIds.has(s.timetable_slot.id))
        )
        .sort(
          (a, b) =>
            parseBackendDateTime(b.start_time).getTime() -
            parseBackendDateTime(a.start_time).getTime()
        )

      setSlots(classSlots)
      setSessions(classSessions)
    } catch (err) {
      toast.add({
        title: "Error Loading Schedule",
        description: err instanceof ApiError ? err.userMessage : "Failed to load timetable data",
        type: "error",
      })
    } finally {
      setLoading(false)
    }
  }, [activeClass, isSignedIn, getToken])

  React.useEffect(() => {
    if (activeClass) {
      fetchData()
    }
  }, [activeClass, fetchData])

  // Handle Cohort Change
  const handleCohortChange = (newCode: string) => {
    setSelectedCohortCode(newCode)
    const match = classes.find((c) => formatCohortIdentifier(c) === newCode)
    if (match) {
      const sp = new URLSearchParams(window.location.search)
      sp.set("classId", String(match.id))
      router.replace(`?${sp.toString()}`, { scroll: false })
    }
  }

  // Handle Tab Change
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId)
    const sp = new URLSearchParams(window.location.search)
    sp.set("tab", tabId)
    router.replace(`?${sp.toString()}`, { scroll: false })
  }

  // ---------------------------------------------------------------------------
  // Inspector Sheet State
  // ---------------------------------------------------------------------------
  const [inspectedSlot, setInspectedSlot] = React.useState<TimetableSlot | null>(null)
  const [newSlotDay, setNewSlotDay] = React.useState<number | null>(null)
  const [drawerTab, setDrawerTab] = React.useState<"occurrences" | "edit">("occurrences")

  // Auto-open inspected slot if query param provided
  const slotIdParam = searchParams.get("slotId") || (initialSlotId ? String(initialSlotId) : null)
  React.useEffect(() => {
    if (slotIdParam && slots.length > 0 && !inspectedSlot) {
      const s = slots.find((item) => String(item.id) === slotIdParam)
      if (s) {
        setInspectedSlot(s)
        setDrawerTab("occurrences")
      }
    }
  }, [slotIdParam, slots, inspectedSlot])

  // Substitute override form in sheet
  const [selectedSubTeacherId, setSelectedSubTeacherId] = React.useState<string>("")
  const [submittingSub, setSubmittingSub] = React.useState(false)

  // Edit slot form state
  const [editSubjectId, setEditSubjectId] = React.useState<string>("")
  const [editTeacherId, setEditTeacherId] = React.useState<string>("")
  const [editStartTime, setEditStartTime] = React.useState<string>("")
  const [editEndTime, setEditEndTime] = React.useState<string>("")
  const [editRoom, setEditRoom] = React.useState<string>("")
  const [editDayOfWeek, setEditDayOfWeek] = React.useState<number>(0)
  const [savingSlot, setSavingSlot] = React.useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false)

  // Sync edit form when inspectedSlot opens
  React.useEffect(() => {
    if (inspectedSlot) {
      setEditSubjectId(inspectedSlot.subject?.id ? String(inspectedSlot.subject.id) : "")
      setEditTeacherId(inspectedSlot.teacher?.id ? String(inspectedSlot.teacher.id) : "")
      setEditStartTime(inspectedSlot.start_time?.slice(0, 5) ?? "09:00")
      setEditEndTime(inspectedSlot.end_time?.slice(0, 5) ?? "10:30")
      setEditRoom(inspectedSlot.room ?? "")
      setEditDayOfWeek(inspectedSlot.day_of_week ?? 0)
      setSelectedSubTeacherId("")
    }
  }, [inspectedSlot])

  // New slot form state
  const [newSubjectId, setNewSubjectId] = React.useState<string>("")
  const [newTeacherId, setNewTeacherId] = React.useState<string>("")
  const [newStartTime, setNewStartTime] = React.useState<string>("09:00")
  const [newEndTime, setNewEndTime] = React.useState<string>("10:30")
  const [newRoom, setNewRoom] = React.useState<string>("")
  const [creatingSlot, setCreatingSlot] = React.useState(false)

  // Set default subject/teacher when new slot opens
  React.useEffect(() => {
    if (newSlotDay !== null) {
      if (subjects.length > 0 && !newSubjectId) {
        setNewSubjectId(String(subjects[0].id))
      }
      if (teachers.length > 0 && !newTeacherId) {
        setNewTeacherId(String(teachers[0].id))
      }
      setNewStartTime("09:00")
      setNewEndTime("10:30")
      setNewRoom("RM-101")
    }
  }, [newSlotDay, subjects, teachers, newSubjectId, newTeacherId])

  // Handle Save Slot Changes
  const handleUpdateSlot = async () => {
    if (!inspectedSlot || !activeClass) return
    setSavingSlot(true)
    try {
      const token = await getToken()
      if (!token) throw new Error("No token")
      const api = createApi(token)

      const payload: TimetableSlotPayload = {
        class_obj_id: activeClass.id,
        subject_id: Number(editSubjectId),
        teacher_id: Number(editTeacherId),
        day_of_week: editDayOfWeek,
        start_time: editStartTime.length === 5 ? `${editStartTime}:00` : editStartTime,
        end_time: editEndTime.length === 5 ? `${editEndTime}:00` : editEndTime,
      }

      const updated = await api.updateTimetableSlot(inspectedSlot.id, payload)
      setSlots((prev) => prev.map((s) => (s.id === inspectedSlot.id ? updated : s)))
      setInspectedSlot(updated)
      toast.add({
        title: "Slot Updated",
        description: "Timetable slot updated successfully",
        type: "success",
      })
    } catch (err) {
      toast.add({
        title: "Update Failed",
        description: err instanceof ApiError ? err.userMessage : "Failed to update slot",
        type: "error",
      })
    } finally {
      setSavingSlot(false)
    }
  }

  // Handle Delete Slot
  const handleDeleteSlot = async () => {
    if (!inspectedSlot) return
    setSavingSlot(true)
    try {
      const token = await getToken()
      if (!token) throw new Error("No token")
      const api = createApi(token)
      await api.deleteTimetableSlot(inspectedSlot.id)
      setSlots((prev) => prev.filter((s) => s.id !== inspectedSlot.id))
      setInspectedSlot(null)
      setDeleteConfirmOpen(false)
      toast.add({
        title: "Slot Deleted",
        description: "Timetable slot deleted successfully",
        type: "success",
      })
    } catch (err) {
      toast.add({
        title: "Delete Failed",
        description: err instanceof ApiError ? err.userMessage : "Failed to delete slot",
        type: "error",
      })
    } finally {
      setSavingSlot(false)
    }
  }

  // Handle Create Slot
  const handleCreateSlot = async () => {
    if (!activeClass || newSlotDay === null) return
    setCreatingSlot(true)
    try {
      const token = await getToken()
      if (!token) throw new Error("No token")
      const api = createApi(token)

      const payload: TimetableSlotPayload = {
        class_obj_id: activeClass.id,
        subject_id: Number(newSubjectId),
        teacher_id: Number(newTeacherId),
        day_of_week: newSlotDay,
        start_time: newStartTime.length === 5 ? `${newStartTime}:00` : newStartTime,
        end_time: newEndTime.length === 5 ? `${newEndTime}:00` : newEndTime,
      }

      const created = await api.createTimetableSlot(payload)
      setSlots((prev) => [...prev, created])
      setNewSlotDay(null)
      toast.add({
        title: "Slot Created",
        description: "New timetable slot created successfully",
        type: "success",
      })
    } catch (err) {
      toast.add({
        title: "Create Failed",
        description: err instanceof ApiError ? err.userMessage : "Failed to create slot",
        type: "error",
      })
    } finally {
      setCreatingSlot(false)
    }
  }

  // Handle Substitute Override on a session
  const handleAssignSubstitute = async (sessionId: number, teacherId: number | null) => {
    setSubmittingSub(true)
    try {
      const token = await getToken()
      if (!token) throw new Error("No token")
      const api = createApi(token)

      const updated = await api.patchSession(sessionId, {
        actual_teacher_id: teacherId,
      })

      setSessions((prev) => prev.map((s) => (s.id === sessionId ? updated : s)))
      toast.add({
        title: teacherId ? "Substitute Assigned" : "Substitute Cleared",
        description: teacherId
          ? "Substitute teacher assigned successfully"
          : "Reverted to assigned teacher",
        type: "success",
      })
    } catch (err) {
      toast.add({
        title: "Assignment Failed",
        description: err instanceof ApiError ? err.userMessage : "Failed to assign substitute",
        type: "error",
      })
    } finally {
      setSubmittingSub(false)
    }
  }

  // Generate sessions drawer state
  const [generateDrawerOpen, setGenerateDrawerOpen] = React.useState(false)
  const [genStartDate, setGenStartDate] = React.useState(toLocalDateString(new Date()))
  const [genEndDate, setGenEndDate] = React.useState(toMonthEndDateString(new Date()))
  const [generatingSessions, setGeneratingSessions] = React.useState(false)

  const handleConfirmGenerateSessions = async () => {
    if (!activeClass || !isSignedIn) return
    setGeneratingSessions(true)
    try {
      const token = await getToken()
      if (!token) throw new Error("No token")
      const api = createApi(token)

      const result = await api.generateSessionsForClass(activeClass.id, {
        start_date: genStartDate,
        end_date: genEndDate,
      })
      await fetchData()
      setGenerateDrawerOpen(false)
      toast.add({
        title: "Sessions Generated",
        description: `Generated ${result.total_created} dated sessions (${result.total_already_existed} already existed)`,
        type: "success",
      })
    } catch (err) {
      toast.add({
        title: "Generation Failed",
        description: err instanceof ApiError ? err.userMessage : "Failed to generate sessions",
        type: "error",
      })
    } finally {
      setGeneratingSessions(false)
    }
  }

  // Sessions belonging to inspected slot
  const slotSessions = React.useMemo(() => {
    if (!inspectedSlot) return []
    return sessions
      .filter((s) => s.timetable_slot?.id === inspectedSlot.id)
      .sort((a, b) => b.start_time.localeCompare(a.start_time))
  }, [sessions, inspectedSlot])

  // Check if slot currently has substitute active
  const hasSubstituteOnInspected = slotSessions.some(
    (s) => s.actual_teacher && s.actual_teacher.id !== s.teacher?.id
  )

  // ---------------------------------------------------------------------------
  // Tab 2: Dated Sessions Table Filters & Search
  // ---------------------------------------------------------------------------
  const [sessionSearch, setSessionSearch] = React.useState("")
  const [sessionStatusFilter, setSessionStatusFilter] = React.useState<string>("all")

  const filteredSessions = React.useMemo(() => {
    const q = sessionSearch.toLowerCase().trim()
    return sessions.filter((sess) => {
      if (sessionStatusFilter !== "all" && (sess.status || "scheduled") !== sessionStatusFilter) {
        return false
      }
      if (!q) return true
      const subj = sess.timetable_slot?.subject?.name?.toLowerCase() ?? ""
      const teacher = sess.teacher?.name?.toLowerCase() ?? ""
      const sub = sess.actual_teacher?.name?.toLowerCase() ?? ""
      const room = sess.timetable_slot?.room?.toLowerCase() ?? ""
      return subj.includes(q) || teacher.includes(q) || sub.includes(q) || room.includes(q)
    })
  }, [sessions, sessionSearch, sessionStatusFilter])

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <SystemHeader
        domain="OPERATIONS"
        breadcrumb={[
          { label: "SCHEDULE & SESSIONS" },
          { label: selectedCohortCode || "ALL COHORTS" },
        ]}
        title="Cohort Timetable & Session Dispatch"
        description="7-day flexible timetable grid with zero middleman pages. Click any slot to assign substitutes or inspect dated occurrences."
        metrics={[
          { label: "ACTIVE COHORT", value: selectedCohortCode || "—" },
          { label: "WEEKLY SLOTS", value: slots.length },
          { label: "DATED SESSIONS", value: sessions.length },
          {
            label: "SUB OVERRIDES",
            value: sessions.filter(
              (s) => s.actual_teacher && s.actual_teacher.id !== s.teacher?.id
            ).length,
            tone:
              sessions.filter(
                (s) => s.actual_teacher && s.actual_teacher.id !== s.teacher?.id
              ).length > 0
                ? "warning"
                : "default",
          },
        ]}
        tabs={[
          { id: "grid", label: "7-Day Timetable Grid", count: slots.length },
          { id: "sessions", label: "Dated Sessions & Substitutes", count: sessions.length },
        ]}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="xs"
              onClick={() => setGenerateDrawerOpen(true)}
              disabled={generatingSessions || !activeClass}
              className="gap-1 font-mono text-xs"
            >
              <Sparkles className="size-3.5 text-warning" />
              Generate Sessions
            </Button>
            <Button
              size="xs"
              onClick={() => setNewSlotDay(0)}
              disabled={!activeClass}
              className="gap-1 font-mono text-xs"
            >
              <Plus className="size-3.5" />
              Add Slot
            </Button>
          </div>
        }
      />

      {/* Cohort Switcher Bar */}
      <CohortSwitcher
        cohorts={cohortOptions}
        value={selectedCohortCode}
        onValueChange={handleCohortChange}
        actions={
          <Button
            variant="outline"
            size="xs"
            onClick={fetchData}
            disabled={loading}
            className="h-7 rounded-sm font-mono text-[11px] uppercase"
          >
            <RefreshCw className={cn("mr-1 size-3", loading && "animate-spin")} />
            Refresh
          </Button>
        }
      />

      {/* --------------------------------------------------------------------- */}
      {/* TAB 1: 7-DAY FLEXIBLE TIMETABLE GRID                                   */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === "grid" && (
        <div className="overflow-hidden rounded-sm border border-border bg-card">
          {/* Subheader / Legend Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/40 px-3.5 py-2.5">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">
                7-DAY EDUCATION CENTER TIMETABLE · {selectedCohortCode || "NO COHORT"}
              </span>
              <span className="hidden items-center gap-3 font-mono text-[10px] text-muted-foreground sm:inline-flex">
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-1.5 rounded-[1px] bg-foreground" />
                  REGULAR
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-1.5 rounded-[1px] bg-warning" />
                  SUBSTITUTE ACTIVE
                </span>
              </span>
            </div>
            <span className="font-mono text-xs text-muted-foreground">
              Education Center Dynamic Hours · Click any slot to manage occurrences & substitutes
            </span>
          </div>

          {/* 7-Day Columns (Mon - Sun) */}
          {!activeClass ? (
            <div className="py-20 text-center">
              <p className="font-mono text-xs font-semibold text-foreground">
                No cohort selected
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Please select a level with registered cohorts above to view or manage timetable slots.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[1020px]">
                {/* Day Header Row */}
                <div className="grid grid-cols-7 divide-x divide-border border-b border-border bg-muted/20">
                  {DAYS_CONFIG.map((day) => {
                    const daySlots = slots.filter((s) => s.day_of_week === day.index)
                    return (
                      <div
                        key={day.index}
                        className={cn(
                          "flex items-center justify-between px-3 py-2 font-mono text-[11px] font-bold tracking-wider uppercase",
                          day.isWeekend ? "bg-muted/40 text-foreground" : "text-foreground"
                        )}
                      >
                        <div className="flex items-center gap-1.5">
                          <span>{day.label}</span>
                          {day.isWeekend && (
                            <span className="rounded-[2px] border border-border bg-background px-1 py-0.2 text-[9px] font-semibold text-muted-foreground">
                              WKND
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-normal text-muted-foreground tabular-nums">
                          {daySlots.length} {daySlots.length === 1 ? "SLOT" : "SLOTS"}
                        </span>
                      </div>
                    )
                  })}
                </div>

                {/* Day Body Lanes */}
                <div className="grid grid-cols-7 divide-x divide-border">
                  {DAYS_CONFIG.map((day) => {
                    const daySlots = [...slots]
                      .filter((s) => s.day_of_week === day.index)
                      .sort((a, b) => a.start_time.localeCompare(b.start_time))

                    return (
                      <div
                        key={day.index}
                        className={cn(
                          "flex min-h-[320px] flex-col justify-between gap-2 p-2",
                          day.isWeekend && "bg-muted/10"
                        )}
                      >
                        {/* Slots Stack */}
                        <div className="space-y-2">
                          {daySlots.map((slot) => {
                            const slotOccurrences = sessions.filter(
                              (s) => s.timetable_slot?.id === slot.id
                            )
                            const hasSub = slotOccurrences.some(
                              (s) => s.actual_teacher && s.actual_teacher.id !== s.teacher?.id
                            )
                            const activeSub = slotOccurrences.find(
                              (s) => s.actual_teacher && s.actual_teacher.id !== s.teacher?.id
                            )?.actual_teacher

                            return (
                              <button
                                key={slot.id}
                                type="button"
                                onClick={() => {
                                  setInspectedSlot(slot)
                                  setDrawerTab("occurrences")
                                }}
                                className={cn(
                                  "group flex w-full flex-col justify-between rounded-sm border border-border bg-card p-2.5 text-left transition-colors hover:border-foreground/50 hover:bg-muted/20 border-l-2",
                                  hasSub ? "border-l-warning" : "border-l-foreground"
                                )}
                              >
                                {/* Top Bar: Start - End Monospace Chip + Room */}
                                <div className="flex w-full items-center justify-between gap-1">
                                  <span className="font-mono text-[11px] font-bold tabular-nums text-foreground">
                                    {slot.start_time.slice(0, 5)} – {slot.end_time.slice(0, 5)}
                                  </span>
                                  <CodeChip>{slot.room || "RM —"}</CodeChip>
                                </div>

                                {/* Subject Name */}
                                <div className="my-1.5">
                                  <div className="line-clamp-2 text-xs font-semibold text-foreground">
                                    {slot.subject?.name || "Unassigned Subject"}
                                  </div>
                                </div>

                                {/* Teacher & Substitute Status Footer */}
                                <div className="flex w-full items-center justify-between gap-1 border-t border-border/60 pt-1.5 text-[11px] text-muted-foreground">
                                  <span
                                    className={cn(
                                      "truncate font-medium",
                                      hasSub ? "text-warning" : "text-muted-foreground"
                                    )}
                                    title={hasSub ? `Sub: ${activeSub?.name}` : slot.teacher?.name}
                                  >
                                    {hasSub ? `Sub: ${activeSub?.name}` : slot.teacher?.name || "Teacher —"}
                                  </span>
                                  <span
                                    className={cn(
                                      "inline-flex shrink-0 items-center gap-1 font-mono text-[9px] font-semibold uppercase",
                                      hasSub ? "text-warning" : "text-muted-foreground"
                                    )}
                                  >
                                    <span
                                      className={cn(
                                        "size-1.5 rounded-[1px]",
                                        hasSub ? "bg-warning" : "bg-foreground"
                                      )}
                                    />
                                    {hasSub ? "SUB" : "REG"}
                                  </span>
                                </div>
                              </button>
                            )
                          })}

                          {daySlots.length === 0 && (
                            <div className="py-6 text-center">
                              <span className="font-mono text-[11px] text-muted-foreground/60">
                                No slots scheduled
                              </span>
                            </div>
                          )}
                        </div>

                        {/* + SCHEDULE SLOT Button at Bottom of Column */}
                        <button
                          type="button"
                          onClick={() => {
                            setInspectedSlot(null)
                            setNewSlotDay(day.index)
                          }}
                          className="flex min-h-[40px] w-full cursor-pointer items-center justify-center rounded-sm border border-dashed border-border/70 bg-muted/10 px-2 py-2 text-center font-mono text-[10px] font-semibold tracking-wider text-muted-foreground/70 uppercase transition-colors hover:border-foreground hover:bg-muted/30 hover:text-foreground"
                        >
                          + SCHEDULE SLOT
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* TAB 2: DATED SESSIONS & SUBSTITUTES                                   */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === "sessions" && (
        <DataModule
          searchPlaceholder="Filter dated sessions by subject, teacher, or room..."
          searchValue={sessionSearch}
          onSearchChange={setSessionSearch}
          filters={
            <Select
              value={sessionStatusFilter}
              onValueChange={(val) => {
                if (val != null) setSessionStatusFilter(val)
              }}
            >
              <SelectTrigger className="h-8 rounded-sm font-mono text-xs min-w-[140px]">
                <span className="truncate">
                  {sessionStatusFilter === "all"
                    ? "ALL STATUSES"
                    : sessionStatusFilter === "scheduled"
                      ? "SCHEDULED"
                      : sessionStatusFilter === "no_show"
                        ? "NO SHOW"
                        : sessionStatusFilter === "completed"
                          ? "COMPLETED"
                          : sessionStatusFilter === "cancelled"
                            ? "CANCELLED"
                            : sessionStatusFilter.toUpperCase()}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="font-mono text-xs">
                  ALL STATUSES
                </SelectItem>
                <SelectItem value="scheduled" className="font-mono text-xs">
                  SCHEDULED
                </SelectItem>
                <SelectItem value="in_progress" className="font-mono text-xs">
                  IN PROGRESS
                </SelectItem>
                <SelectItem value="completed" className="font-mono text-xs">
                  COMPLETED
                </SelectItem>
                <SelectItem value="cancelled" className="font-mono text-xs">
                  CANCELLED
                </SelectItem>
              </SelectContent>
            </Select>
          }
          toolbarRight={
            <Button
              size="xs"
              variant="outline"
              onClick={() => setGenerateDrawerOpen(true)}
              disabled={generatingSessions || !activeClass}
              className="gap-1 font-mono text-xs"
            >
              <Sparkles className="size-3.5 text-warning" />
              Generate Sessions
            </Button>
          }
          totalCount={filteredSessions.length}
          countLabel="DATED SESSIONS"
        >
          <Table>
            <TableHeader>
              <TableRow className="h-9 bg-muted/30 hover:bg-muted/30">
                <TableHead className="px-3.5 font-mono text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                  Date & Time
                </TableHead>
                <TableHead className="font-mono text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                  Cohort & Subject
                </TableHead>
                <TableHead className="font-mono text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                  Assigned Teacher
                </TableHead>
                <TableHead className="font-mono text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                  Actual / Substitute
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
              {filteredSessions.map((sess) => {
                const dateObj = parseBackendDateTime(sess.start_time)
                const dateStr = toLocalDateString(dateObj)
                const timeStart = formatBackendTime(sess.start_time)
                const timeEnd = formatBackendTime(sess.end_time)
                const hasSub = sess.actual_teacher && sess.actual_teacher.id !== sess.teacher?.id

                return (
                  <TableRow key={sess.id} className="h-11 hover:bg-muted/40">
                    <TableCell className="px-3.5 font-mono text-xs tabular-nums text-foreground">
                      <div className="font-semibold">{dateStr}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {timeStart} – {timeEnd}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <CodeChip accent>{selectedCohortCode}</CodeChip>
                        <span className="text-xs font-semibold text-foreground">
                          {sess.timetable_slot?.subject?.name || "Subject —"}
                        </span>
                        {sess.timetable_slot?.room && (
                          <CodeChip>{sess.timetable_slot.room}</CodeChip>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-medium text-foreground">
                      {sess.teacher?.name || "—"}
                    </TableCell>
                    <TableCell>
                      {hasSub ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-warning">
                            {sess.actual_teacher?.name}
                          </span>
                          <span className="rounded-[2px] bg-warning/15 px-1 py-0.2 font-mono text-[9px] font-bold uppercase text-warning">
                            SUB
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          As Assigned
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <TelemetryTag
                        status={
                          sess.status === "completed"
                            ? "present"
                            : sess.status === "no_show"
                              ? "late"
                              : sess.status === "cancelled"
                                ? "absent"
                                : "info"
                        }
                      >
                        {(sess.status || "scheduled").toUpperCase()}
                      </TelemetryTag>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() =>
                          router.push(
                            `/attendance?classId=${activeClass?.id}&sessionId=${sess.id}&date=${dateStr}`
                          )
                        }
                        className="gap-1 font-mono text-xs"
                      >
                        <span>Take Roll</span>
                        <ArrowRight className="size-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}

              {filteredSessions.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-8 text-center font-mono text-xs text-muted-foreground"
                  >
                    {!activeClass
                      ? "No cohort selected. Select a level with registered cohorts above."
                      : "No dated sessions found for the active filter. Use \"Generate Sessions\" above to create occurrences."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </DataModule>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* INSPECTOR SHEET: EXISTING SLOT & SUBSTITUTE ASSIGNMENT                 */}
      {/* --------------------------------------------------------------------- */}
      <InspectorSheet
        open={Boolean(inspectedSlot)}
        onOpenChange={(open) => {
          if (!open) setInspectedSlot(null)
        }}
        code={
          inspectedSlot
            ? `${selectedCohortCode} // ${DAYS_CONFIG[inspectedSlot.day_of_week]?.label}`
            : "SLOT"
        }
        title={inspectedSlot?.subject?.name ?? "Timetable Slot"}
        subtitle={
          inspectedSlot
            ? `${inspectedSlot.start_time.slice(0, 5)} – ${inspectedSlot.end_time.slice(0, 5)} · Room ${inspectedSlot.room || "Unassigned"}`
            : ""
        }
        status={
          inspectedSlot
            ? {
                label: hasSubstituteOnInspected ? "SUBSTITUTE ACTIVE" : "REGULAR SCHEDULE",
                tone: hasSubstituteOnInspected ? "late" : "present",
              }
            : undefined
        }
        fields={
          inspectedSlot
            ? [
                { label: "COHORT", value: selectedCohortCode, mono: true },
                {
                  label: "DAY & TIME",
                  value: `${DAYS_CONFIG[inspectedSlot.day_of_week]?.full} (${inspectedSlot.start_time.slice(0, 5)} – ${inspectedSlot.end_time.slice(0, 5)})`,
                  mono: true,
                },
                { label: "ASSIGNED TEACHER", value: inspectedSlot.teacher?.name || "None" },
                { label: "ROOM", value: inspectedSlot.room || "Unassigned", mono: true },
              ]
            : []
        }
        footerActions={
          <div className="flex w-full items-center justify-between gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInspectedSlot(null)}
            >
              Close
            </Button>
            {slotSessions[0] && (
              <Button
                size="sm"
                onClick={() => {
                  const firstDate = toLocalDateString(parseBackendDateTime(slotSessions[0].start_time))
                  router.push(
                    `/attendance?classId=${activeClass?.id}&sessionId=${slotSessions[0].id}&date=${firstDate}`
                  )
                }}
                className="gap-1 font-mono text-xs"
              >
                Take Roll for Latest Occurrence →
              </Button>
            )}
          </div>
        }
      >
        {inspectedSlot && (
          <div className="space-y-4">
            {/* 2-Tab Switcher inside Drawer */}
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
                Occurrences & Substitute
              </button>
              <button
                type="button"
                onClick={() => setDrawerTab("edit")}
                className={cn(
                  "border-b-2 px-3 py-2 font-mono text-[11px] font-semibold uppercase transition-colors",
                  drawerTab === "edit"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                Edit Slot Template
              </button>
            </div>

            {/* TAB: Occurrences & Substitute Override */}
            {drawerTab === "occurrences" && (
              <div className="space-y-4">
                {/* Inline Substitute Teacher Assignment Box */}
                <div className="space-y-2 rounded-sm border border-border bg-muted/20 p-3">
                  <span className="block font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    SUBSTITUTE TEACHER DISPATCH (INLINE OVERRIDE)
                  </span>
                  <p className="text-xs text-muted-foreground">
                    Override the regular teacher on dated occurrences when the assigned teacher is absent or on leave.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <Select
                      value={selectedSubTeacherId}
                      onValueChange={(val) => {
                        if (val != null) setSelectedSubTeacherId(val)
                      }}
                    >
                      <SelectTrigger size="sm" className="h-8 flex-1 rounded-sm bg-background font-mono text-xs">
                        <span className="truncate">
                          {teachers.find((t) => String(t.id) === selectedSubTeacherId)?.name || "Select substitute teacher..."}
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        {teachers.map((t) => (
                          <SelectItem key={t.id} value={String(t.id)} className="font-mono text-xs">
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      disabled={!selectedSubTeacherId || submittingSub || slotSessions.length === 0}
                      onClick={() => {
                        if (slotSessions[0]) {
                          handleAssignSubstitute(slotSessions[0].id, Number(selectedSubTeacherId))
                        }
                      }}
                      className="h-8 shrink-0 rounded-sm font-mono text-xs"
                    >
                      {submittingSub ? "Assigning..." : "Assign Sub"}
                    </Button>
                  </div>
                  {slotSessions[0]?.actual_teacher && slotSessions[0].actual_teacher.id !== slotSessions[0].teacher?.id && (
                    <div className="flex items-center justify-between border-t border-border/70 pt-2 text-xs">
                      <span className="text-warning">
                        Current substitute: <strong>{slotSessions[0].actual_teacher.name}</strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleAssignSubstitute(slotSessions[0].id, null)}
                        disabled={submittingSub}
                        className="font-mono text-[11px] font-semibold text-muted-foreground underline hover:text-foreground"
                      >
                        Revert to {inspectedSlot.teacher?.name}
                      </button>
                    </div>
                  )}
                </div>

                {/* List of Dated Occurrences */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      DATED OCCURRENCES ({slotSessions.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => setGenerateDrawerOpen(true)}
                      className="font-mono text-[10px] font-semibold uppercase text-primary hover:underline"
                    >
                      + Generate More
                    </button>
                  </div>

                  <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                    {slotSessions.map((sess) => {
                      const dateObj = parseBackendDateTime(sess.start_time)
                      const dateStr = toLocalDateString(dateObj)
                      const timeStart = formatBackendTime(sess.start_time)
                      const timeEnd = formatBackendTime(sess.end_time)
                      const hasSub = sess.actual_teacher && sess.actual_teacher.id !== sess.teacher?.id

                      return (
                        <div
                          key={sess.id}
                          className="flex items-center justify-between rounded-sm border border-border bg-card p-2.5 text-xs"
                        >
                          <div>
                            <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-foreground">
                              <span>{dateStr}</span>
                              <span className="text-muted-foreground">·</span>
                              <span className="font-normal text-muted-foreground">
                                {timeStart} – {timeEnd}
                              </span>
                            </div>
                            <div className="mt-0.5 text-[11px] text-muted-foreground">
                              Teacher:{" "}
                              {hasSub ? (
                                <span className="font-medium text-warning">
                                  {sess.actual_teacher?.name} (Sub)
                                </span>
                              ) : (
                                <span>{sess.teacher?.name}</span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <TelemetryTag
                              status={
                                sess.status === "completed"
                                  ? "present"
                                  : sess.status === "no_show"
                                    ? "late"
                                    : "info"
                              }
                            >
                              {(sess.status || "scheduled").toUpperCase()}
                            </TelemetryTag>
                            <Button
                              variant="outline"
                              size="xs"
                              onClick={() => {
                                router.push(
                                  `/attendance?classId=${activeClass?.id}&sessionId=${sess.id}&date=${dateStr}`
                                )
                              }}
                              className="h-6 font-mono text-[10px]"
                            >
                              Take Roll →
                            </Button>
                          </div>
                        </div>
                      )
                    })}

                    {slotSessions.length === 0 && (
                      <div className="rounded-sm border border-dashed border-border p-4 text-center">
                        <p className="font-mono text-xs text-muted-foreground">
                          No dated occurrences found for this slot yet.
                        </p>
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => setGenerateDrawerOpen(true)}
                          disabled={generatingSessions}
                          className="mt-2"
                        >
                          Generate Occurrences Now
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: Edit Slot Template */}
            {drawerTab === "edit" && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Day of Week
                  </label>
                  <Select
                    value={String(editDayOfWeek)}
                    onValueChange={(val) => setEditDayOfWeek(Number(val))}
                  >
                    <SelectTrigger className="h-8 rounded-sm font-mono text-xs">
                      <span className="truncate">
                        {(() => {
                          const d = DAYS_CONFIG.find((item) => item.index === editDayOfWeek)
                          return d ? `${d.full} (${d.label})` : "Select day..."
                        })()}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {DAYS_CONFIG.map((d) => (
                        <SelectItem key={d.index} value={String(d.index)} className="font-mono text-xs">
                          {d.full} ({d.label})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Subject Offering
                  </label>
                  <Select
                    value={editSubjectId}
                    onValueChange={(val) => {
                      if (val != null) setEditSubjectId(val)
                    }}
                  >
                    <SelectTrigger className="h-8 rounded-sm font-mono text-xs">
                      <span className="truncate">
                        {subjects.find((sub) => String(sub.id) === editSubjectId)?.name || "Select subject..."}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((sub) => (
                        <SelectItem key={sub.id} value={String(sub.id)} className="font-mono text-xs">
                          {sub.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Assigned Regular Teacher
                  </label>
                  <Select
                    value={editTeacherId}
                    onValueChange={(val) => {
                      if (val != null) setEditTeacherId(val)
                    }}
                  >
                    <SelectTrigger className="h-8 rounded-sm font-mono text-xs">
                      <span className="truncate">
                        {teachers.find((t) => String(t.id) === editTeacherId)?.name || "Select teacher..."}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {teachers.map((t) => (
                        <SelectItem key={t.id} value={String(t.id)} className="font-mono text-xs">
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Start Time
                    </label>
                    <Input
                      type="time"
                      value={editStartTime}
                      onChange={(e) => setEditStartTime(e.target.value)}
                      className="h-8 rounded-sm font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      End Time
                    </label>
                    <Input
                      type="time"
                      value={editEndTime}
                      onChange={(e) => setEditEndTime(e.target.value)}
                      className="h-8 rounded-sm font-mono text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Classroom / Room Code
                  </label>
                  <Input
                    value={editRoom}
                    onChange={(e) => setEditRoom(e.target.value)}
                    placeholder="e.g. RM-201"
                    className="h-8 rounded-sm font-mono text-xs"
                  />
                </div>

                <div className="flex items-center justify-between border-t border-border pt-3">
                  <Button
                    variant="destructive"
                    size="xs"
                    onClick={() => setDeleteConfirmOpen(true)}
                    className="font-mono text-xs"
                  >
                    <Trash2 className="mr-1 size-3.5" />
                    Delete Slot
                  </Button>
                  <Button
                    size="xs"
                    onClick={handleUpdateSlot}
                    disabled={savingSlot}
                    className="font-mono text-xs"
                  >
                    {savingSlot ? "Saving..." : "Save Template Changes"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </InspectorSheet>

      {/* --------------------------------------------------------------------- */}
      {/* INSPECTOR SHEET: ADD NEW TIMETABLE SLOT                                */}
      {/* --------------------------------------------------------------------- */}
      <InspectorSheet
        open={newSlotDay !== null}
        onOpenChange={(open) => {
          if (!open) setNewSlotDay(null)
        }}
        code={newSlotDay !== null ? `NEW SLOT // ${DAYS_CONFIG[newSlotDay]?.label}` : "NEW"}
        title={`Schedule Slot for ${selectedCohortCode}`}
        subtitle="Enforce flexible education-center hours with exact start and end times"
        fields={[
          { label: "TARGET COHORT", value: selectedCohortCode, mono: true },
          {
            label: "SCHEDULE DAY",
            value: newSlotDay !== null ? DAYS_CONFIG[newSlotDay]?.full : "",
            mono: true,
          },
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
            <Button
              size="sm"
              onClick={handleCreateSlot}
              disabled={creatingSlot || !newSubjectId || !newTeacherId}
              className="gap-1 font-mono text-xs"
            >
              <Check className="size-3.5" />
              {creatingSlot ? "Creating Slot..." : "Create Slot"}
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Day of Week
            </label>
            <Select
              value={newSlotDay !== null ? String(newSlotDay) : "0"}
              onValueChange={(val) => setNewSlotDay(Number(val))}
            >
              <SelectTrigger className="h-8 rounded-sm font-mono text-xs">
                <span className="truncate">
                  {(() => {
                    const d = DAYS_CONFIG.find((item) => item.index === newSlotDay)
                    return d ? `${d.full} (${d.label})` : "Select day..."
                  })()}
                </span>
              </SelectTrigger>
              <SelectContent>
                {DAYS_CONFIG.map((d) => (
                  <SelectItem key={d.index} value={String(d.index)} className="font-mono text-xs">
                    {d.full} ({d.label})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Subject Offering
            </label>
            <Select
              value={newSubjectId}
              onValueChange={(val) => {
                if (val != null) setNewSubjectId(val)
              }}
            >
              <SelectTrigger className="h-8 rounded-sm font-mono text-xs">
                <span className="truncate">
                  {subjects.find((sub) => String(sub.id) === newSubjectId)?.name || "Select subject offering..."}
                </span>
              </SelectTrigger>
              <SelectContent>
                {subjects.map((sub) => (
                  <SelectItem key={sub.id} value={String(sub.id)} className="font-mono text-xs">
                    {sub.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Assigned Teacher
            </label>
            <Select
              value={newTeacherId}
              onValueChange={(val) => {
                if (val != null) setNewTeacherId(val)
              }}
            >
              <SelectTrigger className="h-8 rounded-sm font-mono text-xs">
                <span className="truncate">
                  {teachers.find((t) => String(t.id) === newTeacherId)?.name || "Select assigned teacher..."}
                </span>
              </SelectTrigger>
              <SelectContent>
                {teachers.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)} className="font-mono text-xs">
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Start Time
              </label>
              <Input
                type="time"
                value={newStartTime}
                onChange={(e) => setNewStartTime(e.target.value)}
                className="h-8 rounded-sm font-mono text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                End Time
              </label>
              <Input
                type="time"
                value={newEndTime}
                onChange={(e) => setNewEndTime(e.target.value)}
                className="h-8 rounded-sm font-mono text-xs"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Room / Location Code
            </label>
            <Input
              value={newRoom}
              onChange={(e) => setNewRoom(e.target.value)}
              placeholder="e.g. RM-101"
              className="h-8 rounded-sm font-mono text-xs"
            />
          </div>
        </div>
      </InspectorSheet>

      {/* --------------------------------------------------------------------- */}
      {/* INSPECTOR SHEET: GENERATE SESSIONS WITH DATE RANGE                    */}
      {/* --------------------------------------------------------------------- */}
      <InspectorSheet
        open={generateDrawerOpen}
        onOpenChange={(open) => {
          if (!open) setGenerateDrawerOpen(false)
        }}
        code={`GEN // ${selectedCohortCode}`}
        title="Generate Dated Sessions"
        subtitle={`Instantiate recurring timetable slots into dated session records for ${selectedCohortCode}`}
        fields={[
          { label: "TARGET COHORT", value: selectedCohortCode, mono: true },
          { label: "WEEKLY SLOTS", value: `${slots.length} recurring slots`, mono: true },
        ]}
        footerActions={
          <div className="flex w-full items-center justify-between gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setGenerateDrawerOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmGenerateSessions}
              disabled={generatingSessions || !genStartDate || !genEndDate || !activeClass}
              className="gap-1 font-mono text-xs"
            >
              <Sparkles className="size-3.5" />
              {generatingSessions ? "Generating..." : "Generate Sessions"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Quick Presets
            </label>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="xs"
                className="font-mono text-xs"
                onClick={() => {
                  const today = toLocalDateString()
                  setGenStartDate(today)
                  setGenEndDate(today)
                }}
              >
                Today Only
              </Button>
              <Button
                type="button"
                variant="outline"
                size="xs"
                className="font-mono text-xs"
                onClick={() => {
                  const today = toLocalDateString()
                  const next7 = new Date()
                  next7.setDate(next7.getDate() + 7)
                  setGenStartDate(today)
                  setGenEndDate(toLocalDateString(next7))
                }}
              >
                Next 7 Days
              </Button>
              <Button
                type="button"
                variant="outline"
                size="xs"
                className="font-mono text-xs"
                onClick={() => {
                  const now = new Date()
                  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
                  setGenStartDate(toLocalDateString(startOfMonth))
                  setGenEndDate(toMonthEndDateString(now))
                }}
              >
                This Month
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Start Date
              </label>
              <Input
                type="date"
                value={genStartDate}
                onChange={(e) => setGenStartDate(e.target.value)}
                className="h-8 rounded-sm font-mono text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                End Date
              </label>
              <Input
                type="date"
                value={genEndDate}
                onChange={(e) => setGenEndDate(e.target.value)}
                className="h-8 rounded-sm font-mono text-xs"
              />
            </div>
          </div>

          <div className="rounded-sm border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
            <p>
              Sessions will be generated for all active recurring timetable slots within the selected window. Existing sessions will not be duplicated.
            </p>
          </div>
        </div>
      </InspectorSheet>

      {/* Delete Slot Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        title="Delete Timetable Slot"
        description="Are you sure you want to delete this recurring timetable slot? Existing generated session records will remain unless individually deleted."
        confirmLabel="Delete Slot"
        variant="destructive"
        onConfirm={handleDeleteSlot}
        onCancel={() => setDeleteConfirmOpen(false)}
      />
    </div>
  )
}
