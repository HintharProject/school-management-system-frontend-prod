"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@clerk/nextjs"
import {
  ArrowLeft,
  BookOpen,
  GraduationCap,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Users,
  Calendar,
  ClipboardList,
  RefreshCw,
} from "lucide-react"

import { ApiError, createApi } from "@/lib/api"
import {
  formatClassLabel,
  formatCohortIdentifier,
  formatCourseLabel,
  COHORT_IDENTIFIER_MAX_LENGTH,
  COHORT_SUB_CATEGORY_MAX_LENGTH,
  COHORT_IDENTIFIER_PLACEHOLDER,
  COHORT_SUB_CATEGORY_PLACEHOLDER,
  COHORT_IDENTIFIER_HINT,
  COHORT_SUB_CATEGORY_HINT,
  sanitizeCohortIdentifierInput,
  sanitizeCohortSubCategoryInput,
} from "@/lib/format-class"
import { formatBackendDate, cn } from "@/lib/utils"
import type {
  AnalyticsRange,
  Class,
  ClassAttendanceSummary,
  ClassPayload,
  ClassStudent,
  Course,
  Student,
  Subject,
  Teacher,
  TimetableSlot,
} from "@/lib/types"
import { EDUCATION_LEVELS } from "@/lib/types"

import { RequireRole } from "@/components/require-role"
import { SearchableSelect } from "@/components/searchable-select"
import { HubTimetableCard } from "@/components/hub-timetable-card"
import {
  AttendanceOverviewSkeleton,
  CLASS_DETAIL_PAGE_LAYOUT,
  PageSkeleton,
} from "@/components/page-skeletons"
import { ChartChunkSkeleton } from "@/components/charts/chart-chunk-skeleton"

import {
  SystemHeader,
  DataModule,
  CodeChip,
  TelemetryTag,
  InspectorSheet,
} from "@/components/design-system/v2-primitives"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "@/components/ui/toast"

function formatLevelBadge(level?: string | null): string {
  if (!level) return "COHORT"
  return EDUCATION_LEVELS.find((l) => l.value === level)?.label ?? level
}

function getLevelOptionLabel(val?: string | null): string {
  if (!val) return "Select Level"
  return EDUCATION_LEVELS.find((l) => l.value === val)?.label ?? val
}

const ClassCampusChart = dynamic(
  () =>
    import("@/components/charts/class-attendance-charts").then(
      (m) => m.ClassCampusChart
    ),
  { ssr: false, loading: () => <ChartChunkSkeleton className="h-52" /> }
)
const ClassLessonCharts = dynamic(
  () =>
    import("@/components/charts/class-attendance-charts").then(
      (m) => m.ClassLessonCharts
    ),
  { ssr: false, loading: () => <ChartChunkSkeleton className="h-52" /> }
)

const RANGE_OPTIONS: { value: AnalyticsRange; label: string }[] = [
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "all", label: "All time" },
]
const STATUS_LABELS: Record<string, string> = {
  present: "Present",
  late: "Late",
  absent: "Absent",
  excused: "Excused",
}

function formatPercent(value: number | null | undefined) {
  return value == null ? "—" : `${Math.round(value * 100)}%`
}

