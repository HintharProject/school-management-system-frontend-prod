"use client"

import * as React from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@clerk/nextjs"
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  GraduationCap,
  Loader2,
  Monitor,
  Pencil,
  Plus,
  RefreshCw,
  ShieldCheck,
  ShieldOff,
  Trash2,
  User,
} from "lucide-react"
import { createApi, ApiError } from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import { useClassesQuery } from "@/hooks/use-api-queries"
import { formatClassLabel, formatCohortIdentifier, formatCourseLabel } from "@/lib/format-class"
import {
  SCHOOL_CODES,
  type Class,
  type ClassStudent,
  type Student,
  type StudentAnalyticsRange,
  type StudentAttendanceSummary,
  type StudentPayload,
  type StudentSubjectEnrollment,
  type TimetableConflictItem,
  type TimetableSlot,
} from "@/lib/types"
import { cn } from "@/lib/utils"
import { isStaffOrAbove } from "@/lib/roles"
import { RequireRole } from "@/components/require-role"
import { useCurrentUser } from "@/components/current-user-provider"
import { SearchableSelect } from "@/components/searchable-select"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { PageSkeleton, STUDENT_DETAIL_PAGE_LAYOUT } from "@/components/page-skeletons"
import { StaggerContainer, StaggerItem } from "@/components/animated-stagger"
import {
  StudentAttendanceOverview,
  StudentClassLabelsCard,
  StudentIdentityCard,
  StudentQrCard,
} from "@/components/students/student-record"
import { HubTimetableCard } from "@/components/hub-timetable-card"

interface CohortCourseItem {
  id: number
  name: string
}

async function loadCohortCourses(
  api: ReturnType<typeof createApi>,
  classIds: number[]
): Promise<Map<number, CohortCourseItem[]>> {
  const result = new Map<number, CohortCourseItem[]>()
  if (classIds.length === 0) return result

  await Promise.all(
    classIds.map(async (cid) => {
      const [coursesList, timetableList] = await Promise.all([
        api.listCourses({ cohort_id: cid }).catch(() => []),
        api.getClassTimetable(cid).catch(() => []),
      ])
      const subjectsMap = new Map<number, string>()
      const courses = Array.isArray(coursesList) ? coursesList : (coursesList as any)?.results ?? []
      for (const c of courses) {
        if (c.subject && c.subject.id) {
          subjectsMap.set(c.subject.id, c.subject.name)
        }
      }
      for (const s of timetableList) {
        if (s.subject && s.subject.id) {
          subjectsMap.set(s.subject.id, s.subject.name)
        }
      }
      result.set(
        cid,
        Array.from(subjectsMap.entries()).map(([id, name]) => ({ id, name }))
      )
    })
  )
  return result
}

