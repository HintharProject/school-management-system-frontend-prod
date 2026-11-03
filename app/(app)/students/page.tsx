"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { useAuth } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import {
  Download,
  Eye,
  Loader2,
  LogIn,
  Pencil,
  Plus,
  Printer,
  QrCode,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  ShieldOff,
  Trash2,
  Upload,
  UserCheck,
  X,
} from "lucide-react"

import { createApi, ApiError } from "@/lib/api"
import { SCHOOL_CODES, type Student, StudentPayload } from "@/lib/types"
import { useClassesQuery } from "@/hooks/use-api-queries"
import { formatClassLabel, formatClassLabelText } from "@/lib/format-class"
import { useSortableData } from "@/lib/use-sortable-data"
import { useServerPagination } from "@/components/use-server-pagination"
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableHeadSortable,
  TableBody,
  TableCell,
} from "@/components/ui/table"
import {
  SystemHeader,
  DataModule,
  InspectorSheet,
  CodeChip,
  TelemetryTag,
} from "@/components/design-system/v2-primitives"
import { QrCanvas } from "@/components/qr-canvas"
import { downloadQrPng, downloadQrZip, qrDownloadFilename } from "@/lib/qr-download"
import { toast } from "@/components/ui/toast"
import { cn, toLocalDateString } from "@/lib/utils"

const BulkImportModal = dynamic(
  () => import("@/components/bulk-import-modal").then((m) => m.BulkImportModal),
  { ssr: false }
)