function ClassDetailContent() {
  const params = useParams()
  const router = useRouter()
  const { getToken, isLoaded, isSignedIn } = useAuth()
  const classId = Number(params.id)

  const [classItem, setClassItem] = React.useState<Class | null>(null)
  const [roster, setRoster] = React.useState<ClassStudent[]>([])
  const [students, setStudents] = React.useState<Student[]>([])
  const [slots, setSlots] = React.useState<TimetableSlot[]>([])
  const [courses, setCourses] = React.useState<Course[]>([])
  const [summary, setSummary] = React.useState<ClassAttendanceSummary | null>(null)
  const [range, setRange] = React.useState<AnalyticsRange>("month")
  const [selectedSubjectId, setSelectedSubjectId] = React.useState<string>("all")
  const [loading, setLoading] = React.useState(true)
  const [summaryLoading, setSummaryLoading] = React.useState(false)

  // Edit Cohort Modal
  const [editOpen, setEditOpen] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [educationLevel, setEducationLevel] =
    React.useState<ClassPayload["education_level"]>("IAL")
  const [cohort, setCohort] = React.useState("")
  const [subcategory, setSubcategory] = React.useState("")

  // Subject Offerings
  const [allSubjects, setAllSubjects] = React.useState<Subject[]>([])
  const [allTeachers, setAllTeachers] = React.useState<Teacher[]>([])
  const [assignSubjectId, setAssignSubjectId] = React.useState("")
  const [assignTeacherId, setAssignTeacherId] = React.useState("")
  const [assigningCourse, setAssigningCourse] = React.useState(false)
  const [unlinkingCourseId, setUnlinkingCourseId] = React.useState<number | null>(null)

  // Roster Enrollment
  const [studentId, setStudentId] = React.useState("")
  const [enrolling, setEnrolling] = React.useState(false)
  const [removingId, setRemovingId] = React.useState<number | null>(null)
  const [rosterSearch, setRosterSearch] = React.useState("")

  const loadCore = React.useCallback(async () => {
    if (!isSignedIn || !Number.isFinite(classId)) return
    setLoading(true)
    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      const api = createApi(token)
      const [foundClass, rosterPage, studentPage, timetable, courseList, subjectList, teacherList] =
        await Promise.all([
          api.getClass(classId),
          api.listClassStudentsPage({ class_id: classId, page_size: 200 }),
          api.listStudentsPage({ page_size: 200 }),
          api.getClassTimetable(classId),
          api.listCourses({ cohort_id: classId }).catch(() => [] as Course[]),
          api.listSubjects().catch(() => [] as Subject[]),
          api.listTeachers().catch(() => [] as Teacher[]),
        ])
      setClassItem(foundClass)
      setRoster(rosterPage.results)
      setStudents(studentPage.results)
      setSlots(timetable)
      setCourses(courseList ?? [])
      setAllSubjects(subjectList ?? [])
      setAllTeachers(teacherList ?? [])
    } catch (err) {
      toast.add({
        title: "Failed to Load Cohort",
        description:
          err instanceof ApiError
            ? err.userMessage
            : err instanceof Error
              ? err.message
              : "Failed to load cohort",
        type: "error",
      })
    } finally {
      setLoading(false)
    }
  }, [classId, getToken, isSignedIn])

  const loadSummary = React.useCallback(async () => {
    if (!isSignedIn || !Number.isFinite(classId)) return
    setSummaryLoading(true)
    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      const subjectId =
        selectedSubjectId === "all" ? null : Number(selectedSubjectId)
      setSummary(
        await createApi(token).getClassAttendanceSummary(
          classId,
          range,
          subjectId
        )
      )
    } catch (err) {
      toast.add({
        title: "Failed to Load Attendance",
        description:
          err instanceof ApiError
            ? err.userMessage
            : err instanceof Error
              ? err.message
              : "Failed to load attendance",
        type: "error",
      })
    } finally {
      setSummaryLoading(false)
    }
  }, [classId, getToken, isSignedIn, range, selectedSubjectId])

  React.useEffect(() => {
    if (!(isLoaded && isSignedIn)) return
    const timer = window.setTimeout(() => void loadCore(), 0)
    return () => window.clearTimeout(timer)
  }, [isLoaded, isSignedIn, loadCore])

  React.useEffect(() => {
    if (!(isLoaded && isSignedIn && classItem)) return
    const timer = window.setTimeout(() => void loadSummary(), 0)
    return () => window.clearTimeout(timer)
  }, [isLoaded, isSignedIn, classItem, loadSummary])

  const rosterStudents = React.useMemo(() => {
    return roster.map((entry) => {
      const student =
        typeof entry.student === "object"
          ? (entry.student as Student)
          : students.find(
              (item) => item.id === entry.student_id || item.id === entry.student
            )
      return { entry, student }
    })
  }, [roster, students])

  const filteredRoster = React.useMemo(() => {
    if (!rosterSearch.trim()) return rosterStudents
    const q = rosterSearch.toLowerCase().trim()
    return rosterStudents.filter(({ student, entry }) => {
      const name = (student?.name ?? "").toLowerCase()
      const code = (student?.unique_code ?? "").toLowerCase()
      const id = String(entry.student_id ?? "")
      return name.includes(q) || code.includes(q) || id.includes(q)
    })
  }, [rosterStudents, rosterSearch])

  const enrolledIds = React.useMemo(
    () => new Set(rosterStudents.map(({ student }) => student?.id)),
    [rosterStudents]
  )

  const studentOptions = React.useMemo(
    () =>
      students
        .filter(
          (student) =>
            !enrolledIds.has(student.id) &&
            (student.class_ids?.length ?? 0) === 0
        )
        .map((student) => ({
          value: String(student.id),
          label: student.name,
          subLabel: student.unique_code,
        })),
    [enrolledIds, students]
  )

  const campusData = React.useMemo(
    () =>
      summary?.campus.daily.map((day) => ({
        date: formatBackendDate(day.date),
        checked_in: day.checked_in,
      })) ?? [],
    [summary]
  )

  const statusData = React.useMemo(
    () =>
      summary?.lesson.by_status
        .filter((item) => item.count > 0)
        .map((item) => ({
          ...item,
          name: STATUS_LABELS[item.status] ?? item.status,
        })) ?? [],
    [summary]
  )

  const subjectData = React.useMemo(
    () =>
      summary?.lesson.by_subject.map((item) => ({
        name: item.subject_label,
        present: item.present,
        late: item.late,
        absent: item.absent,
        excused: item.excused,
      })) ?? [],
    [summary]
  )

  const offeredCourses = React.useMemo(() => {
    if (!classItem) return []
    if (courses && courses.length > 0) {
      return courses.map((c) => {
        const subjectName = c.subject?.name ?? "Subject"
        const subjectId = c.subject?.id ?? c.subject_id ?? 0
        return {
          courseId: c.id,
          subjectId,
          subjectName,
          teacherName: c.default_teacher?.name ?? null,
          label: formatCourseLabel(classItem, subjectName),
        }
      })
    }
    // Fallback: unique subjects in slots
    const map = new Map<
      number,
      { subjectId: number; subjectName: string; teacherName?: string | null }
    >()
    for (const slot of slots) {
      if (slot.subject && !map.has(slot.subject.id)) {
        map.set(slot.subject.id, {
          subjectId: slot.subject.id,
          subjectName: slot.subject.name,
          teacherName: slot.teacher?.name ?? null,
        })
      }
    }
    return Array.from(map.values()).map((item) => ({
      courseId: undefined,
      subjectId: item.subjectId,
      subjectName: item.subjectName,
      teacherName: item.teacherName,
      label: formatCourseLabel(classItem, item.subjectName),
    }))
  }, [classItem, courses, slots])

  const openEdit = () => {
    if (!classItem) return
    setEducationLevel(classItem.education_level)
    setCohort(classItem.cohort_identifier)
    setSubcategory(classItem.cohort_sub_category ?? "")
    setEditOpen(true)
  }

  const saveClass = async () => {
    if (!classItem || !cohort.trim()) return
    setSaving(true)
    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      const updated = await createApi(token).updateClass(classItem.id, {
        education_level: educationLevel,
        cohort_identifier: cohort.trim(),
        cohort_sub_category: subcategory.trim() || null,
      })
      setClassItem(updated)
      toast.add({
        title: "Cohort Updated",
        description: `Cohort "${formatCohortIdentifier(updated)}" updated successfully.`,
        type: "success",
      })
      setEditOpen(false)
    } catch (err) {
      toast.add({
        title: "Update Failed",
        description:
          err instanceof ApiError ? err.userMessage : "Failed to update cohort",
        type: "error",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleAssignCourse = async () => {
    if (!classItem || !assignSubjectId) return
    setAssigningCourse(true)
    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      const created = await createApi(token).createCourse({
        class_obj_id: classItem.id,
        subject_id: Number(assignSubjectId),
        default_teacher_id: assignTeacherId ? Number(assignTeacherId) : undefined,
      })
      setCourses((prev) => [...prev, created])
      setAssignSubjectId("")
      setAssignTeacherId("")
      toast.add({
        title: "Subject Assigned",
        description: "Subject offering assigned to cohort curriculum.",
        type: "success",
      })
    } catch (err) {
      toast.add({
        title: "Assignment Failed",
        description:
          err instanceof ApiError ? err.userMessage : "Failed to assign subject",
        type: "error",
      })
    } finally {
      setAssigningCourse(false)
    }
  }

  const handleUnlinkCourse = async (courseId?: number) => {
    if (!courseId) return
    setUnlinkingCourseId(courseId)
    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      await createApi(token).deleteCourse(courseId)
      setCourses((prev) => prev.filter((c) => c.id !== courseId))
      toast.add({
        title: "Subject Unlinked",
        description: "Offering removed from cohort curriculum.",
        type: "success",
      })
    } catch (err) {
      toast.add({
        title: "Unlink Failed",
        description:
          err instanceof ApiError ? err.userMessage : "Failed to unlink subject",
        type: "error",
      })
    } finally {
      setUnlinkingCourseId(null)
    }
  }

  const enroll = async () => {
    if (!studentId || !classItem) return
    setEnrolling(true)
    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      const sid = Number(studentId)
      const enrollment = await createApi(token).createClassStudent(
        classItem.id,
        sid
      )
      setRoster((items) => [...items, enrollment])
      setStudents((items) =>
        items.map((s) =>
          s.id === sid ? { ...s, class_ids: [classItem.id] } : s
        )
      )
      const enrolledStudent = students.find((s) => s.id === sid)
      setStudentId("")
      toast.add({
        title: "Student Enrolled",
        description: `${enrolledStudent?.name ?? "Student"} added to roster.`,
        type: "success",
      })
    } catch (err) {
      toast.add({
        title: "Enrollment Failed",
        description:
          err instanceof ApiError ? err.userMessage : "Failed to enroll student",
        type: "error",
      })
    } finally {
      setEnrolling(false)
    }
  }

  const remove = async (id: number) => {
    setRemovingId(id)
    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      const removedEntry = roster.find((item) => item.id === id)
      const removedStudentId =
        typeof removedEntry?.student === "object" && removedEntry.student
          ? removedEntry.student.id
          : removedEntry?.student_id
      await createApi(token).deleteClassStudent(id)
      setRoster((items) => items.filter((item) => item.id !== id))
      if (removedStudentId) {
        setStudents((items) =>
          items.map((s) =>
            s.id === removedStudentId ? { ...s, class_ids: [] } : s
          )
        )
      }
      toast.add({
        title: "Student Unenrolled",
        description: "Student removed from cohort roster.",
        type: "success",
      })
    } catch (err) {
      toast.add({
        title: "Unenrollment Failed",
        description:
          err instanceof ApiError ? err.userMessage : "Failed to remove student",
        type: "error",
      })
    } finally {
      setRemovingId(null)
    }
  }

  if (!isLoaded) {
    return (
      <div className="space-y-4">
        <div className="h-28 rounded-sm border border-border bg-card p-4 animate-pulse" />
        <div className="h-96 rounded-sm border border-border bg-card animate-pulse" />
      </div>
    )
  }

  if (!isSignedIn) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center rounded-sm border border-border bg-card p-8">
        <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
          Please sign in to view cohort details.
        </p>
      </div>
    )
  }

  if (!Number.isFinite(classId)) {
    return (
      <div className="rounded-sm border border-border bg-card p-8 text-center font-mono text-xs text-muted-foreground">
        Invalid cohort identifier.
      </div>
    )
  }

  if (loading) {
    return <PageSkeleton blocks={CLASS_DETAIL_PAGE_LAYOUT} />
  }

  if (!classItem) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-sm border border-border bg-card p-8">
        <GraduationCap className="size-8 text-muted-foreground" />
        <p className="font-mono text-xs uppercase text-foreground">
          Cohort not found
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/classes")}
          className="rounded-sm font-mono text-xs"
        >
          Back to Academics Hub
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 1. Tactical v2 SystemHeader */}
      <SystemHeader
        domain="ACADEMICS"
        breadcrumb={[
          {
            label: "COHORTS",
            onClick: () => router.push("/classes"),
          },
          {
            label: formatCohortIdentifier(classItem),
          },
        ]}
        title={formatClassLabel(classItem)}
        description={`Education Level: ${classItem.education_level} · Cohort Identifier ${formatCohortIdentifier(classItem)}`}
        metrics={[
          {
            label: "LEVEL",
            value: classItem.education_level,
          },
          {
            label: "ENROLLED",
            value: roster.length,
          },
          {
            label: "COURSES",
            value: offeredCourses.length,
          },
          {
            label: "WEEKLY SLOTS",
            value: slots.length,
          },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={openEdit}
              className="h-8 gap-1.5 rounded-sm px-3 font-mono text-xs uppercase"
            >
              <Pencil className="size-3.5" />
              Edit Cohort
            </Button>
            <Button
              size="sm"
              onClick={() => router.push(`/attendance?classId=${classItem.id}`)}
              className="h-8 gap-1.5 rounded-sm px-3 font-mono text-xs font-semibold uppercase"
            >
              <ClipboardList className="size-3.5" />
              Take Roll
            </Button>
          </div>
        }
      />

      {/* 2. Courses Offered / Subject Offerings DataModule */}
      <DataModule
        totalCount={offeredCourses.length}
        countLabel="COURSES"
        toolbarRight={
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground uppercase">
              {offeredCourses.length} ACTIVE SUBJECT OFFERINGS
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void loadCore()}
              disabled={loading}
              className="h-8 gap-1.5 rounded-sm font-mono text-xs uppercase"
            >
              <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
              Refresh
            </Button>
          </div>
        }
      >
        <div className="p-3 border-b border-border bg-muted/20">
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <Select
              value={assignSubjectId}
              onValueChange={(val) => setAssignSubjectId(val ?? "")}
            >
              <SelectTrigger className="h-8 w-full sm:w-[240px] justify-between rounded-sm font-mono text-xs">
                <span className="truncate">
                  {assignSubjectId
                    ? (() => {
                        const s = allSubjects.find(
                          (sub) => String(sub.id) === assignSubjectId
                        )
                        return s
                          ? `SUB-${String(s.id).padStart(2, "0")} — ${s.name}`
                          : assignSubjectId
                      })()
                    : "Select Subject to Offer..."}
                </span>
              </SelectTrigger>
              <SelectContent>
                {allSubjects.map((s) => (
                  <SelectItem
                    key={s.id}
                    value={String(s.id)}
                    className="font-mono text-xs"
                  >
                    SUB-{String(s.id).padStart(2, "0")} — {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <SearchableSelect
              className="flex-1 w-full"
              triggerClassName="h-8 rounded-sm font-mono text-xs"
              options={allTeachers.map((t) => ({
                value: String(t.id),
                label: t.name,
                subLabel: t.unique_code,
              }))}
              value={assignTeacherId}
              onValueChange={setAssignTeacherId}
              placeholder="Assigned Faculty (Optional)..."
              searchPlaceholder="Search faculty members..."
            />

            <Button
              disabled={!assignSubjectId || assigningCourse}
              onClick={() => void handleAssignCourse()}
              size="sm"
              className="h-8 gap-1.5 rounded-sm font-mono text-xs font-semibold shrink-0 uppercase"
            >
              {assigningCourse ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Plus className="size-3.5" />
              )}
              Assign Subject
            </Button>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="h-9 bg-muted/30 hover:bg-muted/30">
              <TableHead className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Cohort Code
              </TableHead>
              <TableHead className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Course Label
              </TableHead>
              <TableHead className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Subject
              </TableHead>
              <TableHead className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Assigned Teacher
              </TableHead>
              <TableHead className="text-right font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Action
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {offeredCourses.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 text-center font-mono text-xs text-muted-foreground"
                >
                  No courses or timetable slots scheduled for this cohort yet.
                </TableCell>
              </TableRow>
            ) : (
              offeredCourses.map((c) => (
                <TableRow
                  key={`${c.courseId ?? "course"}-${c.subjectId}`}
                  className="h-10 hover:bg-muted/40"
                >
                  <TableCell>
                    <CodeChip accent>{formatCohortIdentifier(classItem)}</CodeChip>
                  </TableCell>
                  <TableCell className="text-sm font-medium text-foreground">
                    {c.label}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {c.subjectName}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-foreground">
                    {c.teacherName ?? "Unassigned"}
                  </TableCell>
                  <TableCell className="text-right">
                    {c.courseId ? (
                      <Button
                        variant="ghost"
                        size="xs"
                        className="h-7 rounded-sm text-destructive hover:text-destructive font-mono text-[11px]"
                        disabled={unlinkingCourseId === c.courseId}
                        onClick={() => void handleUnlinkCourse(c.courseId)}
                        title="Unlink subject offering from cohort"
                      >
                        {unlinkingCourseId === c.courseId ? (
                          <Loader2 className="size-3 animate-spin mr-1" />
                        ) : (
                          <Trash2 className="size-3 mr-1" />
                        )}
                        Unlink
                      </Button>
                    ) : (
                      <span className="font-mono text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </DataModule>

      {/* 3. Timetable Week Snippet */}
      <HubTimetableCard
        slots={slots}
        description="Snippet of this cohort's weekly class schedule. Use the full timetable editor to configure slots."
        editorHref={`/timetable?classId=${classItem.id}`}
        slotLine="teacher"
      />

      {/* 4. Student Roster Management DataModule */}
      <DataModule
        searchPlaceholder="Filter enrolled students by name or code..."
        searchValue={rosterSearch}
        onSearchChange={setRosterSearch}
        totalCount={filteredRoster.length}
        countLabel="STUDENTS"
        toolbarRight={
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground uppercase">
              {roster.length} TOTAL ENROLLED
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void loadCore()}
              disabled={loading}
              className="h-8 gap-1.5 rounded-sm font-mono text-xs uppercase"
            >
              <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
              Refresh
            </Button>
          </div>
        }
      >
        <div className="p-3 border-b border-border bg-muted/20">
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <SearchableSelect
              className="flex-1 w-full"
              triggerClassName="h-8 rounded-sm font-mono text-xs"
              options={studentOptions}
              value={studentId}
              onValueChange={setStudentId}
              placeholder="Select student to enroll into cohort..."
              searchPlaceholder="Search available students..."
            />
            <Button
              disabled={!studentId || enrolling}
              onClick={() => void enroll()}
              size="sm"
              className="h-8 gap-1.5 rounded-sm font-mono text-xs font-semibold shrink-0 uppercase"
            >
              {enrolling ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Plus className="size-3.5" />
              )}
              Enroll Student
            </Button>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="h-9 bg-muted/30 hover:bg-muted/30">
              <TableHead className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Student Name
              </TableHead>
              <TableHead className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Unique Code
              </TableHead>
              <TableHead className="text-right font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Action
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRoster.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="h-24 text-center font-mono text-xs text-muted-foreground"
                >
                  {roster.length === 0
                    ? "No students enrolled in this cohort roster yet."
                    : "No students match your filter."}
                </TableCell>
              </TableRow>
            ) : (
              filteredRoster.map(({ entry, student }) => (
                <TableRow key={entry.id} className="h-10 hover:bg-muted/40">
                  <TableCell>
                    <Link
                      href={
                        student
                          ? `/students/${student.id}/`
                          : "/students/"
                      }
                      className="font-medium text-foreground hover:underline"
                    >
                      {student?.name ?? `Student #${entry.student_id ?? "?"}`}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {student?.unique_code ? (
                      <CodeChip>{student.unique_code}</CodeChip>
                    ) : (
                      <span className="font-mono text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="xs"
                      className="h-7 rounded-sm text-destructive hover:text-destructive font-mono text-[11px]"
                      disabled={removingId === entry.id}
                      onClick={() => void remove(entry.id)}
                    >
                      {removingId === entry.id ? (
                        <Loader2 className="size-3 animate-spin mr-1" />
                      ) : (
                        <Trash2 className="size-3 mr-1" />
                      )}
                      Unenroll
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </DataModule>

      {/* 5. Attendance Overview Card */}
      <div className="rounded-sm border border-border bg-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/25 px-4 py-3">
          <div>
            <div className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">
              ATTENDANCE TELEMETRY OVERVIEW
            </div>
            <p className="font-mono text-[11px] text-muted-foreground">
              Campus check-ins and lesson roll aggregated across the cohort.
              {summary && (
                <span className="ml-1 text-foreground">
                  ({summary.date_from} → {summary.date_to})
                </span>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={selectedSubjectId}
              onValueChange={(val) => setSelectedSubjectId(val ?? "all")}
              disabled={summaryLoading}
            >
              <SelectTrigger className="h-7 w-[200px] justify-between rounded-sm font-mono text-xs font-medium">
                <span className="truncate">
                  {selectedSubjectId === "all"
                    ? "All Courses in Cohort"
                    : (offeredCourses.find(
                        (c) => String(c.subjectId) === selectedSubjectId
                      )?.label ?? "Course Filter")}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="font-mono text-xs">
                  All Courses in Cohort
                </SelectItem>
                {offeredCourses.map((c) => (
                  <SelectItem
                    key={c.subjectId}
                    value={String(c.subjectId)}
                    className="font-mono text-xs"
                  >
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Tabs
              value={range}
              onValueChange={(value) => setRange(value as AnalyticsRange)}
            >
              <TabsList className="h-7 rounded-sm p-0.5">
                {RANGE_OPTIONS.map((option) => (
                  <TabsTrigger
                    key={option.value}
                    value={option.value}
                    disabled={summaryLoading}
                    className="h-6 rounded-[2px] px-2 font-mono text-[11px]"
                  >
                    {option.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </div>

        <div className="p-4">
          {summaryLoading ? (
            <AttendanceOverviewSkeleton />
          ) : !summary ? (
            <div className="p-8 text-center font-mono text-xs text-muted-foreground">
              No attendance data available for the selected period.
            </div>
          ) : (
            <div className="grid gap-6 xl:grid-cols-2">
              <section className="space-y-3">
                <div className="font-mono text-xs font-semibold uppercase text-muted-foreground">
                  Campus Check-in Roll
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-sm border border-border bg-muted/20 p-3">
                    <p className="font-mono text-2xl font-bold tabular-nums text-foreground">
                      {summary.campus.check_ins}
                    </p>
                    <p className="font-mono text-[10px] uppercase text-muted-foreground">
                      Check-ins
                    </p>
                  </div>
                  <div className="rounded-sm border border-border bg-muted/20 p-3">
                    <p className="font-mono text-2xl font-bold tabular-nums text-foreground">
                      {formatPercent(summary.campus.rate)}
                    </p>
                    <p className="font-mono text-[10px] uppercase text-muted-foreground">
                      Attendance Rate
                    </p>
                  </div>
                </div>
                <ClassCampusChart data={campusData} />
              </section>

              <section className="space-y-3">
                <div className="font-mono text-xs font-semibold uppercase text-muted-foreground">
                  Lesson Session Roll
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {(["present", "late", "absent", "excused"] as const).map(
                    (key) => (
                      <div
                        key={key}
                        className="rounded-sm border border-border bg-muted/20 p-2.5 text-center"
                      >
                        <p className="font-mono text-lg font-bold tabular-nums text-foreground">
                          {summary.lesson[key]}
                        </p>
                        <p className="font-mono text-[10px] uppercase text-muted-foreground">
                          {STATUS_LABELS[key]}
                        </p>
                      </div>
                    )
                  )}
                </div>
                <ClassLessonCharts
                  statusData={statusData}
                  subjectData={subjectData}
                />
              </section>
            </div>
          )}
        </div>
      </div>

      {/* 6. Slide-Over Edit Cohort InspectorSheet */}
      <InspectorSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        code={formatCohortIdentifier(classItem)}
        title={`Edit ${formatCohortIdentifier(classItem)}`}
        subtitle="Update education level, stream identifier, and sub-category"
        status={{
          label: formatLevelBadge(classItem.education_level),
          variant: "neutral",
        }}
        fields={[
          { label: "COHORT ID", value: `#${classItem.id}`, mono: true },
          { label: "ENROLLED STUDENTS", value: String(roster.length), mono: true },
          { label: "ASSIGNED SUBJECTS", value: String(offeredCourses.length), mono: true },
        ]}
        footerActions={
          <div className="flex w-full items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditOpen(false)}
              disabled={saving}
              className="h-8 rounded-sm font-mono text-xs uppercase"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={saving || !cohort.trim()}
              onClick={() => void saveClass()}
              className="h-8 gap-1.5 rounded-sm font-mono text-xs font-semibold uppercase"
            >
              {saving && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
              Save Changes
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block font-mono text-xs font-semibold uppercase text-muted-foreground">
              Education Level <span className="text-destructive">*</span>
            </label>
            <Select
              value={educationLevel}
              onValueChange={(value) =>
                setEducationLevel(value as ClassPayload["education_level"])
              }
            >
              <SelectTrigger className="h-8 w-full justify-between rounded-sm font-mono text-xs">
                <span className="truncate">
                  {getLevelOptionLabel(educationLevel)}
                </span>
              </SelectTrigger>
              <SelectContent>
                {EDUCATION_LEVELS.map((level) => (
                  <SelectItem
                    key={level.value}
                    value={level.value}
                    className="font-mono text-xs"
                  >
                    {level.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label
              className="mb-1.5 block font-mono text-xs font-semibold uppercase text-muted-foreground"
              htmlFor="cohort"
            >
              Cohort Stream (Single Letter Only) <span className="text-destructive">*</span>
            </label>
            <Input
              id="cohort"
              value={cohort}
              onChange={(event) =>
                setCohort(
                  sanitizeCohortIdentifierInput(event.target.value)
                )
              }
              maxLength={COHORT_IDENTIFIER_MAX_LENGTH}
              placeholder={COHORT_IDENTIFIER_PLACEHOLDER}
              className="h-8 rounded-sm font-mono text-xs"
              required
            />
            <p className="mt-1 font-mono text-[11px] text-muted-foreground">
              {COHORT_IDENTIFIER_HINT}
            </p>
          </div>

          <div>
            <label
              className="mb-1.5 block font-mono text-xs font-semibold uppercase text-muted-foreground"
              htmlFor="subcategory"
            >
              Sub-Cohort Category (Optional Number)
            </label>
            <Input
              id="subcategory"
              value={subcategory}
              onChange={(event) =>
                setSubcategory(
                  sanitizeCohortSubCategoryInput(event.target.value)
                )
              }
              maxLength={COHORT_SUB_CATEGORY_MAX_LENGTH}
              placeholder={COHORT_SUB_CATEGORY_PLACEHOLDER}
              className="h-8 rounded-sm font-mono text-xs"
            />
            <p className="mt-1 font-mono text-[11px] text-muted-foreground">
              {COHORT_SUB_CATEGORY_HINT}
            </p>
          </div>

          <div className="flex items-center justify-between rounded-sm border border-border bg-muted/40 p-3">
            <span className="font-mono text-xs uppercase text-muted-foreground">
              Resulting Identifier:
            </span>
            <CodeChip accent>
              {formatCohortIdentifier({
                education_level: educationLevel,
                cohort_identifier: cohort.trim() || "?",
                cohort_sub_category: subcategory.trim() || null,
              })}
            </CodeChip>
          </div>
        </div>
      </InspectorSheet>
    </div>
  )
}

export default function ClassDetailPage() {
  return (
    <RequireRole mode="staff">
      <ClassDetailContent />
    </RequireRole>
  )
}