function StudentDetailContent() {
  const params = useParams()
  const router = useRouter()
  const { getToken, isLoaded, isSignedIn } = useAuth()
  const { user: me, role } = useCurrentUser()
  const studentId = Number(params.id)
  const isStaff = isStaffOrAbove(role)
  const isOwner = role === "student" && me?.student_profile_id === studentId

  const classesQuery = useClassesQuery(!!isLoaded && !!isSignedIn && isStaff)
  const allClasses = classesQuery.data ?? []

  const [student, setStudent] = React.useState<Student | null>(null)
  const [enrollments, setEnrollments] = React.useState<ClassStudent[]>([])
  const [rawSubjectEnrollments, setRawSubjectEnrollments] = React.useState<StudentSubjectEnrollment[]>([])
  const [slots, setSlots] = React.useState<TimetableSlot[]>([])
  const [conflicts, setConflicts] = React.useState<TimetableConflictItem[]>([])
  const [conflictingSlotIds, setConflictingSlotIds] = React.useState<number[]>([])
  const [conflictingCourseKeys, setConflictingCourseKeys] = React.useState<Set<string>>(new Set())
  const [primaryCohortCourses, setPrimaryCohortCourses] = React.useState<Map<number, CohortCourseItem[]>>(new Map())
  const [summary, setSummary] = React.useState<StudentAttendanceSummary | null>(null)
  const [range, setRange] = React.useState<StudentAnalyticsRange>("month")

  const [loading, setLoading] = React.useState(true)
  const [summaryLoading, setSummaryLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState<string | null>(null)

  const [editOpen, setEditOpen] = React.useState(false)
  const [editSaving, setEditSaving] = React.useState(false)
  const [formName, setFormName] = React.useState("")
  const [formDob, setFormDob] = React.useState("")
  const [formContact, setFormContact] = React.useState("")
  const [formSchool, setFormSchool] = React.useState("")
  const [formUci, setFormUci] = React.useState("")

  const [enrollClassId, setEnrollClassId] = React.useState("")
  const [enrolling, setEnrolling] = React.useState(false)
  const [unenrollingId, setUnenrollingId] = React.useState<number | null>(null)

  // Primary cohort course drop/restore action state
  const [courseActionBusy, setCourseActionBusy] = React.useState<string | null>(null)

  // Course Enrollments (Other Cohorts) UI state
  const [crossClassId, setCrossClassId] = React.useState("")
  const [crossSubjectId, setCrossSubjectId] = React.useState("")
  const [crossAvailableSubjects, setCrossAvailableSubjects] = React.useState<{ value: string; label: string }[]>([])
  const [loadingSubjectsForClass, setLoadingSubjectsForClass] = React.useState(false)
  const [crossEnrolling, setCrossEnrolling] = React.useState(false)
  const [removingCrossId, setRemovingCrossId] = React.useState<string | null>(null)

  // Pre-enrollment conflict preview state
  const [previewConflicts, setPreviewConflicts] = React.useState<TimetableConflictItem[]>([])
  const [checkingConflicts, setCheckingConflicts] = React.useState(false)

  const [qrLoading, setQrLoading] = React.useState(false)
  const [tokenLoading, setTokenLoading] = React.useState(false)

  const flashSuccess = React.useCallback((msg: string) => {
    setSuccess(msg)
    window.setTimeout(() => setSuccess(null), 3500)
  }, [])

  const applyTimetableConflicts = React.useCallback(
    (ttRes: import("@/lib/types").StudentTimetableConflictsResponse | null) => {
      if (ttRes) {
        setSlots(ttRes.slots ?? [])
        setConflicts(ttRes.conflicts ?? [])
        setConflictingSlotIds(ttRes.conflicting_slot_ids ?? [])
        setConflictingCourseKeys(new Set(ttRes.conflicting_course_keys ?? []))
      }
    },
    []
  )

  const loadCore = React.useCallback(async () => {
    if (!isSignedIn || !Number.isFinite(studentId)) return
    setLoading(true)
    setError(null)
    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      const api = createApi(token)
      if (isStaff) {
        const [studentRes, enrollmentRes, crossRes, ttRes] = await Promise.all([
          api.getStudent(studentId),
          api.listClassStudentsPage({ student_id: studentId, page_size: 200 }),
          api.listStudentSubjectEnrollmentsPage({ student_id: studentId, page_size: 200 }).catch(() => ({ results: [] })),
          api.getStudentTimetableAndConflicts(studentId).catch(() => null),
        ])
        setStudent(studentRes)
        setEnrollments(enrollmentRes.results)
        setRawSubjectEnrollments(crossRes.results)

        if (ttRes) {
          applyTimetableConflicts(ttRes)
        } else {
          setSlots([])
          setConflicts([])
          setConflictingSlotIds([])
          setConflictingCourseKeys(new Set())
        }

        const classIds = [
          ...new Set(
            enrollmentRes.results
              .map((entry) =>
                typeof entry.class_obj === "object" && entry.class_obj
                  ? entry.class_obj.id
                  : entry.class_obj_id ?? 0
              )
              .filter((id) => id > 0)
          ),
        ]
        const cohortMap = await loadCohortCourses(api, classIds)
        setPrimaryCohortCourses(cohortMap)
      } else {
        const [studentRes, crossRes, ttRes] = await Promise.all([
          api.getStudent(studentId),
          api.listStudentSubjectEnrollmentsPage({ student_id: studentId, page_size: 200 }).catch(() => ({ results: [] })),
          api.getStudentTimetableAndConflicts(studentId).catch(() => null),
        ])
        setStudent(studentRes)
        setEnrollments([])
        setRawSubjectEnrollments(crossRes.results)

        if (ttRes) {
          applyTimetableConflicts(ttRes)
        } else {
          setSlots([])
          setConflicts([])
          setConflictingSlotIds([])
          setConflictingCourseKeys(new Set())
        }
      }
    } catch (err) {
      if (err instanceof ApiError) setError(err.userMessage)
      else setError(err instanceof Error ? err.message : "Failed to load student")
    } finally {
      setLoading(false)
    }
  }, [getToken, isSignedIn, studentId, isStaff, applyTimetableConflicts])

  const loadSummary = React.useCallback(async () => {
    if (!isSignedIn || !Number.isFinite(studentId)) return
    setSummaryLoading(true)
    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      const data = await createApi(token).getStudentAttendanceSummary(studentId, range)
      setSummary(data)
    } catch (err) {
      if (err instanceof ApiError) setError(err.userMessage)
      else setError(err instanceof Error ? err.message : "Failed to load analytics")
    } finally {
      setSummaryLoading(false)
    }
  }, [getToken, isSignedIn, studentId, range])

  React.useEffect(() => {
    if (isLoaded && isSignedIn) void loadCore()
  }, [isLoaded, isSignedIn, loadCore])

  React.useEffect(() => {
    if (isLoaded && isSignedIn && student) void loadSummary()
  }, [isLoaded, isSignedIn, student, loadSummary])

  const openEdit = () => {
    if (!student) return
    setFormName(student.name)
    setFormDob(student.dob ?? "")
    setFormContact(student.contact ?? "")
    setFormSchool(student.school_code)
    setFormUci(student.exam_candidate_number ?? "")
    setEditOpen(true)
  }

  const saveProfile = async () => {
    if (!student) return
    setEditSaving(true)
    setError(null)
    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      const payload: StudentPayload = {
        name: formName.trim(),
        school_code: formSchool,
        dob: formDob || null,
        contact: formContact.trim() || null,
        exam_candidate_number: formUci.trim() || null,
      }
      const updated = await createApi(token).updateStudent(student.id, payload)
      setStudent(updated)
      setEditOpen(false)
      flashSuccess("Profile updated.")
    } catch (err) {
      if (err instanceof ApiError) setError(err.userMessage)
      else setError(err instanceof Error ? err.message : "Failed to update profile")
    } finally {
      setEditSaving(false)
    }
  }

  const handleEnroll = async () => {
    if (!student || !enrollClassId) return
    setEnrolling(true)
    setError(null)
    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      const api = createApi(token)
      const newClassId = Number(enrollClassId)
      const entry =
        enrollments.length > 0
          ? await api.updateClassStudent(enrollments[0].id, newClassId)
          : await api.createClassStudent(newClassId, student.id)
      setEnrollments([entry])
      setEnrollClassId("")

      const [ttRes, newCohortMap] = await Promise.all([
        api.getStudentTimetableAndConflicts(student.id).catch(() => null),
        loadCohortCourses(api, [newClassId]),
      ])
      applyTimetableConflicts(ttRes)
      setPrimaryCohortCourses(newCohortMap)

      flashSuccess("Assigned primary cohort.")
    } catch (err) {
      if (err instanceof ApiError) setError(err.userMessage)
      else setError(err instanceof Error ? err.message : "Failed to assign primary cohort")
    } finally {
      setEnrolling(false)
    }
  }

  const handleUnenroll = async (classStudentId: number) => {
    if (!student) return
    setUnenrollingId(classStudentId)
    setError(null)
    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      const api = createApi(token)
      await api.deleteClassStudent(classStudentId)
      const removed = enrollments.find((e) => e.id === classStudentId)
      const removedClassId =
        typeof removed?.class_obj === "object" && removed.class_obj
          ? removed.class_obj.id
          : removed?.class_obj_id
      setEnrollments((prev) => prev.filter((e) => e.id !== classStudentId))
      if (removedClassId) {
        setPrimaryCohortCourses((prev) => {
          const updated = new Map(prev)
          updated.delete(removedClassId)
          return updated
        })
      }
      const ttRes = await api.getStudentTimetableAndConflicts(student.id).catch(() => null)
      applyTimetableConflicts(ttRes)
      flashSuccess("Removed from primary cohort.")
    } catch (err) {
      if (err instanceof ApiError) setError(err.userMessage)
      else setError(err instanceof Error ? err.message : "Failed to unenroll")
    } finally {
      setUnenrollingId(null)
    }
  }

  const handleDropPrimaryCourse = async (classId: number, subjectId: number, actionKey: string) => {
    if (!student) return
    setCourseActionBusy(actionKey)
    setError(null)
    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      const api = createApi(token)
      await api.createStudentSubjectEnrollment(classId, student.id, subjectId, "dropped")
      const [crossRes, ttRes] = await Promise.all([
        api.listStudentSubjectEnrollmentsPage({ student_id: student.id, page_size: 200 }),
        api.getStudentTimetableAndConflicts(student.id).catch(() => null),
      ])
      setRawSubjectEnrollments(crossRes.results)
      applyTimetableConflicts(ttRes)
      flashSuccess("Course dropped from primary cohort.")
    } catch (err) {
      if (err instanceof ApiError) setError(err.userMessage)
      else setError(err instanceof Error ? err.message : "Failed to drop course")
    } finally {
      setCourseActionBusy(null)
    }
  }

  const handleRestorePrimaryCourse = async (enrollmentId: number, actionKey: string) => {
    if (!student) return
    setCourseActionBusy(actionKey)
    setError(null)
    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      const api = createApi(token)
      await api.deleteStudentSubjectEnrollment(enrollmentId)
      const [crossRes, ttRes] = await Promise.all([
        api.listStudentSubjectEnrollmentsPage({ student_id: student.id, page_size: 200 }),
        api.getStudentTimetableAndConflicts(student.id).catch(() => null),
      ])
      setRawSubjectEnrollments(crossRes.results)
      applyTimetableConflicts(ttRes)
      flashSuccess("Course restored to primary cohort.")
    } catch (err) {
      if (err instanceof ApiError) setError(err.userMessage)
      else setError(err instanceof Error ? err.message : "Failed to restore course")
    } finally {
      setCourseActionBusy(null)
    }
  }

  // Dynamically load subjects taught in the selected host class
  React.useEffect(() => {
    if (!crossClassId) {
      setCrossAvailableSubjects([])
      setCrossSubjectId("")
      return
    }
    let cancelled = false
    async function loadSubjectsForClass() {
      setLoadingSubjectsForClass(true)
      try {
        const token = await getToken()
        if (!token) return
        const api = createApi(token)
        const [coursesList, timetable, allSubjs] = await Promise.all([
          api.listCourses({ cohort_id: Number(crossClassId) }).catch(() => []),
          api.getClassTimetable(Number(crossClassId)).catch(() => []),
          api.listSubjects({ summary: "true" }).catch(() => []),
        ])
        if (cancelled) return
        const timetableSubjects = new Map<number, string>()
        const courses = Array.isArray(coursesList) ? coursesList : (coursesList as any)?.results ?? []
        for (const c of courses) {
          if (c.subject && c.subject.id) {
            timetableSubjects.set(c.subject.id, c.subject.name)
          }
        }
        for (const slot of timetable) {
          if (slot.subject && slot.subject.id) {
            timetableSubjects.set(slot.subject.id, slot.subject.name)
          }
        }
        if (timetableSubjects.size > 0) {
          setCrossAvailableSubjects(
            Array.from(timetableSubjects.entries()).map(([id, name]) => ({
              value: String(id),
              label: name,
            }))
          )
        } else {
          setCrossAvailableSubjects(
            allSubjs.map((s) => ({
              value: String(s.id),
              label: s.name,
            }))
          )
        }
      } catch {
        if (!cancelled) setCrossAvailableSubjects([])
      } finally {
        if (!cancelled) setLoadingSubjectsForClass(false)
      }
    }
    void loadSubjectsForClass()
    return () => {
      cancelled = true
    }
  }, [crossClassId, getToken])

  // Pre-enrollment conflict preview
  React.useEffect(() => {
    if (!crossClassId || !crossSubjectId || !studentId || !isSignedIn) {
      setPreviewConflicts([])
      setCheckingConflicts(false)
      return
    }
    let cancelled = false
    async function checkPreview() {
      setCheckingConflicts(true)
      try {
        const token = await getToken()
        if (!token || cancelled) return
        const api = createApi(token)
        const res = await api
          .getStudentTimetableAndConflicts(studentId, {
            candidate_class_id: Number(crossClassId),
            candidate_subject_id: Number(crossSubjectId),
          })
          .catch(() => null)
        if (cancelled) return
        const candClassNum = Number(crossClassId)
        const candSubjNum = Number(crossSubjectId)
        const relevant = (res?.conflicts ?? []).filter((c) => {
          const aMatches = c.slot_a.class_id === candClassNum && c.slot_a.subject_id === candSubjNum
          const bMatches = c.slot_b.class_id === candClassNum && c.slot_b.subject_id === candSubjNum
          return aMatches || bMatches
        })
        setPreviewConflicts(relevant.length > 0 ? relevant : (res?.conflicts ?? []))
      } catch {
        if (!cancelled) setPreviewConflicts([])
      } finally {
        if (!cancelled) setCheckingConflicts(false)
      }
    }
    void checkPreview()
    return () => {
      cancelled = true
    }
  }, [crossClassId, crossSubjectId, studentId, isSignedIn, getToken])

  const handleAddCrossEnrollment = async () => {
    if (!crossClassId || !crossSubjectId || !student) return
    const cls = allClasses.find((c) => c.id === Number(crossClassId))
    const subj = crossAvailableSubjects.find((s) => s.value === crossSubjectId)
    if (!cls || !subj) return

    setCrossEnrolling(true)
    setError(null)
    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      const api = createApi(token)
      await api.createStudentSubjectEnrollment(cls.id, student.id, Number(subj.value), "enrolled")

      const [crossRes, ttRes] = await Promise.all([
        api.listStudentSubjectEnrollmentsPage({ student_id: student.id, page_size: 200 }),
        api.getStudentTimetableAndConflicts(student.id).catch(() => null),
      ])
      setRawSubjectEnrollments(crossRes.results)
      applyTimetableConflicts(ttRes)

      setCrossSubjectId("")
      setPreviewConflicts([])
      flashSuccess(`Enrolled into ${subj.label} (${formatClassLabel(cls)}).`)
    } catch (err) {
      if (err instanceof ApiError) setError(err.userMessage)
      else setError(err instanceof Error ? err.message : "Failed to enroll in course")
    } finally {
      setCrossEnrolling(false)
    }
  }

  const handleRemoveCrossEnrollment = async (id: string) => {
    if (!student) return
    setRemovingCrossId(id)
    setError(null)
    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      const api = createApi(token)
      const numId = Number(id)
      if (Number.isFinite(numId) && numId > 0) {
        await api.deleteStudentSubjectEnrollment(numId)
      }
      const [crossRes, ttRes] = await Promise.all([
        api.listStudentSubjectEnrollmentsPage({ student_id: student.id, page_size: 200 }),
        api.getStudentTimetableAndConflicts(student.id).catch(() => null),
      ])
      setRawSubjectEnrollments(crossRes.results)
      applyTimetableConflicts(ttRes)
      flashSuccess("Course enrollment removed.")
    } catch (err) {
      if (err instanceof ApiError) setError(err.userMessage)
      else setError(err instanceof Error ? err.message : "Failed to remove course enrollment")
    } finally {
      setRemovingCrossId(null)
    }
  }

  const refreshQrToken = async () => {
    if (!student) return
    setTokenLoading(true)
    setError(null)
    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      const res = await createApi(token).regenerateCheckInToken(student.id)
      setStudent((prev) =>
        prev
          ? {
              ...prev,
              check_in_token: res.check_in_token,
              check_in_token_active: res.check_in_token_active ?? true,
            }
          : null
      )
      flashSuccess("QR token regenerated.")
    } catch (err) {
      if (err instanceof ApiError) setError(err.userMessage)
      else setError(err instanceof Error ? err.message : "Failed to regenerate token")
    } finally {
      setTokenLoading(false)
    }
  }

  const toggleQrActive = async (activate: boolean) => {
    if (!student) return
    setQrLoading(true)
    setError(null)
    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      const api = createApi(token)
      const res = activate
        ? await api.activateCheckInToken(student.id)
        : await api.deactivateCheckInToken(student.id)
      setStudent((prev) => (prev ? { ...prev, check_in_token_active: res.check_in_token_active } : null))
      flashSuccess(activate ? "QR check-in activated." : "QR check-in deactivated.")
    } catch (err) {
      if (err instanceof ApiError) setError(err.userMessage)
      else setError(err instanceof Error ? err.message : "Failed to update QR status")
    } finally {
      setQrLoading(false)
    }
  }

  const enrolledClassIds = React.useMemo(
    () =>
      new Set(
        enrollments.map((e) =>
          typeof e.class_obj === "object" && e.class_obj ? e.class_obj.id : e.class_obj_id ?? 0
        )
      ),
    [enrollments]
  )

  const classOptions = React.useMemo(
    () =>
      allClasses
        .filter((c) => !enrolledClassIds.has(c.id))
        .map((c) => ({ value: String(c.id), label: `${formatCohortIdentifier(c)} · ${formatClassLabel(c)}` })),
    [allClasses, enrolledClassIds]
  )

  // External / Other Cohort course enrollments (excluding primary cohorts and dropped records)
  const crossEnrollments = React.useMemo(() => {
    return rawSubjectEnrollments
      .filter((e) => {
        const cId =
          typeof e.class_obj === "object" && e.class_obj
            ? e.class_obj.id
            : e.class_obj_id ?? 0
        return e.status !== "dropped" && !enrolledClassIds.has(cId)
      })
      .map((e) => {
        const classId =
          typeof e.class_obj === "object" && e.class_obj
            ? e.class_obj.id
            : e.class_obj_id ?? 0
        const cls =
          typeof e.class_obj === "object" && e.class_obj
            ? (e.class_obj as Class)
            : allClasses.find((c) => c.id === classId)
        const subj = typeof e.subject === "object" && e.subject ? (e.subject as any) : null
        const subjectId = subj ? subj.id : (e.subject_id ?? 0)
        const subjectName = subj ? subj.name : `Subject #${e.subject_id ?? "?"}`
        const cohortIdentifier = cls ? formatCohortIdentifier(cls) : (e.cohort_identifier ?? "")
        const courseLabel = cls ? formatCourseLabel(cls, subjectName) : (e.course_label ?? subjectName)
        return {
          id: String(e.id),
          classId,
          cls,
          classLabel: cls ? formatClassLabel(cls) : `Class #${classId || "?"}`,
          cohortIdentifier,
          courseLabel,
          subjectId,
          subjectName,
        }
      })
  }, [rawSubjectEnrollments, enrolledClassIds, allClasses])

  if (!isLoaded) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </div>
    )
  }

  if (!isSignedIn) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
        Please sign in to view this student.
      </div>
    )
  }

  if (!Number.isFinite(studentId)) {
    return (
      <div className="container mx-auto max-w-3xl py-16 text-center">
        <p className="text-muted-foreground">Invalid student id.</p>
      </div>
    )
  }

  if (!isStaff && !isOwner) {
    return (
      <div className="mx-auto max-w-md space-y-4 py-16 text-center">
        <h1 className="text-xl font-semibold">Access denied</h1>
        <p className="text-sm text-muted-foreground">
          You can only view your own student record.
        </p>
        <Button variant="outline" render={<Link href="/" />}>
          Go back
        </Button>
      </div>
    )
  }

  return (
    <StaggerContainer className="container mx-auto max-w-6xl space-y-6 px-4">
      {isStaff ? (
        <StaggerItem>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/students/"
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "-ml-2 h-8 w-fit gap-1.5 px-2 text-muted-foreground hover:text-foreground"
              )}
            >
              <ArrowLeft className="size-3.5" />
              Back to Students
            </Link>
          </div>
        </StaggerItem>
      ) : null}

      {error ? (
        <StaggerItem>
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        </StaggerItem>
      ) : null}
      {success ? (
        <StaggerItem>
          <div className="rounded-xl border border-border bg-muted/50 px-4 py-3 text-sm text-foreground">
            {success}
          </div>
        </StaggerItem>
      ) : null}

      {loading ? (
        <PageSkeleton blocks={STUDENT_DETAIL_PAGE_LAYOUT} />
      ) : !student ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <User />
            </EmptyMedia>
            <EmptyTitle>Student not found</EmptyTitle>
            <EmptyDescription>This student may have been removed.</EmptyDescription>
          </EmptyHeader>
          {isStaff ? (
            <Button variant="outline" onClick={() => router.push("/students/")}>
              Back to Students
            </Button>
          ) : null}
        </Empty>
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="h-full lg:col-span-2">
              <StudentIdentityCard
                student={student}
                showContact
                actions={
                  isStaff ? (
                    <Button variant="outline" size="sm" className="shrink-0 gap-1.5" onClick={openEdit}>
                      <Pencil className="size-4" />
                      Edit profile
                    </Button>
                  ) : undefined
                }
              />
            </div>
            <StudentQrCard
              student={student}
              actions={
                isStaff ? (
                  <>
                    <Button
                      variant="outline"
                      size="default"
                      className="w-full"
                      disabled={tokenLoading}
                      onClick={() => void refreshQrToken()}
                    >
                      {tokenLoading ? (
                        <Loader2 data-icon="inline-start" className="animate-spin" />
                      ) : (
                        <RefreshCw data-icon="inline-start" />
                      )}
                      Regenerate
                    </Button>
                    {student.check_in_token_active === false ? (
                      <Button
                        size="default"
                        className="w-full"
                        disabled={qrLoading}
                        onClick={() => void toggleQrActive(true)}
                      >
                        {qrLoading ? (
                          <Loader2 data-icon="inline-start" className="animate-spin" />
                        ) : (
                          <ShieldCheck data-icon="inline-start" />
                        )}
                        Activate
                      </Button>
                    ) : (
                      <Button
                        variant="destructive"
                        size="default"
                        className="w-full"
                        disabled={qrLoading}
                        onClick={() => void toggleQrActive(false)}
                      >
                        {qrLoading ? (
                          <Loader2 data-icon="inline-start" className="animate-spin" />
                        ) : (
                          <ShieldOff data-icon="inline-start" />
                        )}
                        Deactivate
                      </Button>
                    )}
                  </>
                ) : undefined
              }
            />
          </div>

          <HubTimetableCard
            slots={slots}
            conflicts={conflicts}
            conflictingSlotIds={conflictingSlotIds}
            description="Weekly slots across enrolled courses — not dated session occurrences."
            slotLine={(student.class_ids?.length ?? enrollments.length) > 1 ? "teacher-and-class" : "teacher"}
          />

          {isStaff ? (
            <Card className="border-border/80">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BookOpen className="size-5 text-muted-foreground" />
                  Primary Cohort
                </CardTitle>
                <CardDescription>
                  The student&apos;s primary Cohort Identifier (e.g. IG K1). Students can also opt out of individual courses in their Primary Cohort or enroll in courses from other Cohorts below.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {enrollments.length === 0 ? (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-dashed border-border/70 p-4 text-center">
                      <p className="text-sm font-medium text-muted-foreground">
                        Not assigned to a Primary Cohort yet.
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground/75">
                        Select a Cohort Identifier below to set this student&apos;s single Primary Cohort.
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                      <div className="min-w-0 flex-1">
                        <label className="mb-1.5 block text-xs text-muted-foreground">
                          Assign Primary Cohort
                        </label>
                        <SearchableSelect
                          options={classOptions}
                          value={enrollClassId}
                          onValueChange={setEnrollClassId}
                          placeholder="Select primary cohort…"
                          searchPlaceholder="Search cohorts…"
                        />
                      </div>
                      <Button
                        className="shrink-0 gap-1.5"
                        disabled={!enrollClassId || enrolling}
                        onClick={() => void handleEnroll()}
                      >
                        {enrolling ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                        Set Primary Cohort
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {enrollments.slice(0, 1).map((entry) => {
                      const cls =
                        typeof entry.class_obj === "object" && entry.class_obj
                          ? (entry.class_obj as Class)
                          : allClasses.find((c) => c.id === entry.class_obj_id)
                      const label = cls ? formatClassLabel(cls) : `Class #${entry.class_obj_id ?? "?"}`
                      const cohortId = cls ? formatCohortIdentifier(cls) : null
                      const classId = cls ? cls.id : (entry.class_obj_id ?? 0)
                      const courses = primaryCohortCourses.get(classId) ?? []

                      return (
                        <div key={entry.id} className="rounded-xl border border-border/80 bg-card p-4 space-y-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-foreground">{label}</span>
                                {cohortId ? (
                                  <Badge variant="outline" className="font-mono text-xs font-semibold">
                                    {cohortId}
                                  </Badge>
                                ) : null}
                              </div>
                              {cls ? (
                                <Link
                                  href={`/classes/${cls.id}/`}
                                  className="text-xs text-muted-foreground hover:text-primary"
                                >
                                  View cohort details
                                </Link>
                              ) : null}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="text-destructive hover:text-destructive shrink-0"
                              disabled={unenrollingId === entry.id}
                              onClick={() => void handleUnenroll(entry.id)}
                              aria-label={`Remove from ${label}`}
                              title="Remove primary cohort assignment"
                            >
                              {unenrollingId === entry.id ? (
                                <Loader2 className="size-4 animate-spin" />
                              ) : (
                                <Trash2 className="size-4" />
                              )}
                            </Button>
                          </div>

                          {/* Courses in Primary Cohort */}
                          <div className="border-t border-border/60 pt-3 space-y-2">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                              Courses in Primary Cohort
                            </p>
                            {courses.length === 0 ? (
                              <p className="text-xs text-muted-foreground/75 italic">
                                No courses scheduled for this cohort.
                              </p>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {courses.map((course) => {
                                  const droppedEnrollment = rawSubjectEnrollments.find(
                                    (se) => {
                                      const seCid =
                                        typeof se.class_obj === "object" && se.class_obj
                                          ? se.class_obj.id
                                          : se.class_obj_id
                                      const seSid =
                                        typeof se.subject === "object" && se.subject
                                          ? se.subject.id
                                          : se.subject_id
                                      return seCid === classId && seSid === course.id && se.status === "dropped"
                                    }
                                  )
                                  const isDropped = Boolean(droppedEnrollment)
                                  const hasConflict = conflictingCourseKeys.has(`${classId}:${course.id}`)
                                  const actionKey = `${classId}:${course.id}`
                                  const isBusy = courseActionBusy === actionKey

                                  return (
                                    <div
                                      key={course.id}
                                      className={cn(
                                        "flex items-center justify-between gap-2 rounded-lg border p-2.5 text-xs transition-colors",
                                        isDropped
                                          ? "border-dashed border-border/60 bg-muted/30 text-muted-foreground opacity-75"
                                          : hasConflict
                                          ? "border-amber-500/40 bg-amber-500/5 text-foreground"
                                          : "border-border/60 bg-background text-foreground"
                                      )}
                                    >
                                      <div className="min-w-0 flex-1 space-y-1">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <span className={cn("font-medium truncate", isDropped && "line-through text-muted-foreground")}>
                                            {course.name}
                                          </span>
                                          {isDropped ? (
                                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-dashed text-muted-foreground">
                                              Dropped
                                            </Badge>
                                          ) : (
                                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">
                                              Active
                                            </Badge>
                                          )}
                                          {hasConflict && !isDropped && (
                                            <Badge
                                              variant="outline"
                                              className="border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400 gap-1 text-[10px] px-1.5 py-0"
                                            >
                                              <AlertTriangle className="size-2.5 shrink-0" />
                                              <span>Conflict</span>
                                            </Badge>
                                          )}
                                        </div>
                                      </div>
                                      <div>
                                        {isDropped ? (
                                          <Button
                                            variant="outline"
                                            size="xs"
                                            className="h-7 text-xs"
                                            disabled={isBusy}
                                            onClick={() => void handleRestorePrimaryCourse(droppedEnrollment!.id, actionKey)}
                                          >
                                            {isBusy ? <Loader2 className="size-3 animate-spin" /> : "Restore"}
                                          </Button>
                                        ) : (
                                          <Button
                                            variant="ghost"
                                            size="xs"
                                            className="h-7 text-xs text-muted-foreground hover:text-destructive"
                                            disabled={isBusy}
                                            onClick={() => void handleDropPrimaryCourse(classId, course.id, actionKey)}
                                          >
                                            {isBusy ? <Loader2 className="size-3 animate-spin" /> : "Drop"}
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                    <p className="text-xs text-muted-foreground">
                      Students can only have one Primary Cohort. Use <span className="font-medium text-foreground">Course Enrollments (Other Cohorts)</span> below to add individual courses from other cohorts.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <StudentClassLabelsCard labels={student.class_labels ?? []} />
          )}

          {isStaff ? (
            <Card className="border-border/80">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <GraduationCap className="size-5 text-muted-foreground" />
                      Course Enrollments (Other Cohorts)
                    </CardTitle>
                    <CardDescription>
                      Specific Cohort Courses (Cohort Identifier + Subject) this student attends outside their Primary Cohort. Timetable conflicts are flagged as warnings without blocking enrollment.
                    </CardDescription>
                  </div>
                  {crossEnrollments.length > 0 && (
                    <Badge variant="outline" className="text-xs font-semibold">
                      {crossEnrollments.length} {crossEnrollments.length === 1 ? "Course" : "Courses"}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {crossEnrollments.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border/70 p-4 text-center">
                    <p className="text-sm font-medium text-muted-foreground">
                      No course enrollments in other cohorts yet.
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground/75">
                      Use the selectors below to enroll this student into individual courses from other cohorts.
                    </p>
                  </div>
                ) : (
                  <ul className="divide-y rounded-xl border">
                    {crossEnrollments.map((entry) => {
                      const isConflicting = conflictingCourseKeys.has(`${entry.classId}:${entry.subjectId}`)
                      return (
                        <li key={entry.id} className="flex items-center justify-between gap-3 px-4 py-3">
                          <div className="space-y-0.5 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-foreground text-sm">
                                {entry.courseLabel}
                              </span>
                              {entry.cohortIdentifier ? (
                                <Badge variant="outline" className="font-mono text-xs">
                                  {entry.cohortIdentifier}
                                </Badge>
                              ) : null}
                              {isConflicting && (
                                <Badge
                                  variant="outline"
                                  className="border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400 gap-1 text-[11px] font-medium"
                                >
                                  <AlertTriangle className="size-3 shrink-0" />
                                  <span>Timetable Conflict</span>
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Attending with cohort{" "}
                              <Link
                                href={`/classes/${entry.classId}/`}
                                className="font-medium text-foreground hover:underline"
                              >
                                {entry.classLabel}
                              </Link>
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="text-destructive hover:text-destructive shrink-0"
                            disabled={removingCrossId === entry.id}
                            onClick={() => void handleRemoveCrossEnrollment(entry.id)}
                            aria-label={`Remove ${entry.courseLabel}`}
                          >
                            {removingCrossId === entry.id ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <Trash2 className="size-4" />
                            )}
                          </Button>
                        </li>
                      )
                    })}
                  </ul>
                )}

                {/* Pre-Enrollment Conflict Preview Alert Box */}
                {previewConflicts.length > 0 && (
                  <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3.5 text-sm text-foreground space-y-2">
                    <div className="flex items-center gap-2 font-semibold text-amber-700 dark:text-amber-400">
                      <AlertTriangle className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                      <span>
                        Timetable Conflict Warning ({previewConflicts.length}{" "}
                        {previewConflicts.length === 1 ? "conflict" : "conflicts"} detected)
                      </span>
                    </div>
                    <ul className="space-y-1 pl-6 text-xs text-muted-foreground list-disc">
                      {previewConflicts.map((c, i) => (
                        <li key={i}>{c.message}</li>
                      ))}
                    </ul>
                    <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                      You can still enroll this student — the conflict will be tracked on their timetable.
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto] items-end pt-1">
                  <div className="min-w-0">
                    <label className="mb-1.5 block text-xs text-muted-foreground">
                      Host Cohort / Class
                    </label>
                    <SearchableSelect
                      options={allClasses
                        .filter((c) => !enrolledClassIds.has(c.id))
                        .map((c) => ({
                          value: String(c.id),
                          label: `${formatCohortIdentifier(c)} · ${formatClassLabel(c)}`,
                        }))}
                      value={crossClassId}
                      onValueChange={(val) => {
                        setCrossClassId(val)
                        setCrossSubjectId("")
                      }}
                      placeholder="Select class…"
                      searchPlaceholder="Search classes…"
                    />
                  </div>

                  <div className="min-w-0">
                    <label className="mb-1.5 block text-xs text-muted-foreground">
                      Subject
                    </label>
                    <SearchableSelect
                      options={crossAvailableSubjects}
                      value={crossSubjectId}
                      onValueChange={setCrossSubjectId}
                      placeholder={
                        !crossClassId
                          ? "First pick a class"
                          : loadingSubjectsForClass
                          ? "Loading subjects…"
                          : crossAvailableSubjects.length === 0
                          ? "No subjects in class"
                          : "Select subject…"
                      }
                      searchPlaceholder="Search subjects…"
                      disabled={!crossClassId || loadingSubjectsForClass || crossAvailableSubjects.length === 0}
                    />
                  </div>

                  <Button
                    className={cn(
                      "shrink-0 gap-1.5",
                      previewConflicts.length > 0 && "border-amber-600 bg-amber-600 hover:bg-amber-700 text-white"
                    )}
                    disabled={!crossClassId || !crossSubjectId || crossEnrolling || checkingConflicts}
                    onClick={() => void handleAddCrossEnrollment()}
                  >
                    {crossEnrolling || checkingConflicts ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : previewConflicts.length > 0 ? (
                      <AlertTriangle className="size-4" />
                    ) : (
                      <Plus className="size-4" />
                    )}
                    {previewConflicts.length > 0 ? "Enroll Anyway (Conflict)" : "Enroll in Course"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : crossEnrollments.length > 0 ? (
            <Card className="border-border/80">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <GraduationCap className="size-5 text-muted-foreground" />
                  Course Enrollments (Other Cohorts)
                </CardTitle>
                <CardDescription>
                  Specific Cohort Courses this student attends outside their Primary Cohort.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="divide-y rounded-xl border">
                  {crossEnrollments.map((entry) => {
                    const isConflicting = conflictingCourseKeys.has(`${entry.classId}:${entry.subjectId}`)
                    return (
                      <li key={entry.id} className="flex items-center justify-between gap-3 px-4 py-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-sm">{entry.courseLabel}</p>
                            {isConflicting && (
                              <Badge
                                variant="outline"
                                className="border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400 gap-1 text-[11px] font-medium"
                              >
                                <AlertTriangle className="size-3 shrink-0" />
                                <span>Timetable Conflict</span>
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">Cohort: {entry.classLabel}</p>
                        </div>
                        {entry.cohortIdentifier ? (
                          <Badge variant="outline" className="font-mono text-xs">
                            {entry.cohortIdentifier}
                          </Badge>
                        ) : (
                          <Badge variant="secondary">{entry.classLabel}</Badge>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          <StudentAttendanceOverview
            summary={summary}
            range={range}
            onRangeChange={setRange}
            summaryLoading={summaryLoading}
            onRefresh={() => void loadSummary()}
            extraActions={
              isStaff ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => router.push("/check-in/terminal/")}
                >
                  <Monitor className="size-3.5" />
                  Open terminal
                </Button>
              ) : undefined
            }
          />
        </>
      )}

      {isStaff ? (
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent onClose={() => setEditOpen(false)}>
            <DialogHeader>
              <DialogTitle>Edit student</DialogTitle>
              <DialogDescription>Update profile fields for {student?.name}.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid gap-1.5">
                <label htmlFor="edit-name" className="text-sm font-medium">
                  Name
                </label>
                <Input id="edit-name" value={formName} onChange={(e) => setFormName(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <label htmlFor="edit-dob" className="text-sm font-medium">
                  Date of birth
                </label>
                <Input
                  id="edit-dob"
                  type="date"
                  value={formDob}
                  onChange={(e) => setFormDob(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <label htmlFor="edit-contact" className="text-sm font-medium">
                  Contact
                </label>
                <Input
                  id="edit-contact"
                  value={formContact}
                  onChange={(e) => setFormContact(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <span className="text-sm font-medium">School</span>
                <Select value={formSchool} onValueChange={(v) => setFormSchool(v ?? "")}>
                  <SelectTrigger>
                    <SelectValue placeholder="School" />
                  </SelectTrigger>
                  <SelectContent>
                    {SCHOOL_CODES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <label htmlFor="edit-uci" className="text-sm font-medium">
                  UCI
                </label>
                <Input id="edit-uci" value={formUci} onChange={(e) => setFormUci(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditOpen(false)} disabled={editSaving}>
                Cancel
              </Button>
              <Button onClick={() => void saveProfile()} disabled={editSaving || !formName.trim()}>
                {editSaving && <Loader2 className="mr-2 size-4 animate-spin" />}
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </StaggerContainer>
  )
}

export default function StudentDetailPage() {
  return (
    <RequireRole mode="any">
      <StudentDetailContent />
    </RequireRole>
  )
}
