"use client"

import * as React from "react"
import Link from "next/link"
import { useAuth } from "@clerk/nextjs"
import { useRouter, useSearchParams } from "next/navigation"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Users,
  BookOpen,
  ArrowRight,
  ExternalLink,
  Layers,
  X,
  Sparkles,
  RefreshCw,
} from "lucide-react"

import { createApi, ApiError } from "@/lib/api"
import {
  Class,
  ClassPayload,
  Course,
  Subject,
  SubjectPayload,
  Teacher,
  EDUCATION_LEVELS,
} from "@/lib/types"
import {
  apiQueryKeys,
  useClassesQuery,
  useSubjectsQuery,
  useTeachersSelectQuery,
} from "@/hooks/use-api-queries"
import {
  formatClassLabel,
  formatCohortIdentifier,
  COHORT_IDENTIFIER_MAX_LENGTH,
  COHORT_SUB_CATEGORY_MAX_LENGTH,
  COHORT_IDENTIFIER_PLACEHOLDER,
  COHORT_SUB_CATEGORY_PLACEHOLDER,
  COHORT_IDENTIFIER_HINT,
  COHORT_SUB_CATEGORY_HINT,
  sanitizeCohortIdentifierInput,
  sanitizeCohortSubCategoryInput,
} from "@/lib/format-class"
import { cn } from "@/lib/utils"

import {
  SystemHeader,
  DataModule,
  CodeChip,
  TelemetryTag,
  InspectorSheet,
} from "@/components/design-system/v2-primitives"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
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
import { ConfirmDialog } from "@/components/confirm-dialog"
import { toast } from "@/components/ui/toast"

type LevelFilter = "ALL" | "IG" | "IAL" | "YR"

function matchesLevelFilter(educationLevel: string, filter: LevelFilter): boolean {
  if (filter === "ALL") return true
  const upper = (educationLevel ?? "").toUpperCase()
  if (filter === "IG") return upper.includes("IG")
  if (filter === "IAL") return upper.includes("IAL") || upper === "A-LEVEL"
  if (filter === "YR") {
    return upper.startsWith("YEAR") || upper.startsWith("YR") || /^Y\d/.test(upper)
  }
  return true
}

function formatLevelBadge(level?: string | null): string {
  if (!level) return "COHORT"
  return EDUCATION_LEVELS.find((l) => l.value === level)?.label ?? level
}

function getLevelOptionLabel(val?: string | null): string {
  if (!val) return "Select Level"
  return EDUCATION_LEVELS.find((l) => l.value === val)?.label ?? val
}

function ClassesContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { getToken, isLoaded, isSignedIn } = useAuth()
  const queryClient = useQueryClient()

  // Tab State (synced with ?tab=subjects)
  const tabParam = searchParams.get("tab")
  const [activeTab, setActiveTab] = React.useState<string>(
    tabParam === "subjects" ? "subjects" : "cohorts"
  )

  React.useEffect(() => {
    if (tabParam === "subjects" && activeTab !== "subjects") {
      setActiveTab("subjects")
    } else if (tabParam === "cohorts" && activeTab !== "cohorts") {
      setActiveTab("cohorts")
    }
  }, [tabParam, activeTab])

  const handleTabChange = (nextTab: string) => {
    setActiveTab(nextTab)
    const url = nextTab === "subjects" ? "/classes?tab=subjects" : "/classes"
    router.replace(url, { scroll: false })
  }

  // Real Queries
  const classesQuery = useClassesQuery(!!isLoaded && !!isSignedIn)
  const subjectsQuery = useSubjectsQuery(!!isLoaded && !!isSignedIn)
  const teachersQuery = useTeachersSelectQuery(!!isLoaded && !!isSignedIn)

  const coursesQuery = useQuery({
    queryKey: ["courses", "all"],
    enabled: !!isLoaded && !!isSignedIn,
    queryFn: async () => {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      return createApi(token).listCourses()
    },
  })

  const classStudentsQuery = useQuery({
    queryKey: ["class-students", "all"],
    enabled: !!isLoaded && !!isSignedIn,
    queryFn: async () => {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      return createApi(token).listClassStudents()
    },
  })

  const classes = classesQuery.data ?? []
  const subjects = subjectsQuery.data ?? []
  const teachers = teachersQuery.data ?? []
  const courses = coursesQuery.data ?? []
  const classStudents = classStudentsQuery.data ?? []

  const isDataLoading =
    classesQuery.isFetching ||
    subjectsQuery.isFetching ||
    coursesQuery.isFetching ||
    classStudentsQuery.isFetching

  const reloadAll = React.useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: apiQueryKeys.classes() }),
      queryClient.invalidateQueries({ queryKey: apiQueryKeys.subjects() }),
      queryClient.invalidateQueries({ queryKey: ["courses"] }),
      queryClient.invalidateQueries({ queryKey: ["class-students"] }),
      queryClient.invalidateQueries({ queryKey: apiQueryKeys.teachersSelect }),
    ])
    toast.add({
      title: "Data Refreshed",
      description: "Academics hub data synchronized.",
      type: "info",
    })
  }, [queryClient])

  // Computed maps for fast lookups
  const studentCountByClass = React.useMemo(() => {
    const map = new Map<number, number>()
    for (const cs of classStudents) {
      const classId =
        typeof cs.class_obj === "object" && cs.class_obj !== null
          ? cs.class_obj.id
          : (cs.class_obj_id ?? (typeof cs.class_obj === "number" ? cs.class_obj : null))
      if (classId) {
        map.set(Number(classId), (map.get(Number(classId)) ?? 0) + 1)
      }
    }
    return map
  }, [classStudents])

  const coursesByClass = React.useMemo(() => {
    const map = new Map<number, Course[]>()
    for (const c of courses) {
      const classId =
        typeof c.class_obj === "object" && c.class_obj !== null
          ? c.class_obj.id
          : (c.class_obj_id ?? c.cohort?.id)
      if (classId) {
        const id = Number(classId)
        const list = map.get(id) ?? []
        list.push(c)
        map.set(id, list)
      }
    }
    return map
  }, [courses])

  const coursesBySubject = React.useMemo(() => {
    const map = new Map<number, Course[]>()
    for (const c of courses) {
      const subjectId =
        typeof c.subject === "object" && c.subject !== null
          ? c.subject.id
          : (c.subject_id ?? (c as unknown as { subject: number }).subject)
      if (subjectId) {
        const id = Number(subjectId)
        const list = map.get(id) ?? []
        list.push(c)
        map.set(id, list)
      }
    }
    return map
  }, [courses])

  const totalEnrollmentCount = React.useMemo(() => {
    let sum = 0
    for (const count of studentCountByClass.values()) {
      sum += count
    }
    return sum
  }, [studentCountByClass])

  // ---------------------------------------------------------------------------
  // Cohorts State & Filter Logic
  // ---------------------------------------------------------------------------
  const [cohortSearch, setCohortSearch] = React.useState("")
  const [levelFilter, setLevelFilter] = React.useState<LevelFilter>("ALL")
  const [selectedCohortIds, setSelectedCohortIds] = React.useState<number[]>([])
  const [cohortPage, setCohortPage] = React.useState(1)
  const cohortPageSize = 10

  const levelCounts = React.useMemo(() => {
    return {
      ALL: classes.length,
      IG: classes.filter((c) => matchesLevelFilter(c.education_level, "IG")).length,
      IAL: classes.filter((c) => matchesLevelFilter(c.education_level, "IAL")).length,
      YR: classes.filter((c) => matchesLevelFilter(c.education_level, "YR")).length,
    }
  }, [classes])

  const filteredCohorts = React.useMemo(() => {
    return classes.filter((c) => {
      if (!matchesLevelFilter(c.education_level, levelFilter)) return false
      if (!cohortSearch.trim()) return true
      const q = cohortSearch.toLowerCase().trim()
      const code = formatCohortIdentifier(c).toLowerCase()
      const name = formatClassLabel(c).toLowerCase()
      const level = (c.education_level ?? "").toLowerCase()
      const letter = (c.cohort_identifier ?? "").toLowerCase()
      const sub = (c.cohort_sub_category ?? "").toLowerCase()
      return (
        code.includes(q) ||
        name.includes(q) ||
        level.includes(q) ||
        letter.includes(q) ||
        sub.includes(q)
      )
    })
  }, [classes, levelFilter, cohortSearch])

  const paginatedCohorts = React.useMemo(() => {
    const start = (cohortPage - 1) * cohortPageSize
    return filteredCohorts.slice(start, start + cohortPageSize)
  }, [filteredCohorts, cohortPage, cohortPageSize])

  const totalCohortPages = Math.ceil(filteredCohorts.length / cohortPageSize) || 1

  const allCurrentPageCohortsSelected =
    paginatedCohorts.length > 0 &&
    paginatedCohorts.every((c) => selectedCohortIds.includes(c.id))

  const toggleSelectAllCohorts = () => {
    const pageIds = paginatedCohorts.map((c) => c.id)
    if (allCurrentPageCohortsSelected) {
      setSelectedCohortIds((prev) => prev.filter((id) => !pageIds.includes(id)))
    } else {
      setSelectedCohortIds((prev) => Array.from(new Set([...prev, ...pageIds])))
    }
  }

  const toggleSelectCohort = (id: number) => {
    setSelectedCohortIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  // ---------------------------------------------------------------------------
  // Cohort Inspector Sheet & Drawer Edit Mode State
  // ---------------------------------------------------------------------------
  const [inspectedCohort, setInspectedCohort] = React.useState<Class | null>(null)
  const [drawerMode, setDrawerMode] = React.useState<"inspect" | "edit">("inspect")

  // Drawer Edit Cohort Form State
  const [drawerEditLevel, setDrawerEditLevel] =
    React.useState<ClassPayload["education_level"]>("IAL")
  const [drawerEditIdentifier, setDrawerEditIdentifier] = React.useState("")
  const [drawerEditSubCategory, setDrawerEditSubCategory] = React.useState("")
  const [drawerSaving, setDrawerSaving] = React.useState(false)

  const openCohortInspector = (cls: Class, mode: "inspect" | "edit" = "inspect") => {
    setInspectedCohort(cls)
    setDrawerMode(mode)
    setDrawerEditLevel(cls.education_level)
    setDrawerEditIdentifier(cls.cohort_identifier)
    setDrawerEditSubCategory(cls.cohort_sub_category ?? "")
  }

  // Subject Linkage State inside Drawer
  const [linkSubjectMode, setLinkSubjectMode] = React.useState<"existing" | "new">(
    "existing"
  )
  const [selectedSubjectId, setSelectedSubjectId] = React.useState<string>("")
  const [newSubjectTitle, setNewSubjectTitle] = React.useState<string>("")
  const [selectedTeacherId, setSelectedTeacherId] = React.useState<string>("")
  const [isLinkingSubject, setIsLinkingSubject] = React.useState(false)
  const [unlinkingCourseId, setUnlinkingCourseId] = React.useState<number | null>(null)

  const activeCohortCourses = React.useMemo(() => {
    if (!inspectedCohort) return []
    return coursesByClass.get(inspectedCohort.id) ?? []
  }, [inspectedCohort, coursesByClass])

  // Subjects not yet linked to active cohort
  const availableSubjectsToLink = React.useMemo(() => {
    if (!inspectedCohort) return subjects
    const linkedSubIds = new Set(
      activeCohortCourses.map((c) => c.subject?.id ?? c.subject_id)
    )
    return subjects.filter((s) => !linkedSubIds.has(s.id))
  }, [inspectedCohort, subjects, activeCohortCourses])

  const handleLinkExistingSubject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inspectedCohort || !selectedSubjectId || isLinkingSubject) return
    setIsLinkingSubject(true)
    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      const api = createApi(token)

      await api.createCourse({
        class_obj_id: inspectedCohort.id,
        subject_id: Number(selectedSubjectId),
        default_teacher_id: selectedTeacherId ? Number(selectedTeacherId) : null,
      })

      const linkedSubName =
        subjects.find((s) => String(s.id) === selectedSubjectId)?.name ?? "Subject"

      toast.add({
        title: "Subject Linked",
        description: `Linked ${linkedSubName} to cohort ${formatCohortIdentifier(inspectedCohort)}.`,
        type: "success",
      })
      setSelectedSubjectId("")
      setSelectedTeacherId("")
      await queryClient.invalidateQueries({ queryKey: ["courses"] })
    } catch (err) {
      toast.add({
        title: "Failed to Link Subject",
        description:
          err instanceof ApiError
            ? err.userMessage
            : err instanceof Error
              ? err.message
              : "Failed to link subject to cohort",
        type: "error",
      })
    } finally {
      setIsLinkingSubject(false)
    }
  }

  const handleCreateAndLinkSubject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inspectedCohort || !newSubjectTitle.trim() || isLinkingSubject) return
    setIsLinkingSubject(true)
    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      const api = createApi(token)

      // Step 1: Create global subject
      const createdSubject = await api.createSubject({
        name: newSubjectTitle.trim(),
      })

      // Step 2: Link to cohort via Course
      await api.createCourse({
        class_obj_id: inspectedCohort.id,
        subject_id: createdSubject.id,
        default_teacher_id: selectedTeacherId ? Number(selectedTeacherId) : null,
      })

      toast.add({
        title: "Subject Created & Linked",
        description: `Created "${createdSubject.name}" and linked to cohort ${formatCohortIdentifier(inspectedCohort)}.`,
        type: "success",
      })
      setNewSubjectTitle("")
      setSelectedTeacherId("")
      setLinkSubjectMode("existing")
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: apiQueryKeys.subjects() }),
        queryClient.invalidateQueries({ queryKey: ["courses"] }),
      ])
    } catch (err) {
      toast.add({
        title: "Creation Failed",
        description:
          err instanceof ApiError
            ? err.userMessage
            : err instanceof Error
              ? err.message
              : "Failed to create and link subject",
        type: "error",
      })
    } finally {
      setIsLinkingSubject(false)
    }
  }

  const handleUnlinkCourse = async (courseId: number) => {
    setUnlinkingCourseId(courseId)
    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      const api = createApi(token)
      await api.deleteCourse(courseId)
      toast.add({
        title: "Subject Unlinked",
        description: "Subject offering removed from cohort.",
        type: "success",
      })
      await queryClient.invalidateQueries({ queryKey: ["courses"] })
    } catch (err) {
      toast.add({
        title: "Failed to Unlink Subject",
        description:
          err instanceof ApiError
            ? err.userMessage
            : err instanceof Error
              ? err.message
              : "Failed to unlink subject",
        type: "error",
      })
    } finally {
      setUnlinkingCourseId(null)
    }
  }

  const handleSaveDrawerCohort = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inspectedCohort || !drawerEditIdentifier.trim() || drawerSaving) return
    setDrawerSaving(true)
    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      const api = createApi(token)

      const payload: ClassPayload = {
        education_level: drawerEditLevel,
        cohort_identifier: drawerEditIdentifier.trim(),
        cohort_sub_category: drawerEditSubCategory.trim() || null,
      }

      const updated = await api.updateClass(inspectedCohort.id, payload)
      setInspectedCohort(updated)
      setDrawerMode("inspect")
      toast.add({
        title: "Cohort Updated",
        description: `Cohort "${formatCohortIdentifier(updated)}" saved successfully.`,
        type: "success",
      })
      await reloadAll()
    } catch (err) {
      toast.add({
        title: "Failed to Update Cohort",
        description:
          err instanceof ApiError
            ? err.userMessage
            : err instanceof Error
              ? err.message
              : "Failed to update cohort",
        type: "error",
      })
    } finally {
      setDrawerSaving(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Cohorts Create Dialog & Deletion
  // ---------------------------------------------------------------------------
  const [createCohortModalOpen, setCreateCohortModalOpen] = React.useState(false)
  const [cohortSubmitting, setCohortSubmitting] = React.useState(false)
  const [formEducationLevel, setFormEducationLevel] =
    React.useState<ClassPayload["education_level"]>("IAL")
  const [formCohortIdentifier, setFormCohortIdentifier] = React.useState("")
  const [formCohortSubCategory, setFormCohortSubCategory] = React.useState("")

  const [deleteConfirmCohort, setDeleteConfirmCohort] =
    React.useState<Class | null>(null)
  const [deleteSubmitting, setDeleteSubmitting] = React.useState(false)
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = React.useState(false)
  const [bulkDeleting, setBulkDeleting] = React.useState(false)

  const openAddCohortModal = () => {
    setFormEducationLevel("IAL")
    setFormCohortIdentifier("")
    setFormCohortSubCategory("")
    setCreateCohortModalOpen(true)
  }

  const handleCreateCohortSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (cohortSubmitting) return
    setCohortSubmitting(true)

    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      const api = createApi(token)

      const payload: ClassPayload = {
        education_level: formEducationLevel,
        cohort_identifier: formCohortIdentifier.trim(),
        cohort_sub_category: formCohortSubCategory.trim() || null,
      }

      const created = await api.createClass(payload)
      toast.add({
        title: "Cohort Created",
        description: `Cohort "${formatCohortIdentifier(created)}" created successfully.`,
        type: "success",
      })

      setCreateCohortModalOpen(false)
      await reloadAll()
    } catch (err) {
      toast.add({
        title: "Failed to Create Cohort",
        description:
          err instanceof ApiError
            ? err.userMessage
            : err instanceof Error
              ? err.message
              : "Failed to create cohort",
        type: "error",
      })
    } finally {
      setCohortSubmitting(false)
    }
  }

  const handleDeleteCohort = async (cls: Class) => {
    if (deleteSubmitting) return
    setDeleteSubmitting(true)
    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      const api = createApi(token)
      await api.deleteClass(cls.id)
      toast.add({
        title: "Cohort Deleted",
        description: `Cohort ${formatCohortIdentifier(cls)} and all associated records deleted.`,
        type: "success",
      })
      setSelectedCohortIds((prev) => prev.filter((id) => id !== cls.id))
      if (inspectedCohort?.id === cls.id) {
        setInspectedCohort(null)
      }
      setDeleteConfirmCohort(null)
      await reloadAll()
    } catch (err) {
      toast.add({
        title: "Failed to Delete Cohort",
        description:
          err instanceof ApiError
            ? err.userMessage
            : err instanceof Error
              ? err.message
              : "Failed to delete cohort",
        type: "error",
      })
    } finally {
      setDeleteSubmitting(false)
    }
  }

  const handleBulkDeleteCohorts = async () => {
    if (selectedCohortIds.length === 0 || bulkDeleting) return
    setBulkDeleting(true)
    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      const api = createApi(token)
      const res = await api.bulkDeleteClasses(selectedCohortIds)
      toast.add({
        title: "Cohorts Deleted",
        description: `Successfully deleted ${res.deleted_count} cohort(s).`,
        type: "success",
      })
      setSelectedCohortIds([])
      setBulkDeleteConfirmOpen(false)
      if (
        inspectedCohort &&
        selectedCohortIds.includes(inspectedCohort.id)
      ) {
        setInspectedCohort(null)
      }
      await reloadAll()
    } catch (err) {
      toast.add({
        title: "Bulk Delete Failed",
        description:
          err instanceof ApiError
            ? err.userMessage
            : err instanceof Error
              ? err.message
              : "Failed to delete selected cohorts",
        type: "error",
      })
    } finally {
      setBulkDeleting(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Subject Catalog State & CRUD
  // ---------------------------------------------------------------------------
  const [subjectSearch, setSubjectSearch] = React.useState("")
  const [subjectPage, setSubjectPage] = React.useState(1)
  const subjectPageSize = 10

  const [quickAddSubjectTitle, setQuickAddSubjectTitle] = React.useState("")
  const [quickAdding, setQuickAdding] = React.useState(false)

  const [subjectModalOpen, setSubjectModalOpen] = React.useState(false)
  const [editingSubject, setEditingSubject] = React.useState<Subject | null>(null)
  const [formSubjectName, setFormSubjectName] = React.useState("")
  const [subjectSubmitting, setSubjectSubmitting] = React.useState(false)

  const [deleteConfirmSubject, setDeleteConfirmSubject] =
    React.useState<Subject | null>(null)
  const [deleteSubjectSubmitting, setDeleteSubjectSubmitting] =
    React.useState(false)

  const filteredSubjects = React.useMemo(() => {
    if (!subjectSearch.trim()) return subjects
    const q = subjectSearch.toLowerCase().trim()
    return subjects.filter((s) => {
      const name = s.name.toLowerCase()
      const code = `sub-${String(s.id).padStart(2, "0")}`
      const subCourses = coursesBySubject.get(s.id) ?? []
      const hasTeacher = subCourses.some((c) =>
        c.default_teacher?.name?.toLowerCase().includes(q)
      )
      const hasCohort = subCourses.some((c) =>
        c.cohort_identifier?.toLowerCase().includes(q)
      )
      return (
        name.includes(q) ||
        code.includes(q) ||
        String(s.id).includes(q) ||
        hasTeacher ||
        hasCohort
      )
    })
  }, [subjects, subjectSearch, coursesBySubject])

  const paginatedSubjects = React.useMemo(() => {
    const start = (subjectPage - 1) * subjectPageSize
    return filteredSubjects.slice(start, start + subjectPageSize)
  }, [filteredSubjects, subjectPage, subjectPageSize])

  const totalSubjectPages =
    Math.ceil(filteredSubjects.length / subjectPageSize) || 1

  const handleQuickAddSubject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!quickAddSubjectTitle.trim() || quickAdding) return
    setQuickAdding(true)
    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      const api = createApi(token)
      const created = await api.createSubject({
        name: quickAddSubjectTitle.trim(),
      })
      toast.add({
        title: "Subject Added",
        description: `Subject "${created.name}" added to global catalog.`,
        type: "success",
      })
      setQuickAddSubjectTitle("")
      await queryClient.invalidateQueries({
        queryKey: apiQueryKeys.subjects(),
      })
    } catch (err) {
      toast.add({
        title: "Failed to Add Subject",
        description:
          err instanceof ApiError
            ? err.userMessage
            : err instanceof Error
              ? err.message
              : "Failed to add subject",
        type: "error",
      })
    } finally {
      setQuickAdding(false)
    }
  }

  const openAddSubjectModal = () => {
    setEditingSubject(null)
    setFormSubjectName("")
    setSubjectModalOpen(true)
  }

  const openEditSubjectModal = (sub: Subject) => {
    setEditingSubject(sub)
    setFormSubjectName(sub.name)
    setSubjectModalOpen(true)
  }

  const handleSubjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formSubjectName.trim() || subjectSubmitting) return
    setSubjectSubmitting(true)
    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      const api = createApi(token)

      if (editingSubject) {
        await api.updateSubject(editingSubject.id, {
          name: formSubjectName.trim(),
        })
        toast.add({
          title: "Subject Updated",
          description: `Subject "${formSubjectName.trim()}" updated.`,
          type: "success",
        })
      } else {
        const created = await api.createSubject({
          name: formSubjectName.trim(),
        })
        toast.add({
          title: "Subject Created",
          description: `Subject "${created.name}" created.`,
          type: "success",
        })
      }

      setSubjectModalOpen(false)
      setEditingSubject(null)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: apiQueryKeys.subjects() }),
        queryClient.invalidateQueries({ queryKey: ["courses"] }),
      ])
    } catch (err) {
      toast.add({
        title: "Failed to Save Subject",
        description:
          err instanceof ApiError
            ? err.userMessage
            : err instanceof Error
              ? err.message
              : "Failed to save subject",
        type: "error",
      })
    } finally {
      setSubjectSubmitting(false)
    }
  }

  const handleDeleteSubject = async (sub: Subject) => {
    if (deleteSubjectSubmitting) return
    setDeleteSubjectSubmitting(true)
    try {
      const token = await getToken()
      if (!token) throw new Error("No auth token available")
      const api = createApi(token)
      await api.deleteSubject(sub.id)
      toast.add({
        title: "Subject Deleted",
        description: `Subject "${sub.name}" removed from catalog.`,
        type: "success",
      })
      setDeleteConfirmSubject(null)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: apiQueryKeys.subjects() }),
        queryClient.invalidateQueries({ queryKey: ["courses"] }),
      ])
    } catch (err) {
      toast.add({
        title: "Failed to Delete Subject",
        description:
          err instanceof ApiError
            ? err.userMessage
            : err instanceof Error
              ? err.message
              : "Failed to delete subject",
        type: "error",
      })
    } finally {
      setDeleteSubjectSubmitting(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Guard screens
  // ---------------------------------------------------------------------------
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
          Please sign in to access Academics & Curriculum Hub.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 1. Tactical v2 SystemHeader */}
      <SystemHeader
        domain="ACADEMICS"
        breadcrumb={
          activeTab === "cohorts" ? "COHORTS" : "SUBJECT CATALOG"
        }
        title="Academics & Curriculum Hub"
        description="Consolidated academic operations: cohort streams, student enrollments, and global subject catalog."
        metrics={[
          {
            label: "COHORTS",
            value: classes.length,
          },
          {
            label: "SUBJECTS",
            value: subjects.length,
          },
          {
            label: "ENROLLMENT",
            value: totalEnrollmentCount,
          },
        ]}
        tabs={[
          { id: "cohorts", label: "Cohorts", count: classes.length },
          { id: "subjects", label: "Subject Catalog", count: subjects.length },
        ]}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        actions={
          activeTab === "cohorts" ? (
            <Button
              size="sm"
              onClick={openAddCohortModal}
              className="h-8 gap-1.5 rounded-sm px-3 font-mono text-xs font-semibold"
            >
              <Plus className="size-3.5" />
              Add Cohort
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={openAddSubjectModal}
              className="h-8 gap-1.5 rounded-sm px-3 font-mono text-xs font-semibold"
            >
              <Plus className="size-3.5" />
              Add Subject
            </Button>
          )
        }
      />

      {/* ==================================================================== */}
      {/* TAB 1: COHORTS                                                        */}
      {/* ==================================================================== */}
      {activeTab === "cohorts" && (
        <DataModule
          searchPlaceholder="Filter cohorts by code, stream, or education level..."
          searchValue={cohortSearch}
          onSearchChange={(val) => {
            setCohortSearch(val)
            setCohortPage(1)
          }}
          toolbarRight={
            <Button
              variant="outline"
              size="xs"
              onClick={reloadAll}
              disabled={isDataLoading}
              className="h-7 rounded-sm font-mono text-[11px] uppercase"
            >
              <RefreshCw
                className={cn("mr-1 size-3", isDataLoading && "animate-spin")}
              />
              Refresh
            </Button>
          }
          filters={
            <div className="flex items-center gap-1">
              {(
                [
                  { id: "ALL", label: "ALL" },
                  { id: "IG", label: "IG" },
                  { id: "IAL", label: "IAL" },
                  { id: "YR", label: "YR" },
                ] as const
              ).map((lvl) => {
                const active = levelFilter === lvl.id
                const count = levelCounts[lvl.id]
                const isEmpty = lvl.id !== "ALL" && count === 0

                return (
                  <button
                    key={lvl.id}
                    type="button"
                    onClick={() => {
                      setLevelFilter(lvl.id)
                      setCohortPage(1)
                    }}
                    title={
                      isEmpty
                        ? `No cohorts registered under ${lvl.label}`
                        : `${count} cohort${count === 1 ? "" : "s"} under ${lvl.label}`
                    }
                    className={cn(
                      "h-8 rounded-sm border px-2.5 font-mono text-[11px] font-semibold transition-colors uppercase",
                      active
                        ? "border-foreground bg-foreground text-background"
                        : isEmpty
                          ? "border-border/60 bg-background text-muted-foreground/40 hover:bg-muted/40 hover:text-muted-foreground"
                          : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {lvl.label}
                  </button>
                )
              })}
            </div>
          }
          selectedCount={selectedCohortIds.length}
          onClearSelection={() => setSelectedCohortIds([])}
          bulkActions={
            <Button
              variant="destructive"
              size="xs"
              onClick={() => setBulkDeleteConfirmOpen(true)}
              className="h-7 rounded-sm px-2 font-mono text-[11px]"
            >
              <Trash2 className="size-3 mr-1" />
              Delete Selected
            </Button>
          }
          totalCount={filteredCohorts.length}
          countLabel="COHORTS"
          page={cohortPage}
          totalPages={totalCohortPages}
          onPageChange={setCohortPage}
        >
          <Table>
            <TableHeader>
              <TableRow className="h-9 bg-muted/30 hover:bg-muted/30">
                <TableHead className="w-10 px-3.5">
                  <Checkbox
                    checked={allCurrentPageCohortsSelected}
                    onCheckedChange={toggleSelectAllCohorts}
                    aria-label="Select all cohorts on current page"
                  />
                </TableHead>
                <TableHead className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Code
                </TableHead>
                <TableHead className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Cohort Name
                </TableHead>
                <TableHead className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Level
                </TableHead>
                <TableHead className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Enrolled Students
                </TableHead>
                <TableHead className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Subject Offerings
                </TableHead>
                <TableHead className="text-right font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedCohorts.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="h-32 text-center font-mono text-xs text-muted-foreground"
                  >
                    No cohorts match the active filters or search query.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedCohorts.map((cls) => {
                  const isSelected = selectedCohortIds.includes(cls.id)
                  const cohortCourses = coursesByClass.get(cls.id) ?? []
                  const enrolledCount = studentCountByClass.get(cls.id) ?? 0

                  return (
                    <TableRow
                      key={cls.id}
                      onClick={() => openCohortInspector(cls, "inspect")}
                      className={cn(
                        "h-11 cursor-pointer transition-colors hover:bg-muted/40",
                        isSelected && "bg-muted/30"
                      )}
                    >
                      <TableCell
                        className="px-3.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelectCohort(cls.id)}
                          aria-label={`Select cohort ${formatCohortIdentifier(cls)}`}
                        />
                      </TableCell>
                      <TableCell>
                        <CodeChip accent>
                          {formatCohortIdentifier(cls)}
                        </CodeChip>
                      </TableCell>
                      <TableCell className="text-sm font-medium text-foreground">
                        {formatClassLabel(cls)}
                      </TableCell>
                      <TableCell>
                        <TelemetryTag status="info">
                          {cls.education_level}
                        </TelemetryTag>
                      </TableCell>
                      <TableCell className="font-mono text-xs tabular-nums text-foreground">
                        {enrolledCount} enrolled
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-1">
                          {cohortCourses.length > 0 ? (
                            <>
                              {cohortCourses.slice(0, 3).map((c) => (
                                <CodeChip key={c.id}>
                                  {c.subject?.name ?? "Subject"}
                                </CodeChip>
                              ))}
                              {cohortCourses.length > 3 && (
                                <span className="font-mono text-[10px] text-muted-foreground">
                                  +{cohortCourses.length - 3} more
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="font-mono text-xs text-muted-foreground">
                              0 subjects
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell
                        className="text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="outline"
                            size="xs"
                            onClick={() => openCohortInspector(cls, "inspect")}
                            className="h-7 rounded-sm px-2 font-mono text-[11px]"
                          >
                            Inspect →
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setDeleteConfirmCohort(cls)}
                            title="Delete cohort"
                            className="size-7 rounded-sm text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </DataModule>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: GLOBAL SUBJECT CATALOG (Option A)                              */}
      {/* ==================================================================== */}
      {activeTab === "subjects" && (
        <div className="space-y-3">
          {/* Quick Add Bar */}
          <form
            onSubmit={handleQuickAddSubject}
            className="flex flex-wrap items-center gap-2 rounded-sm border border-border bg-card p-3"
          >
            <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-primary">
              + QUICK ADD GLOBAL SUBJECT
            </span>
            <Input
              value={quickAddSubjectTitle}
              onChange={(e) => setQuickAddSubjectTitle(e.target.value)}
              placeholder="Subject title (e.g. Economics, Further Pure Mathematics)..."
              className="h-8 min-w-[240px] flex-1 rounded-sm border-border bg-background text-xs"
            />
            <Button
              type="submit"
              size="sm"
              disabled={quickAdding || !quickAddSubjectTitle.trim()}
              className="h-8 gap-1.5 rounded-sm px-3 font-mono text-xs font-semibold"
            >
              {quickAdding ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Plus className="size-3.5" />
              )}
              Add to Catalog
            </Button>
          </form>

          {/* Subject Catalog DataModule */}
          <DataModule
            searchPlaceholder="Search global subject catalog by code, title, cohort, or teacher..."
            searchValue={subjectSearch}
            onSearchChange={(val) => {
              setSubjectSearch(val)
              setSubjectPage(1)
            }}
            toolbarRight={
              <Button
                variant="outline"
                size="xs"
                onClick={reloadAll}
                disabled={isDataLoading}
                className="h-7 rounded-sm font-mono text-[11px] uppercase"
              >
                <RefreshCw
                  className={cn("mr-1 size-3", isDataLoading && "animate-spin")}
                />
                Refresh
              </Button>
            }
            totalCount={filteredSubjects.length}
            countLabel="SUBJECTS"
            page={subjectPage}
            totalPages={totalSubjectPages}
            onPageChange={setSubjectPage}
          >
            <Table>
              <TableHeader>
                <TableRow className="h-9 bg-muted/30 hover:bg-muted/30">
                  <TableHead className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Code
                  </TableHead>
                  <TableHead className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Subject Name
                  </TableHead>
                  <TableHead className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Linked Cohorts
                  </TableHead>
                  <TableHead className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Assigned Teachers
                  </TableHead>
                  <TableHead className="text-right font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedSubjects.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-32 text-center font-mono text-xs text-muted-foreground"
                    >
                      No subjects found matching your search.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedSubjects.map((sub) => {
                    const subCourses = coursesBySubject.get(sub.id) ?? []
                    const linkedCohortCodes = Array.from(
                      new Set(
                        subCourses
                          .map((c) =>
                            c.cohort_identifier ||
                            (c.class_obj ? formatCohortIdentifier(c.class_obj) : null)
                          )
                          .filter(Boolean) as string[]
                      )
                    )
                    const assignedTeacherNames = Array.from(
                      new Set(
                        subCourses
                          .map((c) => c.default_teacher?.name)
                          .filter(Boolean) as string[]
                      )
                    )

                    return (
                      <TableRow key={sub.id} className="h-11 hover:bg-muted/40">
                        <TableCell>
                          <CodeChip accent>
                            {`SUB-${String(sub.id).padStart(2, "0")}`}
                          </CodeChip>
                        </TableCell>
                        <TableCell className="text-sm font-medium text-foreground">
                          {sub.name}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap items-center gap-1">
                            {linkedCohortCodes.length > 0 ? (
                              linkedCohortCodes.map((code) => (
                                <CodeChip key={code}>{code}</CodeChip>
                              ))
                            ) : (
                              <span className="font-mono text-xs text-muted-foreground">
                                Unlinked
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {assignedTeacherNames.length > 0 ? (
                            assignedTeacherNames.join(", ")
                          ) : (
                            <span className="italic text-muted-foreground/70">
                              No teacher assigned
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => openEditSubjectModal(sub)}
                              title="Edit subject"
                              className="size-7 rounded-sm text-muted-foreground hover:text-foreground"
                            >
                              <Pencil className="size-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => setDeleteConfirmSubject(sub)}
                              title="Delete subject"
                              className="size-7 rounded-sm text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </DataModule>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 3. Slide-Over Cohort Inspector & Drawer Editor (<InspectorSheet />)  */}
      {/* ==================================================================== */}
      <InspectorSheet
        open={Boolean(inspectedCohort)}
        onOpenChange={(open) => {
          if (!open) {
            setInspectedCohort(null)
            setDrawerMode("inspect")
            setSelectedSubjectId("")
            setNewSubjectTitle("")
            setSelectedTeacherId("")
          }
        }}
        code={inspectedCohort ? formatCohortIdentifier(inspectedCohort) : "COHORT"}
        title={
          inspectedCohort
            ? drawerMode === "edit"
              ? `Edit ${formatCohortIdentifier(inspectedCohort)}`
              : `${formatCohortIdentifier(inspectedCohort)} — ${formatClassLabel(inspectedCohort)}`
            : "Cohort Inspector"
        }
        subtitle={
          drawerMode === "edit"
            ? "Update cohort education level and stream identifiers"
            : "Academics Hub · Cohort Telemetry, Linked Subjects, and Roster"
        }
        status={
          inspectedCohort
            ? {
                label: formatLevelBadge(inspectedCohort.education_level),
                variant: "neutral",
              }
            : undefined
        }
        fields={
          inspectedCohort
            ? [
                {
                  label: "LEVEL",
                  value: formatLevelBadge(inspectedCohort.education_level),
                  mono: true,
                },
                {
                  label: "ENROLLED STUDENTS",
                  value: `${studentCountByClass.get(inspectedCohort.id) ?? 0} Students`,
                  mono: true,
                },
                {
                  label: "SUBJECT OFFERINGS",
                  value: `${activeCohortCourses.length} Subjects`,
                  mono: true,
                },
              ]
            : undefined
        }
        footerActions={
          inspectedCohort ? (
            drawerMode === "inspect" ? (
              <div className="flex w-full items-center justify-between gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteConfirmCohort(inspectedCohort)}
                  className="h-8 rounded-sm font-mono text-xs text-destructive hover:bg-destructive/10 hover:text-destructive uppercase"
                >
                  <Trash2 className="mr-1.5 size-3.5" />
                  Delete Cohort
                </Button>
                <Link
                  href={`/classes/${inspectedCohort.id}`}
                  className={cn(
                    buttonVariants({ size: "sm", variant: "default" }),
                    "h-8 gap-1.5 rounded-sm font-mono text-xs font-semibold uppercase"
                  )}
                >
                  Open Cohort Hub
                  <ArrowRight className="size-3.5" />
                </Link>
              </div>
            ) : (
              <div className="flex w-full items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setDrawerMode("inspect")}
                  disabled={drawerSaving}
                  className="h-8 rounded-sm font-mono text-xs uppercase"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  form="cohort-drawer-edit-form"
                  size="sm"
                  disabled={drawerSaving || !drawerEditIdentifier.trim()}
                  className="h-8 gap-1.5 rounded-sm font-mono text-xs font-semibold uppercase"
                >
                  {drawerSaving && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
                  Save Changes
                </Button>
              </div>
            )
          ) : null
        }
      >
        {inspectedCohort && (
          <div className="space-y-4">
            {/* Mode Switcher Tab Bar right at the top of the drawer body */}
            <div className="flex items-center gap-1 rounded-sm border border-border bg-muted/40 p-1 font-mono text-xs">
              <button
                type="button"
                onClick={() => setDrawerMode("inspect")}
                className={cn(
                  "flex-1 rounded-sm py-1.5 text-center font-semibold uppercase transition-colors",
                  drawerMode === "inspect"
                    ? "bg-foreground text-background shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Overview & Offerings
              </button>
              <button
                type="button"
                onClick={() => setDrawerMode("edit")}
                className={cn(
                  "flex-1 rounded-sm py-1.5 text-center font-semibold uppercase transition-colors",
                  drawerMode === "edit"
                    ? "bg-foreground text-background shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Edit Cohort
              </button>
            </div>

            {drawerMode === "edit" ? (
              <form id="cohort-drawer-edit-form" onSubmit={handleSaveDrawerCohort} className="space-y-4">
                <div>
                  <label className="mb-1.5 block font-mono text-xs font-semibold uppercase text-muted-foreground">
                    Education Level <span className="text-destructive">*</span>
                  </label>
                  <Select
                    value={drawerEditLevel}
                    onValueChange={(val) =>
                      setDrawerEditLevel(val as ClassPayload["education_level"])
                    }
                  >
                    <SelectTrigger className="h-8 w-full justify-between rounded-sm font-mono text-xs">
                      <span className="truncate">
                        {getLevelOptionLabel(drawerEditLevel)}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {EDUCATION_LEVELS.map((lvl) => (
                        <SelectItem key={lvl.value} value={lvl.value} className="font-mono text-xs">
                          {lvl.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="mb-1.5 block font-mono text-xs font-semibold uppercase text-muted-foreground">
                    Cohort (Single Letter Only) <span className="text-destructive">*</span>
                  </label>
                  <Input
                    type="text"
                    value={drawerEditIdentifier}
                    onChange={(e) =>
                      setDrawerEditIdentifier(
                        sanitizeCohortIdentifierInput(e.target.value)
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
                  <label className="mb-1.5 block font-mono text-xs font-semibold uppercase text-muted-foreground">
                    Sub-Cohort Category (Optional Number)
                  </label>
                  <Input
                    type="text"
                    value={drawerEditSubCategory}
                    onChange={(e) =>
                      setDrawerEditSubCategory(
                        sanitizeCohortSubCategoryInput(e.target.value)
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
                      education_level: drawerEditLevel,
                      cohort_identifier: drawerEditIdentifier || "?",
                      cohort_sub_category: drawerEditSubCategory || null,
                    })}
                  </CodeChip>
                </div>
              </form>
            ) : (
              <div className="space-y-5">
                {/* Complete Cohort Hub Card */}
                <div className="flex items-center justify-between rounded-sm border border-border bg-muted/20 p-3">
                  <div className="min-w-0 space-y-0.5">
                    <div className="text-xs font-bold text-foreground">
                      Complete Cohort Hub & Timetable
                    </div>
                    <div className="font-mono text-[11px] text-muted-foreground">
                      {studentCountByClass.get(inspectedCohort.id) ?? 0} enrolled students · Full roster, schedule & attendance
                    </div>
                  </div>
                  <Link
                    href={`/classes/${inspectedCohort.id}`}
                    className={cn(
                      buttonVariants({ size: "xs", variant: "outline" }),
                      "h-7 shrink-0 gap-1 rounded-sm font-mono text-[11px] uppercase"
                    )}
                  >
                    Cohort Hub →
                  </Link>
                </div>

                {/* Linked Subject Offerings List */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <span className="size-1.5 rounded-[1px] bg-primary" />
                      LINKED SUBJECT OFFERINGS ({activeCohortCourses.length})
                    </span>
                  </div>

                  {activeCohortCourses.length === 0 ? (
                    <div className="rounded-sm border border-dashed border-border p-4 text-center font-mono text-xs text-muted-foreground">
                      No subjects linked to this cohort yet.
                    </div>
                  ) : (
                    <div className="divide-y divide-border/60 rounded-sm border border-border bg-muted/10">
                      {activeCohortCourses.map((c) => (
                        <div
                          key={c.id}
                          className="flex items-center justify-between gap-3 p-2.5 text-xs"
                        >
                          <div className="min-w-0 space-y-0.5">
                            <div className="flex items-center gap-2">
                              <CodeChip accent>
                                {`SUB-${String(c.subject?.id ?? c.subject_id ?? 0).padStart(2, "0")}`}
                              </CodeChip>
                              <span className="font-semibold text-foreground truncate">
                                {c.subject?.name ?? "Subject"}
                              </span>
                            </div>
                            <p className="font-mono text-[11px] text-muted-foreground">
                              {c.default_teacher?.name
                                ? `Teacher: ${c.default_teacher.name}`
                                : "No teacher assigned"}
                            </p>
                          </div>

                          <Button
                            variant="ghost"
                            size="icon-sm"
                            disabled={unlinkingCourseId === c.id}
                            onClick={() => handleUnlinkCourse(c.id)}
                            title="Unlink subject from cohort"
                            className="size-7 rounded-sm text-muted-foreground hover:text-destructive"
                          >
                            {unlinkingCourseId === c.id ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="size-3.5" />
                            )}
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Inline Link / Quick Add Subject Form */}
                <div className="rounded-sm border border-border bg-card p-3 space-y-3">
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-foreground">
                      + LINK SUBJECT TO COHORT
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setLinkSubjectMode("existing")}
                        className={cn(
                          "rounded-[2px] px-2 py-0.5 font-mono text-[10px] font-semibold uppercase transition-colors",
                          linkSubjectMode === "existing"
                            ? "bg-foreground text-background"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        Select Existing
                      </button>
                      <button
                        type="button"
                        onClick={() => setLinkSubjectMode("new")}
                        className={cn(
                          "rounded-[2px] px-2 py-0.5 font-mono text-[10px] font-semibold uppercase transition-colors",
                          linkSubjectMode === "new"
                            ? "bg-foreground text-background"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        Create New
                      </button>
                    </div>
                  </div>

                  {linkSubjectMode === "existing" ? (
                    <form
                      onSubmit={handleLinkExistingSubject}
                      className="space-y-2.5"
                    >
                      <div>
                        <label className="mb-1 block font-mono text-[10px] font-semibold uppercase text-muted-foreground">
                          Select Subject
                        </label>
                        <Select
                          value={selectedSubjectId}
                          onValueChange={(val) => setSelectedSubjectId(val ?? "")}
                        >
                          <SelectTrigger className="h-8 w-full justify-between rounded-sm text-xs font-mono">
                            <span
                              className={cn(
                                "truncate",
                                !selectedSubjectId && "text-muted-foreground"
                              )}
                            >
                              {selectedSubjectId
                                ? (() => {
                                    const s = subjects.find(
                                      (sub) => String(sub.id) === selectedSubjectId
                                    )
                                    return s
                                      ? `SUB-${String(s.id).padStart(2, "0")} — ${s.name}`
                                      : selectedSubjectId
                                  })()
                                : "Choose subject to link..."}
                            </span>
                          </SelectTrigger>
                          <SelectContent>
                            {availableSubjectsToLink.length === 0 ? (
                              <div className="p-2 text-center font-mono text-xs text-muted-foreground">
                                All catalog subjects already linked.
                              </div>
                            ) : (
                              availableSubjectsToLink.map((s) => (
                                <SelectItem
                                  key={s.id}
                                  value={String(s.id)}
                                  className="font-mono text-xs"
                                >
                                  SUB-{String(s.id).padStart(2, "0")} — {s.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="mb-1 block font-mono text-[10px] font-semibold uppercase text-muted-foreground">
                          Assigned Teacher (Optional)
                        </label>
                        <Select
                          value={selectedTeacherId}
                          onValueChange={(val) => setSelectedTeacherId(val ?? "")}
                        >
                          <SelectTrigger className="h-8 w-full justify-between rounded-sm text-xs font-mono">
                            <span
                              className={cn(
                                "truncate",
                                !selectedTeacherId && "text-muted-foreground"
                              )}
                            >
                              {selectedTeacherId
                                ? (teachers.find((t) => String(t.id) === selectedTeacherId)
                                    ?.name ?? selectedTeacherId)
                                : "None (Unassigned)"}
                            </span>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="" className="font-mono text-xs">
                              None (Unassigned)
                            </SelectItem>
                            {teachers.map((t) => (
                              <SelectItem
                                key={t.id}
                                value={String(t.id)}
                                className="font-mono text-xs"
                              >
                                {t.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <Button
                        type="submit"
                        size="sm"
                        disabled={!selectedSubjectId || isLinkingSubject}
                        className="w-full h-8 rounded-sm font-mono text-xs font-semibold gap-1"
                      >
                        {isLinkingSubject ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Plus className="size-3.5" />
                        )}
                        Link Subject to Cohort
                      </Button>
                    </form>
                  ) : (
                    <form
                      onSubmit={handleCreateAndLinkSubject}
                      className="space-y-2.5"
                    >
                      <div>
                        <label className="mb-1 block font-mono text-[10px] font-semibold uppercase text-muted-foreground">
                          New Subject Title
                        </label>
                        <Input
                          type="text"
                          value={newSubjectTitle}
                          onChange={(e) => setNewSubjectTitle(e.target.value)}
                          placeholder="e.g. Cambridge Business Studies..."
                          className="h-8 rounded-sm text-xs"
                          required
                        />
                      </div>

                      <div>
                        <label className="mb-1 block font-mono text-[10px] font-semibold uppercase text-muted-foreground">
                          Assigned Teacher (Optional)
                        </label>
                        <Select
                          value={selectedTeacherId}
                          onValueChange={(val) => setSelectedTeacherId(val ?? "")}
                        >
                          <SelectTrigger className="h-8 w-full justify-between rounded-sm text-xs font-mono">
                            <span
                              className={cn(
                                "truncate",
                                !selectedTeacherId && "text-muted-foreground"
                              )}
                            >
                              {selectedTeacherId
                                ? (teachers.find((t) => String(t.id) === selectedTeacherId)
                                    ?.name ?? selectedTeacherId)
                                : "None (Unassigned)"}
                            </span>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="" className="font-mono text-xs">
                              None (Unassigned)
                            </SelectItem>
                            {teachers.map((t) => (
                              <SelectItem
                                key={t.id}
                                value={String(t.id)}
                                className="font-mono text-xs"
                              >
                                {t.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <Button
                        type="submit"
                        size="sm"
                        disabled={!newSubjectTitle.trim() || isLinkingSubject}
                        className="w-full h-8 rounded-sm font-mono text-xs font-semibold gap-1"
                      >
                        {isLinkingSubject ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="size-3.5" />
                        )}
                        Create & Link to Cohort
                      </Button>
                    </form>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </InspectorSheet>

      {/* ==================================================================== */}
      {/* 4. Add Cohort Modal (<InspectorSheet />)                             */}
      {/* ==================================================================== */}
      <InspectorSheet
        open={createCohortModalOpen}
        onOpenChange={(val) => !val && setCreateCohortModalOpen(false)}
        code="NEW COHORT"
        title="Create Academic Cohort"
        subtitle="Configure education level, cohort stream, and initial subject offerings"
        status={{ label: "DRAFT", variant: "neutral" }}
        footerActions={
          <div className="flex w-full items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCreateCohortModalOpen(false)}
              className="h-8 rounded-sm font-mono text-xs uppercase"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="create-cohort-form"
              disabled={cohortSubmitting || !formCohortIdentifier.trim()}
              className="h-8 gap-1.5 rounded-sm font-mono text-xs font-semibold uppercase"
            >
              {cohortSubmitting && (
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              )}
              Create Cohort
            </Button>
          </div>
        }
      >
        <form id="create-cohort-form" onSubmit={handleCreateCohortSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block font-mono text-xs font-semibold uppercase text-muted-foreground">
              Education Level <span className="text-destructive">*</span>
            </label>
            <Select
              value={formEducationLevel}
              onValueChange={(val) =>
                setFormEducationLevel(val as ClassPayload["education_level"])
              }
            >
              <SelectTrigger className="h-8 w-full justify-between rounded-sm font-mono text-xs">
                <span className="truncate">
                  {getLevelOptionLabel(formEducationLevel)}
                </span>
              </SelectTrigger>
              <SelectContent>
                {EDUCATION_LEVELS.map((level) => (
                  <SelectItem key={level.value} value={level.value} className="font-mono text-xs">
                    {level.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="mb-1.5 block font-mono text-xs font-semibold uppercase text-muted-foreground">
              Cohort (Single Letter Only) <span className="text-destructive">*</span>
            </label>
            <Input
              type="text"
              value={formCohortIdentifier}
              onChange={(e) =>
                setFormCohortIdentifier(
                  sanitizeCohortIdentifierInput(e.target.value)
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
            <label className="mb-1.5 block font-mono text-xs font-semibold uppercase text-muted-foreground">
              Sub-Cohort Category (Optional Number)
            </label>
            <Input
              type="text"
              value={formCohortSubCategory}
              onChange={(e) =>
                setFormCohortSubCategory(
                  sanitizeCohortSubCategoryInput(e.target.value)
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

          {/* Live Resulting Identifier Preview */}
          <div className="flex items-center justify-between rounded-sm border border-border bg-muted/40 p-3">
            <span className="font-mono text-xs uppercase text-muted-foreground">
              Resulting Identifier:
            </span>
            <CodeChip accent>
              {formatCohortIdentifier({
                education_level: formEducationLevel,
                cohort_identifier: formCohortIdentifier || "?",
                cohort_sub_category: formCohortSubCategory || null,
              })}
            </CodeChip>
          </div>
        </form>
      </InspectorSheet>

      {/* Delete Single Cohort Confirm Dialog */}
      <ConfirmDialog
        open={deleteConfirmCohort !== null}
        title="Permanently Delete Cohort & All Records"
        description={
          deleteConfirmCohort
            ? `Are you sure you want to delete ${formatCohortIdentifier(
                deleteConfirmCohort
              )} (${formatClassLabel(
                deleteConfirmCohort
              )})? This will wipe this cohort, its timetable slots, sessions, and roster enrollments.`
            : ""
        }
        checkboxLabel="I understand that this action permanently deletes this cohort and all linked schedules/records."
        confirmLabel="Delete Everything"
        onConfirm={() =>
          deleteConfirmCohort && handleDeleteCohort(deleteConfirmCohort)
        }
        onCancel={() => setDeleteConfirmCohort(null)}
        loading={deleteSubmitting}
      />

      {/* Bulk Delete Cohorts Confirm Dialog */}
      <ConfirmDialog
        open={bulkDeleteConfirmOpen}
        title="Permanently Delete Multiple Cohorts"
        description={`Are you sure you want to delete ${selectedCohortIds.length} selected cohort(s)? This action will permanently remove all associated schedules and records.`}
        checkboxLabel={`I understand that this will permanently delete ${selectedCohortIds.length} cohort(s) and cascade delete all their records.`}
        confirmLabel="Delete Everything"
        onConfirm={handleBulkDeleteCohorts}
        onCancel={() => setBulkDeleteConfirmOpen(false)}
        loading={bulkDeleting}
      />

      {/* ==================================================================== */}
      {/* 5. Subject CRUD (<InspectorSheet />)                                 */}
      {/* ==================================================================== */}
      <InspectorSheet
        open={subjectModalOpen}
        onOpenChange={(val) => !val && setSubjectModalOpen(false)}
        code={
          editingSubject
            ? (editingSubject as any).code || `SUB-${String(editingSubject.id).padStart(2, "0")}`
            : "NEW SUBJECT"
        }
        title={
          editingSubject
            ? `Edit ${editingSubject.name}`
            : "Add Subject to Catalog"
        }
        subtitle="Define subject name and examination syllabus code"
        status={{
          label: editingSubject ? "CATALOG ITEM" : "NEW SUBJECT",
          variant: "neutral",
        }}
        footerActions={
          <div className="flex w-full items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSubjectModalOpen(false)}
              className="h-8 rounded-sm font-mono text-xs uppercase"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="subject-modal-form"
              disabled={subjectSubmitting || !formSubjectName.trim()}
              className="h-8 gap-1.5 rounded-sm font-mono text-xs font-semibold uppercase"
            >
              {subjectSubmitting && (
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              )}
              {editingSubject ? "Save Changes" : "Create Subject"}
            </Button>
          </div>
        }
      >
        <form id="subject-modal-form" onSubmit={handleSubjectSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block font-mono text-xs font-semibold uppercase text-muted-foreground">
              Subject Name <span className="text-destructive">*</span>
            </label>
            <Input
              type="text"
              value={formSubjectName}
              onChange={(e) => setFormSubjectName(e.target.value)}
              placeholder="e.g. Mathematics, Physics, Chemistry..."
              className="h-8 rounded-sm font-mono text-xs"
              required
            />
          </div>
        </form>
      </InspectorSheet>

      {/* Delete Subject Confirm Dialog */}
      <ConfirmDialog
        open={deleteConfirmSubject !== null}
        title="Permanently Delete Subject"
        description={
          deleteConfirmSubject
            ? `Are you sure you want to delete "${deleteConfirmSubject.name}" from the global subject catalog? Courses and timetable slots referencing this subject will be affected.`
            : ""
        }
        checkboxLabel="I understand that deleting this subject removes it from the catalog and unlinks associated offerings."
        confirmLabel="Delete Subject"
        onConfirm={() =>
          deleteConfirmSubject && handleDeleteSubject(deleteConfirmSubject)
        }
        onCancel={() => setDeleteConfirmSubject(null)}
        loading={deleteSubjectSubmitting}
      />
    </div>
  )
}

export default function ClassesPage() {
  return (
    <React.Suspense
      fallback={
        <div className="space-y-4">
          <div className="h-28 rounded-sm border border-border bg-card p-4 animate-pulse" />
          <div className="h-96 rounded-sm border border-border bg-card animate-pulse" />
        </div>
      }
    >
      <ClassesContent />
    </React.Suspense>
  )
}
