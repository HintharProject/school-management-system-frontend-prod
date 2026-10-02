"use client"

import * as React from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@clerk/nextjs"
import {
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
import { formatClassLabel } from "@/lib/format-class"
import {
  SCHOOL_CODES,
  type Class,
  type ClassStudent,
  type Student,
  type StudentAnalyticsRange,
  type StudentAttendanceSummary,
  type StudentPayload,
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

async function mergeClassTimetables(
  api: ReturnType<typeof createApi>,
  classIds: number[]
): Promise<TimetableSlot[]> {
  if (classIds.length === 0) return []
  const lists = await Promise.all(classIds.map((id) => api.getClassTimetable(id)))
  const byId = new Map<number, TimetableSlot>()
  for (const list of lists) {
    for (const slot of list) byId.set(slot.id, slot)
  }
  return [...byId.values()]
}

interface CrossEnrollmentItem {
  id: string
  classId: number
  classLabel: string
  subjectId: number
  subjectName: string
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
  const [slots, setSlots] = React.useState<TimetableSlot[]>([])
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

  // Cross-enrollment UI state (with browser persistence)
  const [crossEnrollments, setCrossEnrollments] = React.useState<CrossEnrollmentItem[]>([])
  const [crossClassId, setCrossClassId] = React.useState("")
  const [crossSubjectId, setCrossSubjectId] = React.useState("")
  const [crossAvailableSubjects, setCrossAvailableSubjects] = React.useState<{ value: string; label: string }[]>([])
  const [loadingSubjectsForClass, setLoadingSubjectsForClass] = React.useState(false)
  const [crossEnrolling, setCrossEnrolling] = React.useState(false)
  const [removingCrossId, setRemovingCrossId] = React.useState<string | null>(null)

  const [qrLoading, setQrLoading] = React.useState(false)
  const [tokenLoading, setTokenLoading] = React.useState(false)

  const flashSuccess = React.useCallback((msg: string) => {
    setSuccess(msg)
    window.setTimeout(() => setSuccess(null), 3500)
  }, [])

  const loadCore = React.useCallback(async () => {
    if (!isSignedIn || !Number.isFinite(studentId)) return
    setLoading(true)
    setError(null)
    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      const api = createApi(token)
      if (isStaff) {
        const [studentRes, enrollmentRes, crossRes] = await Promise.all([
          api.getStudent(studentId),
          api.listClassStudentsPage({ student_id: studentId, page_size: 200 }),
          api.listStudentSubjectEnrollmentsPage({ student_id: studentId, page_size: 200 }).catch(() => ({ results: [] })),
        ])
        setStudent(studentRes)
        setEnrollments(enrollmentRes.results)
        setCrossEnrollments(
          crossRes.results.map((e) => {
            const cls =
              typeof e.class_obj === "object" && e.class_obj
                ? (e.class_obj as Class)
                : allClasses.find((c) => c.id === e.class_obj_id)
            const subj = typeof e.subject === "object" && e.subject ? (e.subject as any) : null
            return {
              id: String(e.id),
              classId: cls ? cls.id : (e.class_obj_id ?? 0),
              classLabel: cls ? formatClassLabel(cls) : `Class #${e.class_obj_id ?? "?"}`,
              subjectId: subj ? subj.id : (e.subject_id ?? 0),
              subjectName: subj ? subj.name : `Subject #${e.subject_id ?? "?"}`,
            }
          })
        )
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
        const cohortSlots = await mergeClassTimetables(api, classIds)

        // Also fetch timetable slots for cross-enrolled subjects
        const crossClassIds = [
          ...new Set(
            crossRes.results
              .map((e) =>
                typeof e.class_obj === "object" && e.class_obj
                  ? e.class_obj.id
                  : e.class_obj_id ?? 0
              )
              .filter((id) => id > 0)
          ),
        ]
        let crossSlots: TimetableSlot[] = []
        if (crossClassIds.length > 0) {
          const crossTimetables = await Promise.all(
            crossClassIds.map((id) => api.getClassTimetable(id).catch(() => []))
          )
          const crossPairs = new Set(
            crossRes.results.map((e) => {
              const cId =
                typeof e.class_obj === "object" && e.class_obj
                  ? e.class_obj.id
                  : e.class_obj_id
              const sId =
                typeof e.subject === "object" && e.subject ? e.subject.id : e.subject_id
              return `${cId}-${sId}`
            })
          )
          for (const list of crossTimetables) {
            for (const s of list) {
              if (crossPairs.has(`${s.class_obj?.id}-${s.subject?.id}`)) {
                crossSlots.push(s)
              }
            }
          }
        }
        const byId = new Map<number, TimetableSlot>()
        for (const s of [...cohortSlots, ...crossSlots]) byId.set(s.id, s)
        setSlots([...byId.values()])
      } else {
        const [studentRes, crossRes] = await Promise.all([
          api.getStudent(studentId),
          api.listStudentSubjectEnrollmentsPage({ student_id: studentId, page_size: 200 }).catch(() => ({ results: [] })),
        ])
        setStudent(studentRes)
        setEnrollments([])
        setCrossEnrollments(
          crossRes.results.map((e) => {
            const cls =
              typeof e.class_obj === "object" && e.class_obj
                ? (e.class_obj as Class)
                : null
            const subj = typeof e.subject === "object" && e.subject ? (e.subject as any) : null
            return {
              id: String(e.id),
              classId: cls ? cls.id : (e.class_obj_id ?? 0),
              classLabel: cls ? formatClassLabel(cls) : `Class #${e.class_obj_id ?? "?"}`,
              subjectId: subj ? subj.id : (e.subject_id ?? 0),
              subjectName: subj ? subj.name : `Subject #${e.subject_id ?? "?"}`,
            }
          })
        )
        setSlots(await mergeClassTimetables(api, studentRes.class_ids ?? []))
      }
    } catch (err) {
      if (err instanceof ApiError) setError(err.userMessage)
      else setError(err instanceof Error ? err.message : "Failed to load student")
    } finally {
      setLoading(false)
    }
  }, [getToken, isSignedIn, studentId, isStaff, allClasses])

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
      const entry = await api.createClassStudent(Number(enrollClassId), student.id)
      setEnrollments((prev) => [...prev, entry])
      const classId =
        typeof entry.class_obj === "object" && entry.class_obj
          ? entry.class_obj.id
          : entry.class_obj_id
      if (classId) {
        const added = await api.getClassTimetable(classId, true)
        setSlots((prev) => {
          const byId = new Map(prev.map((slot) => [slot.id, slot]))
          for (const slot of added) byId.set(slot.id, slot)
          return [...byId.values()]
        })
      }
      setEnrollClassId("")
      flashSuccess("Enrolled in class.")
    } catch (err) {
      if (err instanceof ApiError) setError(err.userMessage)
      else setError(err instanceof Error ? err.message : "Failed to enroll")
    } finally {
      setEnrolling(false)
    }
  }

  const handleUnenroll = async (classStudentId: number) => {
    setUnenrollingId(classStudentId)
    setError(null)
    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      await createApi(token).deleteClassStudent(classStudentId)
      const removed = enrollments.find((e) => e.id === classStudentId)
      const removedClassId =
        typeof removed?.class_obj === "object" && removed.class_obj
          ? removed.class_obj.id
          : removed?.class_obj_id
      setEnrollments((prev) => prev.filter((e) => e.id !== classStudentId))
      if (removedClassId) {
        setSlots((prev) => prev.filter((slot) => slot.class_obj?.id !== removedClassId))
      }
      flashSuccess("Removed from class.")
    } catch (err) {
      if (err instanceof ApiError) setError(err.userMessage)
      else setError(err instanceof Error ? err.message : "Failed to unenroll")
    } finally {
      setUnenrollingId(null)
    }
  }

  // Dynamically load subjects taught in the selected cross-enrolled class
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
        const [timetable, allSubjs] = await Promise.all([
          api.getClassTimetable(Number(crossClassId)).catch(() => []),
          api.listSubjects({ summary: "true" }).catch(() => []),
        ])
        if (cancelled) return
        const timetableSubjects = new Map<number, string>()
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
      const res = await api.createStudentSubjectEnrollment(cls.id, student.id, Number(subj.value))

      const newItem: CrossEnrollmentItem = {
        id: String(res.id),
        classId: cls.id,
        classLabel: formatClassLabel(cls),
        subjectId: Number(subj.value),
        subjectName: subj.label,
      }
      setCrossEnrollments((prev) => [...prev, newItem])

      // Merge matching timetable slot(s) for visual schedule preview
      const added = await api.getClassTimetable(cls.id, true).catch(() => [])
      const relevantSlots = added.filter(
        (s) => s.subject?.id === Number(subj.value)
      )
      if (relevantSlots.length > 0) {
        setSlots((prev) => {
          const byId = new Map(prev.map((slot) => [slot.id, slot]))
          for (const slot of relevantSlots) byId.set(slot.id, slot)
          return [...byId.values()]
        })
      }

      setCrossSubjectId("")
      flashSuccess(`Cross-enrolled into ${subj.label} (${formatClassLabel(cls)}).`)
    } catch (err) {
      if (err instanceof ApiError) setError(err.userMessage)
      else setError(err instanceof Error ? err.message : "Failed to cross-enroll")
    } finally {
      setCrossEnrolling(false)
    }
  }

  const handleRemoveCrossEnrollment = async (id: string) => {
    setRemovingCrossId(id)
    setError(null)
    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      const numId = Number(id)
      if (Number.isFinite(numId) && numId > 0) {
        await createApi(token).deleteStudentSubjectEnrollment(numId)
      }
      const target = crossEnrollments.find((item) => item.id === id)
      setCrossEnrollments((prev) => prev.filter((item) => item.id !== id))
      if (target) {
        setSlots((prev) =>
          prev.filter(
            (slot) =>
              !(
                slot.class_obj?.id === target.classId &&
                slot.subject?.id === target.subjectId
              )
          )
        )
      }
      flashSuccess("Cross-enrollment removed.")
    } catch (err) {
      if (err instanceof ApiError) setError(err.userMessage)
      else setError(err instanceof Error ? err.message : "Failed to remove cross-enrollment")
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
        .map((c) => ({ value: String(c.id), label: formatClassLabel(c) })),
    [allClasses, enrolledClassIds]
  )

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
            description="Weekly slots from enrolled classes — not dated session occurrences."
            slotLine={(student.class_ids?.length ?? enrollments.length) > 1 ? "teacher-and-class" : "teacher"}
          />

          {isStaff ? (
            <Card className="border-border/80">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BookOpen className="size-5 text-muted-foreground" />
                  Classes
                </CardTitle>
                <CardDescription>Cohorts this student belongs to.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {enrollments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Not enrolled in any class yet.</p>
                ) : (
                  <ul className="divide-y rounded-xl border">
                    {enrollments.map((entry) => {
                      const cls =
                        typeof entry.class_obj === "object" && entry.class_obj
                          ? (entry.class_obj as Class)
                          : allClasses.find((c) => c.id === entry.class_obj_id)
                      const label = cls ? formatClassLabel(cls) : `Class #${entry.class_obj_id ?? "?"}`
                      return (
                        <li key={entry.id} className="flex items-center justify-between gap-3 px-4 py-3">
                          <div>
                            <p className="font-medium">{label}</p>
                            {cls ? (
                              <Link
                                href={`/classes/${cls.id}/`}
                                className="text-xs text-muted-foreground hover:text-primary"
                              >
                                View in classes
                              </Link>
                            ) : null}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="text-destructive hover:text-destructive"
                            disabled={unenrollingId === entry.id}
                            onClick={() => void handleUnenroll(entry.id)}
                            aria-label={`Remove from ${label}`}
                          >
                            {unenrollingId === entry.id ? (
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
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                  <div className="min-w-0 flex-1">
                    <label className="mb-1.5 block text-xs text-muted-foreground">Add to class</label>
                    <SearchableSelect
                      options={classOptions}
                      value={enrollClassId}
                      onValueChange={setEnrollClassId}
                      placeholder="Select class…"
                      searchPlaceholder="Search classes…"
                    />
                  </div>
                  <Button
                    className="shrink-0 gap-1.5"
                    disabled={!enrollClassId || enrolling}
                    onClick={() => void handleEnroll()}
                  >
                    {enrolling ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                    Enroll
                  </Button>
                </div>
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
                      Cross-Enrolled Subjects
                    </CardTitle>
                    <CardDescription>
                      Specific subjects this student attends in another class or cohort.
                    </CardDescription>
                  </div>
                  {crossEnrollments.length > 0 && (
                    <Badge variant="outline" className="text-xs font-semibold">
                      {crossEnrollments.length} {crossEnrollments.length === 1 ? "Subject" : "Subjects"}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {crossEnrollments.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border/70 p-4 text-center">
                    <p className="text-sm font-medium text-muted-foreground">
                      No cross-enrolled subjects yet.
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground/75">
                      Use the selectors below to enroll this student into individual subjects from other cohorts.
                    </p>
                  </div>
                ) : (
                  <ul className="divide-y rounded-xl border">
                    {crossEnrollments.map((entry) => (
                      <li key={entry.id} className="flex items-center justify-between gap-3 px-4 py-3">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground text-sm">
                              {entry.subjectName}
                            </span>
                            <Badge variant="secondary" className="text-[11px] font-medium px-2 py-0">
                              {entry.classLabel}
                            </Badge>
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
                          className="text-destructive hover:text-destructive"
                          disabled={removingCrossId === entry.id}
                          onClick={() => handleRemoveCrossEnrollment(entry.id)}
                          aria-label={`Remove ${entry.subjectName} from ${entry.classLabel}`}
                        >
                          {removingCrossId === entry.id ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Trash2 className="size-4" />
                          )}
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto] items-end pt-1">
                  <div className="min-w-0">
                    <label className="mb-1.5 block text-xs text-muted-foreground">
                      Host Cohort / Class
                    </label>
                    <SearchableSelect
                      options={allClasses.map((c) => ({
                        value: String(c.id),
                        label: formatClassLabel(c),
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
                    className="shrink-0 gap-1.5"
                    disabled={!crossClassId || !crossSubjectId || crossEnrolling}
                    onClick={() => void handleAddCrossEnrollment()}
                  >
                    {crossEnrolling ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Plus className="size-4" />
                    )}
                    Cross-Enroll
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : crossEnrollments.length > 0 ? (
            <Card className="border-border/80">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <GraduationCap className="size-5 text-muted-foreground" />
                  Cross-Enrolled Subjects
                </CardTitle>
                <CardDescription>
                  Additional subjects this student attends in another cohort.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="divide-y rounded-xl border">
                  {crossEnrollments.map((entry) => (
                    <li key={entry.id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div>
                        <p className="font-semibold text-sm">{entry.subjectName}</p>
                        <p className="text-xs text-muted-foreground">Cohort: {entry.classLabel}</p>
                      </div>
                      <Badge variant="secondary">{entry.classLabel}</Badge>
                    </li>
                  ))}
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