// ---------------------------------------------------------------------------
// Student Creation Modal (for creating brand new students only)
// ---------------------------------------------------------------------------
function StudentCreateModal({
  open,
  onClose,
  onSave,
  saving,
  schoolCode,
  setSchoolCode,
}: {
  open: boolean
  onClose: () => void
  onSave: (payload: StudentPayload) => Promise<void>
  saving: boolean
  schoolCode: string
  setSchoolCode: (val: string) => void
}) {
  const [name, setName] = React.useState("")
  const [dob, setDob] = React.useState("")
  const [enrollmentDate, setEnrollmentDate] = React.useState(() => toLocalDateString())
  const [contact, setContact] = React.useState("")
  const [examCandidateNumber, setExamCandidateNumber] = React.useState("")

  React.useEffect(() => {
    if (open) {
      setName("")
      setDob("")
      setEnrollmentDate(toLocalDateString())
      setContact("")
      setExamCandidateNumber("")
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    const payload: StudentPayload = { name: name.trim(), school_code: schoolCode }
    if (dob) payload.dob = dob
    if (enrollmentDate) payload.enrollment_date = enrollmentDate
    if (contact.trim()) payload.contact = contact.trim()
    if (examCandidateNumber.trim()) payload.exam_candidate_number = examCandidateNumber.trim()
    await onSave(payload)
  }

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent onClose={onClose}>
        <DialogHeader>
          <DialogTitle>Enroll New Student</DialogTitle>
          <DialogDescription>
            Enter student details and school stream to create a new profile.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              School Stream <span className="text-destructive">*</span>
            </label>
            <Select value={schoolCode} onValueChange={(val) => val && setSchoolCode(val)}>
              <SelectTrigger className="mt-1.5 w-full font-mono text-xs">
                <span className="truncate">
                  {SCHOOL_CODES.find((sc) => sc.value === schoolCode)
                    ? `${schoolCode} — ${SCHOOL_CODES.find((sc) => sc.value === schoolCode)?.label}`
                    : schoolCode}
                </span>
              </SelectTrigger>
              <SelectContent>
                {SCHOOL_CODES.map((sc) => (
                  <SelectItem key={sc.value} value={sc.value}>
                    {sc.value} — {sc.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Full Name <span className="text-destructive">*</span>
            </label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g. Aung Myo Thu"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Date of Birth</label>
            <Input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Enrollment Date</label>
            <Input
              type="date"
              value={enrollmentDate}
              onChange={(e) => setEnrollmentDate(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Guardian Contact</label>
            <Input
              type="text"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="Phone number or email"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Exam Candidate Number (UCI)</label>
            <Input
              type="text"
              value={examCandidateNumber}
              onChange={(e) => setExamCandidateNumber(e.target.value)}
              placeholder="e.g. 1042-990"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !name.trim()}>
              {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
              Create Student
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ===========================================================================
// Page component
// ===========================================================================
export default function StudentsPage() {
  const { getToken, isLoaded, isSignedIn } = useAuth()
  const router = useRouter()
  const classesQuery = useClassesQuery(!!isLoaded && !!isSignedIn)
  const classes = classesQuery.data ?? []

  // Current server page of students
  const [pageStudents, setPageStudents] = React.useState<Student[]>([])
  const [loading, setLoading] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [debouncedQuery, setDebouncedQuery] = React.useState("")
  const serverPg = useServerPagination(50)

  // Filters
  const [schoolFilter, setSchoolFilter] = React.useState<string>("all")
  const [classFilter, setClassFilter] = React.useState<string>("all")
  const [groupByClass, setGroupByClass] = React.useState(false)

  // Selection state
  const [selectedIds, setSelectedIds] = React.useState<number[]>([])
  const [bulkDeleting, setBulkDeleting] = React.useState(false)
  const [bulkConfirmOpen, setBulkConfirmOpen] = React.useState(false)
  const [bulkExporting, setBulkExporting] = React.useState(false)

  // Modal & form state for creation
  const [createModalOpen, setCreateModalOpen] = React.useState(false)
  const [bulkModalOpen, setBulkModalOpen] = React.useState(false)
  const [savingNewStudent, setSavingNewStudent] = React.useState(false)
  const [createSchoolCode, setCreateSchoolCode] = React.useState<string>("HIS")

  // Delete confirmation
  const [deletingStudent, setDeletingStudent] = React.useState<Student | null>(null)
  const [deleting, setDeleting] = React.useState(false)

  // InspectorSheet state for Student QR Badge + Profile Edit
  const [inspectedStudent, setInspectedStudent] = React.useState<Student | null>(null)
  const [inspectorMode, setInspectorMode] = React.useState<"telemetry" | "edit">("telemetry")
  const [inspectedToken, setInspectedToken] = React.useState<string | null>(null)
  const [loadingToken, setLoadingToken] = React.useState(false)
  const [tokenActionLoading, setTokenActionLoading] = React.useState(false)
  const [manualCheckingIn, setManualCheckingIn] = React.useState(false)

  // In-drawer Edit Profile state
  const [editName, setEditName] = React.useState("")
  const [editSchoolCode, setEditSchoolCode] = React.useState("HIS")
  const [editDob, setEditDob] = React.useState("")
  const [editEnrollmentDate, setEditEnrollmentDate] = React.useState("")
  const [editContact, setEditContact] = React.useState("")
  const [editExamCandidateNumber, setEditExamCandidateNumber] = React.useState("")
  const [savingEditProfile, setSavingEditProfile] = React.useState(false)

  // Sync drawer edit form when inspected student changes
  React.useEffect(() => {
    if (inspectedStudent) {
      setEditName(inspectedStudent.name)
      setEditSchoolCode(inspectedStudent.school_code)
      setEditDob(inspectedStudent.dob ?? "")
      setEditEnrollmentDate(
        inspectedStudent.enrollment_date
          ? inspectedStudent.enrollment_date.slice(0, 10)
          : toLocalDateString()
      )
      setEditContact(inspectedStudent.contact ?? "")
      setEditExamCandidateNumber(inspectedStudent.exam_candidate_number ?? "")
    }
  }, [inspectedStudent])

  // Debounce search input
  React.useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(searchQuery.trim()), 300)
    return () => clearTimeout(id)
  }, [searchQuery])

  const getApi = React.useCallback(async () => {
    const token = await getToken()
    if (!token) throw new Error("No auth token available")
    return createApi(token)
  }, [getToken])

  const patchStudentLocal = React.useCallback(
    (id: number, patch: Partial<Student> & { check_in_token?: string }) => {
      setPageStudents((prev) =>
        prev.map((s) => (s.id === id ? { ...s, ...patch } : s))
      )
      setInspectedStudent((prev) =>
        prev && prev.id === id ? { ...prev, ...patch } : prev
      )
    },
    []
  )

  const fetchPage = React.useCallback(async () => {
    const api = await getApi()
    const data = await api.listStudentsPage({
      page: serverPg.page,
      page_size: serverPg.pageSize,
      q: debouncedQuery || undefined,
      school_code: schoolFilter === "all" ? undefined : schoolFilter,
      class_id: classFilter === "all" ? undefined : classFilter,
    })
    setPageStudents(data.results)
    serverPg.setTotalItems(data.count)
  }, [getApi, serverPg.page, serverPg.pageSize, serverPg.setTotalItems, debouncedQuery, schoolFilter, classFilter])

  const loadData = React.useCallback(async () => {
    setLoading(true)
    setSelectedIds([])
    try {
      await fetchPage()
    } catch (err) {
      const msg = err instanceof ApiError ? err.userMessage : "Failed to load students"
      toast.add({ title: msg, type: "error" })
    } finally {
      setLoading(false)
    }
  }, [fetchPage])

  React.useEffect(() => {
    if (isLoaded && isSignedIn) {
      void loadData()
    }
  }, [isLoaded, isSignedIn, loadData])

  // Reset to page 1 on filter changes
  const prevFilterRef = React.useRef<string>("")
  React.useEffect(() => {
    const current = `${debouncedQuery}|${schoolFilter}|${classFilter}`
    if (prevFilterRef.current && prevFilterRef.current !== current) {
      serverPg.setPage(1)
    }
    prevFilterRef.current = current
  }, [debouncedQuery, schoolFilter, classFilter, serverPg])

  // Sorting
  const { items: sortedStudents, requestSort, sortConfig } = useSortableData(pageStudents, "id", "asc")
  const displayedStudents = sortedStudents

  const groupedStudents = React.useMemo(() => {
    if (!groupByClass) {
      return [{ key: "all", label: null as string | null, students: displayedStudents }]
    }
    const map = new Map<string, Student[]>()
    for (const s of displayedStudents) {
      const key = formatClassLabelText(s.class_labels?.[0]?.trim() || "Unassigned")
      const list = map.get(key) ?? []
      list.push(s)
      map.set(key, list)
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, students]) => ({ key, label: key, students }))
  }, [groupByClass, displayedStudents])

  const totalStudentsCount = serverPg.totalItems

  // Load student QR token when opening InspectorSheet
  React.useEffect(() => {
    if (!inspectedStudent) {
      setInspectedToken(null)
      return
    }

    if (inspectedStudent.check_in_token) {
      setInspectedToken(inspectedStudent.check_in_token)
      return
    }

    let cancelled = false
    setLoadingToken(true)
    getApi()
      .then((api) => api.getCheckInToken(inspectedStudent.id))
      .then((res) => {
        if (!cancelled && res.check_in_token) {
          setInspectedToken(res.check_in_token)
          patchStudentLocal(inspectedStudent.id, { check_in_token: res.check_in_token })
        }
      })
      .catch(() => {
        // Token might not exist yet
      })
      .finally(() => {
        if (!cancelled) setLoadingToken(false)
      })

    return () => {
      cancelled = true
    }
  }, [inspectedStudent, getApi, patchStudentLocal])

  // Save changes from in-drawer Edit Profile
  const handleSaveDrawerProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inspectedStudent || !editName.trim()) return

    setSavingEditProfile(true)
    const payload: StudentPayload = {
      name: editName.trim(),
      school_code: editSchoolCode,
      dob: editDob || null,
      enrollment_date: editEnrollmentDate || toLocalDateString(),
      contact: editContact.trim() || null,
      exam_candidate_number: editExamCandidateNumber.trim() || null,
    }

    try {
      const api = await getApi()
      const updated = await api.updateStudent(inspectedStudent.id, payload)
      patchStudentLocal(inspectedStudent.id, {
        name: updated.name,
        school_code: updated.school_code,
        dob: updated.dob,
        enrollment_date: updated.enrollment_date,
        contact: updated.contact,
        exam_candidate_number: updated.exam_candidate_number,
      })
      toast.add({
        title: `Profile for "${updated.name}" updated successfully.`,
        type: "success",
      })
      setInspectorMode("telemetry")
    } catch (err) {
      const msg = err instanceof ApiError ? err.userMessage : "Failed to update student profile"
      toast.add({ title: msg, type: "error" })
    } finally {
      setSavingEditProfile(false)
    }
  }

  // Inspector actions
  const handleRegenerateQrToken = async () => {
    if (!inspectedStudent) return
    setTokenActionLoading(true)
    try {
      const api = await getApi()
      const res = await api.regenerateCheckInToken(inspectedStudent.id)
      setInspectedToken(res.check_in_token)
      patchStudentLocal(inspectedStudent.id, {
        check_in_token: res.check_in_token,
        check_in_token_active: res.check_in_token_active ?? true,
      })
      toast.add({ title: "New QR credential generated successfully.", type: "success" })
    } catch (err) {
      const msg = err instanceof ApiError ? err.userMessage : "Failed to rotate token"
      toast.add({ title: msg, type: "error" })
    } finally {
      setTokenActionLoading(false)
    }
  }

  const handleToggleQrActive = async () => {
    if (!inspectedStudent) return
    setTokenActionLoading(true)
    const shouldActivate = inspectedStudent.check_in_token_active === false
    try {
      const api = await getApi()
      const res = shouldActivate
        ? await api.activateCheckInToken(inspectedStudent.id)
        : await api.deactivateCheckInToken(inspectedStudent.id)
      patchStudentLocal(inspectedStudent.id, {
        check_in_token_active: res.check_in_token_active,
      })
      toast.add({
        title: shouldActivate ? "QR badge activated." : "QR badge revoked.",
        type: "success",
      })
    } catch (err) {
      const msg = err instanceof ApiError ? err.userMessage : "Failed to update badge status"
      toast.add({ title: msg, type: "error" })
    } finally {
      setTokenActionLoading(false)
    }
  }

  const handleDownloadQrPng = async () => {
    if (!inspectedStudent || !inspectedToken) return
    try {
      const filename = qrDownloadFilename(inspectedStudent)
      await downloadQrPng(inspectedToken, filename)
      toast.add({ title: `Downloaded ${filename}`, type: "success" })
    } catch {
      toast.add({ title: "Failed to download QR badge", type: "error" })
    }
  }

  const handlePrintBadge = () => {
    if (!inspectedStudent || !inspectedToken) return
    const printWindow = window.open("", "_blank", "width=420,height=560")
    if (!printWindow) {
      window.print()
      return
    }
    const cohortText =
      inspectedStudent.class_labels?.filter(Boolean).map(formatClassLabelText).join(", ") ||
      "Student"
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Student QR Pass - ${inspectedStudent.name}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace; margin: 0; padding: 24px; text-align: center; background: #fff; }
            .badge-card { border: 2px solid #18181b; border-radius: 6px; padding: 24px 20px; max-width: 320px; margin: 0 auto; box-sizing: border-box; }
            .school-line { font-family: monospace; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #71717a; margin-bottom: 8px; font-weight: bold; }
            .name { font-size: 18px; font-weight: bold; margin: 6px 0 4px; color: #09090b; }
            .cohort { font-size: 12px; color: #52525b; margin-bottom: 12px; }
            .code-box { font-family: monospace; font-size: 13px; font-weight: 700; background: #f4f4f5; border: 1px solid #e4e4e7; padding: 4px 10px; border-radius: 3px; display: inline-block; margin-bottom: 14px; }
            .qr-container { margin: 8px 0; }
            .qr-container img { width: 180px; height: 180px; }
            .token-str { font-family: monospace; font-size: 10px; color: #71717a; word-break: break-all; margin-top: 10px; }
            .footer-line { font-family: monospace; font-size: 9px; color: #a1a1aa; text-transform: uppercase; margin-top: 16px; border-top: 1px dashed #e4e4e7; padding-top: 8px; }
          </style>
        </head>
        <body>
          <div class="badge-card">
            <div class="school-line">CAMPUS CREDENTIAL // ${inspectedStudent.school_code}</div>
            <div class="name">${inspectedStudent.name}</div>
            <div class="cohort">${cohortText}</div>
            <div class="code-box">${inspectedStudent.unique_code}</div>
            <div class="qr-container" id="qr-output"></div>
            <div class="token-str">${inspectedToken}</div>
            <div class="footer-line">Hinthar Education System</div>
          </div>
        </body>
      </html>
    `)
    printWindow.document.close()
    void import("qrcode").then(({ default: QRCode }) => {
      QRCode.toDataURL(inspectedToken, { width: 200, margin: 1 }).then((url) => {
        const out = printWindow.document.getElementById("qr-output")
        if (out) {
          out.innerHTML = `<img src="${url}" />`
          setTimeout(() => {
            printWindow.focus()
            printWindow.print()
          }, 300)
        }
      })
    })
  }

  const handleManualCheckInFromInspector = async () => {
    if (!inspectedStudent) return
    setManualCheckingIn(true)
    try {
      const api = await getApi()
      await api.createCheckInManual(inspectedStudent.id)
      toast.add({
        title: `${inspectedStudent.name} checked in at gate.`,
        type: "success",
      })
    } catch (err) {
      const msg = err instanceof ApiError ? err.userMessage : "Failed to record check-in"
      toast.add({ title: msg, type: "error" })
    } finally {
      setManualCheckingIn(false)
    }
  }

  // Bulk Actions
  const handleBulkDownloadQrZip = async () => {
    if (selectedIds.length === 0) return
    setBulkExporting(true)
    try {
      const api = await getApi()
      const items: { token: string; filename: string }[] = []
      for (const id of selectedIds) {
        const student = pageStudents.find((s) => s.id === id)
        try {
          const { check_in_token } = await api.getCheckInToken(id)
          if (check_in_token) {
            items.push({
              token: check_in_token,
              filename: qrDownloadFilename(student ?? { id, unique_code: null, name: null }),
            })
          }
        } catch {
          // Skip if missing token
        }
      }
      if (items.length === 0) {
        toast.add({ title: "No active QR tokens found for selected students.", type: "error" })
        return
      }
      await downloadQrZip(items, `student-qr-badges-${toLocalDateString()}.zip`)
      toast.add({ title: `Exported ${items.length} QR badge(s) to ZIP.`, type: "success" })
    } catch {
      toast.add({ title: "Failed to create QR badge zip", type: "error" })
    } finally {
      setBulkExporting(false)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return
    setBulkDeleting(true)
    try {
      const api = await getApi()
      const res = await api.bulkDeleteStudents(selectedIds)
      toast.add({ title: `Deleted ${res.deleted_count} student(s).`, type: "success" })
      setSelectedIds([])
      setBulkConfirmOpen(false)
      await fetchPage()
    } catch (err) {
      const msg = err instanceof ApiError ? err.userMessage : "Bulk delete failed"
      toast.add({ title: msg, type: "error" })
    } finally {
      setBulkDeleting(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingStudent) return
    setDeleting(true)
    try {
      const api = await getApi()
      await api.deleteStudent(deletingStudent.id)
      toast.add({ title: "Student deleted successfully.", type: "success" })
      setDeletingStudent(null)
      setSelectedIds((prev) => prev.filter((id) => id !== deletingStudent.id))
      await fetchPage()
    } catch (err) {
      const msg = err instanceof ApiError ? err.userMessage : "Failed to delete student"
      toast.add({ title: msg, type: "error" })
    } finally {
      setDeleting(false)
    }
  }

  const handleSaveNewStudent = async (payload: StudentPayload) => {
    setSavingNewStudent(true)
    try {
      const api = await getApi()
      await api.createStudent(payload)
      toast.add({ title: `Student "${payload.name}" enrolled successfully.`, type: "success" })
      setCreateModalOpen(false)
      await fetchPage()
    } catch (err) {
      const msg = err instanceof ApiError ? err.userMessage : "Failed to create student"
      toast.add({ title: msg, type: "error" })
    } finally {
      setSavingNewStudent(false)
    }
  }

  // Selection handlers
  const currentPageIds = React.useMemo(
    () => displayedStudents.map((s) => s.id),
    [displayedStudents]
  )
  const allCurrentPageSelected =
    currentPageIds.length > 0 && currentPageIds.every((id) => selectedIds.includes(id))

  const toggleSelectAll = () => {
    if (allCurrentPageSelected) {
      setSelectedIds((prev) => prev.filter((id) => !currentPageIds.includes(id)))
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...currentPageIds])))
    }
  }

  const toggleSelectRow = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  // Active pass count
  const activeQrCount = React.useMemo(
    () => displayedStudents.filter((s) => s.check_in_token_active !== false).length,
    [displayedStudents]
  )

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
          Please sign in to access the Student Directory.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4 sm:p-6">
      {/* 1. Tactical System Header with Unified Directory Tabs */}
      <SystemHeader
        domain="DIRECTORY"
        breadcrumb="STUDENTS & QR PASSES"
        title="Student & Faculty Directory"
        description="Unified directory for student enrollment records, campus QR passes, and faculty profiles."
        metrics={[
          { label: "TOTAL STUDENTS", value: totalStudentsCount },
          { label: "CURRENT PAGE", value: displayedStudents.length },
          {
            label: "PASSES ACTIVE",
            value: `${activeQrCount}/${displayedStudents.length}`,
            tone: "success",
          },
        ]}
        tabs={[
          { id: "students", label: "Students", count: totalStudentsCount },
          { id: "teachers", label: "Teachers / Faculty" },
        ]}
        activeTab="students"
        onTabChange={(id) => {
          if (id === "teachers") router.push("/teachers")
        }}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBulkModalOpen(true)}
              className="rounded-sm font-mono text-xs uppercase"
            >
              <Upload className="mr-1.5 size-3.5" />
              Import CSV
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setCreateSchoolCode("HIS")
                setCreateModalOpen(true)
              }}
              className="rounded-sm font-mono text-xs uppercase"
            >
              <Plus className="mr-1.5 size-3.5" />
              Enroll Student
            </Button>
          </div>
        }
      />

      {/* 2. Students DataModule */}
      <DataModule
        searchPlaceholder="Search student name, identifier, or cohort..."
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        filters={
          <>
            {/* School Code Selector */}
            <Select
              value={schoolFilter}
              onValueChange={(val) => setSchoolFilter(val ?? "all")}
            >
              <SelectTrigger className="h-8 min-w-[160px] max-w-[220px] rounded-sm border-border bg-background font-mono text-xs">
                <span className="truncate">
                  {schoolFilter === "all"
                    ? "All Schools"
                    : (SCHOOL_CODES.find((sc) => sc.value === schoolFilter)
                        ? `${schoolFilter} — ${SCHOOL_CODES.find((sc) => sc.value === schoolFilter)?.label}`
                        : schoolFilter)}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Schools</SelectItem>
                {SCHOOL_CODES.map((sc) => (
                  <SelectItem key={sc.value} value={sc.value}>
                    {sc.value} — {sc.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Cohort Selector */}
            <Select
              value={classFilter}
              onValueChange={(val) => setClassFilter(val ?? "all")}
            >
              <SelectTrigger className="h-8 min-w-[180px] max-w-[260px] rounded-sm border-border bg-background font-mono text-xs">
                <span className="truncate">
                  {classFilter === "all"
                    ? "All Cohorts"
                    : (classes.find((c) => String(c.id) === classFilter)
                        ? formatClassLabel(classes.find((c) => String(c.id) === classFilter)!)
                        : `Cohort #${classFilter}`)}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cohorts</SelectItem>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {formatClassLabel(c)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Group by Cohort Toggle */}
            <button
              type="button"
              onClick={() => setGroupByClass((v) => !v)}
              className={cn(
                "h-8 rounded-sm border px-2.5 font-mono text-[11px] font-semibold uppercase transition-colors",
                groupByClass
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background text-muted-foreground hover:text-foreground"
              )}
            >
              Group Cohort
            </button>
          </>
        }
        selectedCount={selectedIds.length}
        onClearSelection={() => setSelectedIds([])}
        bulkActions={
          <>
            <Button
              variant="outline"
              size="xs"
              onClick={handleBulkDownloadQrZip}
              disabled={bulkExporting}
              className="h-6 rounded-sm px-2 font-mono text-[11px] uppercase"
            >
              {bulkExporting ? (
                <Loader2 className="mr-1 size-3 animate-spin" />
              ) : (
                <Download className="mr-1 size-3" />
              )}
              QR ZIP ({selectedIds.length})
            </Button>
            <Button
              variant="destructive"
              size="xs"
              onClick={() => setBulkConfirmOpen(true)}
              className="h-6 rounded-sm px-2 font-mono text-[11px] uppercase"
            >
              <Trash2 className="mr-1 size-3" />
              Delete ({selectedIds.length})
            </Button>
          </>
        }
        toolbarRight={
          <Button
            variant="outline"
            size="xs"
            onClick={() => void loadData()}
            disabled={loading}
            className="h-7 rounded-sm font-mono text-[11px] uppercase"
          >
            <RotateCcw className={cn("mr-1 size-3", loading && "animate-spin")} />
            Refresh
          </Button>
        }
        totalCount={totalStudentsCount}
        countLabel="STUDENTS"
        page={serverPg.page}
        totalPages={serverPg.totalPages}
        onPageChange={serverPg.setPage}
      >
        <Table>
          <TableHeader>
            <TableRow className="h-9 bg-muted/20 hover:bg-muted/20">
              <TableHead className="w-10 px-3 text-center">
                <Checkbox
                  checked={allCurrentPageSelected}
                  onCheckedChange={toggleSelectAll}
                  aria-label="Select all students on page"
                />
              </TableHead>
              <TableHeadSortable
                className="font-mono text-[11px] font-semibold tracking-wider text-muted-foreground uppercase"
                sortKey="unique_code"
                currentSortKey={sortConfig.key}
                currentSortOrder={sortConfig.order}
                onSort={requestSort}
              >
                Identifier
              </TableHeadSortable>
              <TableHeadSortable
                className="font-mono text-[11px] font-semibold tracking-wider text-muted-foreground uppercase"
                sortKey="name"
                currentSortKey={sortConfig.key}
                currentSortOrder={sortConfig.order}
                onSort={requestSort}
              >
                Student Name
              </TableHeadSortable>
              <TableHead className="font-mono text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                Enrolled Cohort
              </TableHead>
              <TableHead className="font-mono text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                Contact
              </TableHead>
              <TableHead className="font-mono text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                Pass Status
              </TableHead>
              <TableHead className="text-right font-mono text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 8 }).map((_, idx) => (
                <TableRow key={idx} className="h-10">
                  <TableCell colSpan={7} className="px-3.5">
                    <div className="h-4 w-full animate-pulse rounded bg-muted/40" />
                  </TableCell>
                </TableRow>
              ))
            ) : displayedStudents.length === 0 ? (
              <TableRow className="h-24">
                <TableCell
                  colSpan={7}
                  className="text-center font-mono text-xs text-muted-foreground"
                >
                  No students found matching your criteria.
                </TableCell>
              </TableRow>
            ) : (
              groupedStudents.flatMap((group) => [
                ...(group.label
                  ? [
                      <TableRow key={`g-${group.key}`} className="hover:bg-transparent">
                        <TableCell
                          colSpan={7}
                          className="bg-muted/30 py-1.5 px-3.5 font-mono text-[11px] font-bold uppercase tracking-wider text-foreground"
                        >
                          // COHORT: {group.label} ({group.students.length})
                        </TableCell>
                      </TableRow>,
                    ]
                  : []),
                ...group.students.map((student) => {
                  const isSelected = selectedIds.includes(student.id)
                  const cohortLabels =
                    student.class_labels?.filter(Boolean).map(formatClassLabelText) ?? []
                  const passActive = student.check_in_token_active !== false

                  return (
                    <TableRow
                      key={student.id}
                      data-state={isSelected ? "selected" : undefined}
                      onClick={() => {
                        setInspectedStudent(student)
                        setInspectorMode("telemetry")
                      }}
                      className="h-10 cursor-pointer hover:bg-muted/30"
                    >
                      <TableCell
                        className="w-10 px-3 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelectRow(student.id)}
                          aria-label={`Select student ${student.name}`}
                        />
                      </TableCell>
                      <TableCell className="px-3.5 font-mono">
                        <CodeChip accent>{student.unique_code}</CodeChip>
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-foreground">
                        {student.name}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {cohortLabels.length > 0 ? (
                            cohortLabels.map((lbl) => (
                              <CodeChip key={lbl}>{lbl}</CodeChip>
                            ))
                          ) : (
                            <span className="font-mono text-xs text-muted-foreground">—</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {student.contact || "—"}
                      </TableCell>
                      <TableCell>
                        <TelemetryTag status={passActive ? "active" : "inactive"}>
                          {passActive ? "ACTIVE" : "INACTIVE"}
                        </TelemetryTag>
                      </TableCell>
                      <TableCell
                        className="text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="outline"
                            size="xs"
                            onClick={() => {
                              setInspectedStudent(student)
                              setInspectorMode("telemetry")
                            }}
                            className="h-7 gap-1 font-mono text-[11px] uppercase"
                          >
                            <QrCode className="size-3" />
                            Inspect / Pass
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => setDeletingStudent(student)}
                            className="text-destructive hover:text-destructive"
                            title="Delete Student"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                }),
              ])
            )}
          </TableBody>
        </Table>
      </DataModule>

      {/* 3. Consolidated Slide-Over Student QR Badge + Profile Edit Inspector Sheet */}
      <InspectorSheet
        open={Boolean(inspectedStudent)}
        onOpenChange={(open) => {
          if (!open) {
            setInspectedStudent(null)
            setInspectedToken(null)
            setInspectorMode("telemetry")
          }
        }}
        code={inspectedStudent?.unique_code}
        title={inspectedStudent?.name ?? ""}
        subtitle={
          inspectorMode === "telemetry"
            ? "Slide-Over Student Credential & Telemetry"
            : "Edit Student Profile & Enrollment"
        }
        status={
          inspectedStudent
            ? {
                label:
                  inspectedStudent.check_in_token_active !== false
                    ? "QR PASS ACTIVE"
                    : "QR PASS REVOKED",
                tone:
                  inspectedStudent.check_in_token_active !== false
                    ? "active"
                    : "inactive",
              }
            : undefined
        }
        footerActions={
          inspectedStudent ? (
            inspectorMode === "telemetry" ? (
              <div className="flex w-full items-center justify-between gap-2">
                <Link
                  href={`/students/${inspectedStudent.id}/`}
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "font-mono text-xs uppercase"
                  )}
                >
                  Full Profile →
                </Link>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleManualCheckInFromInspector}
                  disabled={manualCheckingIn}
                  className="font-mono text-xs uppercase"
                >
                  {manualCheckingIn ? (
                    <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                  ) : (
                    <LogIn className="mr-1.5 size-3.5" />
                  )}
                  Gate Check-In
                </Button>
              </div>
            ) : (
              <div className="flex w-full items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setInspectorMode("telemetry")}
                  disabled={savingEditProfile}
                  className="font-mono text-xs uppercase"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  form="inspector-student-edit-form"
                  size="sm"
                  disabled={savingEditProfile || !editName.trim()}
                  className="font-mono text-xs uppercase"
                >
                  {savingEditProfile && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
                  Save Changes
                </Button>
              </div>
            )
          ) : null
        }
      >
        {inspectedStudent && (
          <div className="space-y-4">
            {/* Sub-mode switcher bar inside drawer */}
            <div className="flex items-center gap-1 rounded-sm border border-border bg-muted/40 p-1 font-mono text-xs">
              <button
                type="button"
                onClick={() => setInspectorMode("telemetry")}
                className={cn(
                  "flex-1 rounded-sm py-1.5 text-center font-semibold uppercase transition-colors",
                  inspectorMode === "telemetry"
                    ? "bg-foreground text-background shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                QR Pass & Telemetry
              </button>
              <button
                type="button"
                onClick={() => setInspectorMode("edit")}
                className={cn(
                  "flex-1 rounded-sm py-1.5 text-center font-semibold uppercase transition-colors",
                  inspectorMode === "edit"
                    ? "bg-foreground text-background shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Edit Profile
              </button>
            </div>

            {/* Mode 1: QR Pass & Telemetry View */}
            {inspectorMode === "telemetry" && (
              <div className="space-y-4">
                {/* Live QR Credential Box */}
                <div className="flex flex-col items-center gap-3 rounded-sm border border-border bg-muted/20 p-4">
                  <div className="flex w-full items-center justify-between">
                    <span className="font-mono text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                      LIVE CAMPUS QR PASS
                    </span>
                    {inspectedToken && (
                      <CodeChip className="max-w-[180px] truncate">
                        {inspectedToken}
                      </CodeChip>
                    )}
                  </div>

                  {loadingToken ? (
                    <div className="flex size-[172px] items-center justify-center rounded-sm border border-border bg-card">
                      <Loader2 className="size-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : inspectedStudent.check_in_token_active !== false && inspectedToken ? (
                    <div className="rounded-sm border border-border bg-white p-2 shadow-xs">
                      <QrCanvas value={inspectedToken} size={168} />
                    </div>
                  ) : (
                    <div className="flex size-[172px] flex-col items-center justify-center rounded-sm border border-dashed border-destructive/40 bg-destructive/5 p-4 text-center">
                      <ShieldOff className="size-6 text-destructive mb-1" />
                      <span className="font-mono text-xs font-semibold uppercase text-destructive">
                        PASS REVOKED
                      </span>
                      <span className="mt-1 font-mono text-[10px] text-muted-foreground">
                        Activate pass below to restore badge credentials.
                      </span>
                    </div>
                  )}

                  {/* QR Actions Directly Below QR Code */}
                  {inspectedStudent.check_in_token_active !== false && inspectedToken ? (
                    <div className="w-full space-y-2 pt-1">
                      <div className="grid grid-cols-3 gap-2 w-full">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleDownloadQrPng}
                          disabled={!inspectedToken}
                          className="h-8 font-mono text-xs uppercase"
                        >
                          <Download className="mr-1.5 size-3.5" />
                          PNG
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handlePrintBadge}
                          disabled={!inspectedToken}
                          className="h-8 font-mono text-xs uppercase"
                        >
                          <Printer className="mr-1.5 size-3.5" />
                          Print
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleRegenerateQrToken}
                          disabled={tokenActionLoading}
                          className="h-8 font-mono text-xs uppercase"
                          title="Generate a new secure QR token"
                        >
                          <RefreshCw
                            className={cn(
                              "mr-1.5 size-3.5",
                              tokenActionLoading && "animate-spin"
                            )}
                          />
                          Rotate
                        </Button>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleToggleQrActive}
                        disabled={tokenActionLoading}
                        className="w-full h-7 font-mono text-[11px] uppercase text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        <ShieldOff className="mr-1.5 size-3" />
                        Deactivate Pass
                      </Button>
                    </div>
                  ) : (
                    <div className="w-full pt-1">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={handleToggleQrActive}
                        disabled={tokenActionLoading}
                        className="w-full h-8 font-mono text-xs uppercase"
                      >
                        <ShieldCheck className="mr-1.5 size-3.5" />
                        Activate Pass
                      </Button>
                    </div>
                  )}
                </div>

                {/* Structured Telemetry Attributes */}
                <div>
                  <div className="mb-2 flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <span className="size-1.5 rounded-[1px] bg-primary" />
                    TELEMETRY ATTRIBUTES
                  </div>
                  <div className="divide-y divide-border/60 border-t border-b border-border/60">
                    {[
                      {
                        label: "STUDENT ID",
                        value: inspectedStudent.unique_code,
                        mono: true,
                      },
                      {
                        label: "SCHOOL STREAM",
                        value: inspectedStudent.school_code,
                        mono: true,
                      },
                      {
                        label: "ENROLLED COHORT",
                        value:
                          inspectedStudent.class_labels?.filter(Boolean).map(formatClassLabelText).join(", ") ||
                          "Unassigned",
                        mono: false,
                      },
                      {
                        label: "CONTACT",
                        value: inspectedStudent.contact || "—",
                        mono: true,
                      },
                      {
                        label: "DATE OF BIRTH",
                        value: inspectedStudent.dob || "—",
                        mono: true,
                      },
                      {
                        label: "UCI CANDIDATE #",
                        value: inspectedStudent.exam_candidate_number || "—",
                        mono: true,
                      },
                      {
                        label: "ENROLLMENT DATE",
                        value: inspectedStudent.enrollment_date,
                        mono: true,
                      },
                    ].map((field, idx) => (
                      <div
                        key={`${field.label}-${idx}`}
                        className="grid grid-cols-[130px_1fr] items-center gap-3 border-b border-border/60 py-2 text-xs last:border-b-0"
                      >
                        <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                          {field.label}
                        </span>
                        <div
                          className={cn(
                            "text-right font-medium text-foreground break-words",
                            field.mono && "font-mono tabular-nums"
                          )}
                        >
                          {field.value}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Mode 2: In-Drawer Edit Profile Form */}
            {inspectorMode === "edit" && (
              <form
                id="inspector-student-edit-form"
                onSubmit={handleSaveDrawerProfile}
                className="space-y-4"
              >
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    School Stream <span className="text-destructive">*</span>
                  </label>
                  <Select
                    value={editSchoolCode}
                    onValueChange={(val) => val && setEditSchoolCode(val)}
                  >
                    <SelectTrigger className="mt-1.5 w-full font-mono text-xs">
                      <span className="truncate">
                        {SCHOOL_CODES.find((sc) => sc.value === editSchoolCode)
                          ? `${editSchoolCode} — ${SCHOOL_CODES.find((sc) => sc.value === editSchoolCode)?.label}`
                          : editSchoolCode}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {SCHOOL_CODES.map((sc) => (
                        <SelectItem key={sc.value} value={sc.value}>
                          {sc.value} — {sc.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    Full Name <span className="text-destructive">*</span>
                  </label>
                  <Input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                    placeholder="Student full name"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium">Date of Birth</label>
                  <Input
                    type="date"
                    value={editDob}
                    onChange={(e) => setEditDob(e.target.value)}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium">Enrollment Date</label>
                  <Input
                    type="date"
                    value={editEnrollmentDate}
                    onChange={(e) => setEditEnrollmentDate(e.target.value)}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium">Guardian Contact</label>
                  <Input
                    type="text"
                    value={editContact}
                    onChange={(e) => setEditContact(e.target.value)}
                    placeholder="Phone number or email"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    Exam Candidate Number (UCI)
                  </label>
                  <Input
                    type="text"
                    value={editExamCandidateNumber}
                    onChange={(e) => setEditExamCandidateNumber(e.target.value)}
                    placeholder="e.g. 1042-990"
                  />
                </div>
              </form>
            )}
          </div>
        )}
      </InspectorSheet>

      {/* 4. Student Enrollment Creation Modal */}
      <StudentCreateModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSave={handleSaveNewStudent}
        saving={savingNewStudent}
        schoolCode={createSchoolCode}
        setSchoolCode={setCreateSchoolCode}
      />

      <ConfirmDialog
        open={deletingStudent !== null}
        title="Delete Student Record"
        description={
          deletingStudent
            ? `Are you sure you want to delete ${deletingStudent.name}? This action cannot be undone.`
            : ""
        }
        onConfirm={handleDelete}
        onCancel={() => setDeletingStudent(null)}
        loading={deleting}
      />

      <ConfirmDialog
        open={bulkConfirmOpen}
        title="Bulk Delete Students"
        description={`Are you sure you want to delete ${selectedIds.length} selected student(s)? This action cannot be undone.`}
        onConfirm={handleBulkDelete}
        onCancel={() => setBulkConfirmOpen(false)}
        loading={bulkDeleting}
      />

      {bulkModalOpen && (
        <BulkImportModal
          open={bulkModalOpen}
          onClose={() => setBulkModalOpen(false)}
          entityType="student"
          onImport={async (items) => {
            const api = await getApi()
            return api.bulkCreateStudents(items)
          }}
          onSuccess={(count) => {
            toast.add({ title: `Successfully imported ${count} student(s).`, type: "success" })
            void loadData()
          }}
        />
      )}
    </div>
  )
}
