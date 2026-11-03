"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import { useAuth } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import {
  Eye,
  Loader2,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  Upload,
  UserCheck,
  X,
} from "lucide-react"

import { createApi, ApiError } from "@/lib/api"
import {
  type Teacher,
  type TeacherPayload,
  EMPLOYMENT_TYPES,
  SCHOOL_CODES,
} from "@/lib/types"
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
import { toast } from "@/components/ui/toast"
import { cn, toLocalDateString } from "@/lib/utils"

const BulkImportModal = dynamic(
  () => import("@/components/bulk-import-modal").then((m) => m.BulkImportModal),
  { ssr: false }
)

// ---------------------------------------------------------------------------
// Teacher Creation Modal (brand new profile only)
// ---------------------------------------------------------------------------
function TeacherCreateModal({
  open,
  onClose,
  onSave,
  saving,
  schoolCode,
  setSchoolCode,
}: {
  open: boolean
  onClose: () => void
  onSave: (data: TeacherPayload) => Promise<void>
  saving: boolean
  schoolCode: string
  setSchoolCode: (sc: string) => void
}) {
  const [name, setName] = React.useState("")
  const [employmentType, setEmploymentType] = React.useState("")
  const [joinDate, setJoinDate] = React.useState(() => toLocalDateString())
  const [contact, setContact] = React.useState("")

  React.useEffect(() => {
    if (open) {
      setName("")
      setEmploymentType("")
      setJoinDate(toLocalDateString())
      setContact("")
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    const payload: TeacherPayload = {
      name: name.trim(),
      school_code: schoolCode,
      employment_type:
        employmentType === ""
          ? null
          : (employmentType as TeacherPayload["employment_type"]),
      join_date: joinDate || null,
      contact: contact.trim() === "" ? null : contact.trim(),
    }
    await onSave(payload)
  }

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent onClose={onClose}>
        <DialogHeader>
          <DialogTitle>Add Faculty Member</DialogTitle>
          <DialogDescription>
            Create a new teacher profile and configure employment stream.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              School Stream <span className="text-destructive">*</span>
            </label>
            <Select
              value={schoolCode}
              onValueChange={(value) => setSchoolCode(value ?? "HIS")}
            >
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
              placeholder="e.g. Daw Su Su"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Employment Type
            </label>
            <Select
              value={employmentType || "none"}
              onValueChange={(val) => setEmploymentType(!val || val === "none" ? "" : val)}
            >
              <SelectTrigger className="mt-1.5 w-full font-mono text-xs">
                <span className="truncate">
                  {employmentType
                    ? (EMPLOYMENT_TYPES.find((et) => et.value === employmentType)?.label ?? employmentType)
                    : "None / Unassigned"}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None / Unassigned</SelectItem>
                {EMPLOYMENT_TYPES.map((et) => (
                  <SelectItem key={et.value} value={et.value}>
                    {et.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Join Date</label>
            <Input
              type="date"
              value={joinDate}
              onChange={(e) => setJoinDate(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Contact Information</label>
            <Input
              type="text"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="Phone number or email"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !name.trim()}>
              {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
              Create Teacher
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function TeachersPage() {
  const { getToken, isLoaded, isSignedIn } = useAuth()
  const router = useRouter()

  // Teachers state
  const [pageTeachers, setPageTeachers] = React.useState<Teacher[]>([])
  const [loading, setLoading] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [debouncedQuery, setDebouncedQuery] = React.useState("")
  const serverPg = useServerPagination(50)

  // Selection state
  const [selectedIds, setSelectedIds] = React.useState<number[]>([])
  const [bulkDeleting, setBulkDeleting] = React.useState(false)
  const [bulkConfirmOpen, setBulkConfirmOpen] = React.useState(false)
  const [bulkModalOpen, setBulkModalOpen] = React.useState(false)

  // Create modal state
  const [createModalOpen, setCreateModalOpen] = React.useState(false)
  const [savingNewTeacher, setSavingNewTeacher] = React.useState(false)
  const [createSchoolCode, setCreateSchoolCode] = React.useState<string>("HIS")

  // Delete state
  const [deleting, setDeleting] = React.useState<Teacher | null>(null)
  const [deletingInProgress, setDeletingInProgress] = React.useState(false)

  // Filters
  const [typeFilter, setTypeFilter] = React.useState<string>("all")
  const [schoolFilter, setSchoolFilter] = React.useState<string>("all")

  // InspectorSheet state for Teacher (Telemetry vs Edit Profile)
  const [inspectedTeacher, setInspectedTeacher] = React.useState<Teacher | null>(null)
  const [inspectorMode, setInspectorMode] = React.useState<"telemetry" | "edit">("telemetry")

  // In-drawer Edit Profile state
  const [editName, setEditName] = React.useState("")
  const [editSchoolCode, setEditSchoolCode] = React.useState("HIS")
  const [editEmploymentType, setEditEmploymentType] = React.useState("")
  const [editJoinDate, setEditJoinDate] = React.useState("")
  const [editContact, setEditContact] = React.useState("")
  const [savingEditProfile, setSavingEditProfile] = React.useState(false)

  // Sync drawer edit form when inspected teacher changes
  React.useEffect(() => {
    if (inspectedTeacher) {
      setEditName(inspectedTeacher.name)
      setEditSchoolCode(inspectedTeacher.school_code)
      setEditEmploymentType(inspectedTeacher.employment_type ?? "")
      setEditJoinDate(
        inspectedTeacher.join_date ? inspectedTeacher.join_date.slice(0, 10) : ""
      )
      setEditContact(inspectedTeacher.contact ?? "")
    }
  }, [inspectedTeacher])

  // Debounce search
  React.useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(searchQuery.trim()), 300)
    return () => clearTimeout(id)
  }, [searchQuery])

  const getApi = React.useCallback(async () => {
    const token = await getToken()
    if (!token) throw new Error("No auth token available")
    return createApi(token)
  }, [getToken])

  const patchTeacherLocal = React.useCallback(
    (id: number, patch: Partial<Teacher>) => {
      setPageTeachers((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...patch } : t))
      )
      setInspectedTeacher((prev) =>
        prev && prev.id === id ? { ...prev, ...patch } : prev
      )
    },
    []
  )

  const fetchPage = React.useCallback(async () => {
    const api = await getApi()
    const data = await api.listTeachersPage({
      page: serverPg.page,
      page_size: serverPg.pageSize,
      q: debouncedQuery || undefined,
      school_code: schoolFilter === "all" ? undefined : schoolFilter,
      employment_type: typeFilter === "all" ? undefined : typeFilter,
    })
    setPageTeachers(data.results)
    serverPg.setTotalItems(data.count)
  }, [getApi, serverPg.page, serverPg.pageSize, serverPg.setTotalItems, debouncedQuery, schoolFilter, typeFilter])

  const loadTeachers = React.useCallback(async () => {
    setLoading(true)
    setSelectedIds([])
    try {
      await fetchPage()
    } catch (err) {
      const msg = err instanceof ApiError ? err.userMessage : "Failed to load teachers"
      toast.add({ title: msg, type: "error" })
    } finally {
      setLoading(false)
    }
  }, [fetchPage])

  React.useEffect(() => {
    if (isLoaded && isSignedIn) {
      void loadTeachers()
    }
  }, [isLoaded, isSignedIn, loadTeachers])

  // Reset to page 1 on filter changes
  const prevFilterRef = React.useRef<string>("")
  React.useEffect(() => {
    const current = `${debouncedQuery}|${schoolFilter}|${typeFilter}`
    if (prevFilterRef.current && prevFilterRef.current !== current) {
      serverPg.setPage(1)
    }
    prevFilterRef.current = current
  }, [debouncedQuery, schoolFilter, typeFilter, serverPg])

  // Sorting
  const { items: sortedTeachers, requestSort, sortConfig } = useSortableData(pageTeachers, "id", "asc")
  const displayedTeachers = sortedTeachers
  const totalTeachersCount = serverPg.totalItems

  // Selection handlers
  const currentPageIds = React.useMemo(
    () => displayedTeachers.map((t) => t.id),
    [displayedTeachers]
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

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return
    setBulkDeleting(true)
    try {
      const api = await getApi()
      const res = await api.bulkDeleteTeachers(selectedIds)
      toast.add({ title: `Deleted ${res.deleted_count} teacher(s).`, type: "success" })
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

  const handleSaveDrawerProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inspectedTeacher || !editName.trim()) return

    setSavingEditProfile(true)
    const payload: TeacherPayload = {
      name: editName.trim(),
      school_code: editSchoolCode,
      employment_type:
        editEmploymentType === "" || editEmploymentType === "none"
          ? null
          : (editEmploymentType as TeacherPayload["employment_type"]),
      join_date: editJoinDate || null,
      contact: editContact.trim() || null,
    }

    try {
      const api = await getApi()
      const updated = await api.updateTeacher(inspectedTeacher.id, payload)
      patchTeacherLocal(inspectedTeacher.id, {
        name: updated.name,
        school_code: updated.school_code,
        employment_type: updated.employment_type,
        join_date: updated.join_date,
        contact: updated.contact,
      })
      toast.add({
        title: `Faculty profile for "${updated.name}" updated successfully.`,
        type: "success",
      })
      setInspectorMode("telemetry")
    } catch (err) {
      const msg = err instanceof ApiError ? err.userMessage : "Failed to save teacher"
      toast.add({ title: msg, type: "error" })
    } finally {
      setSavingEditProfile(false)
    }
  }

  const handleSaveNewTeacher = async (payload: TeacherPayload) => {
    setSavingNewTeacher(true)
    try {
      const api = await getApi()
      await api.createTeacher(payload)
      toast.add({ title: `Teacher "${payload.name}" created.`, type: "success" })
      setCreateModalOpen(false)
      await fetchPage()
    } catch (err) {
      const msg = err instanceof ApiError ? err.userMessage : "Failed to save teacher"
      toast.add({ title: msg, type: "error" })
    } finally {
      setSavingNewTeacher(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleting) return
    setDeletingInProgress(true)
    try {
      const api = await getApi()
      await api.deleteTeacher(deleting.id)
      toast.add({ title: `Teacher "${deleting.name}" deleted.`, type: "success" })
      setSelectedIds((prev) => prev.filter((id) => id !== deleting.id))
      setDeleting(null)
      await fetchPage()
    } catch (err) {
      const msg = err instanceof ApiError ? err.userMessage : "Failed to delete teacher"
      toast.add({ title: msg, type: "error" })
    } finally {
      setDeletingInProgress(false)
    }
  }

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
          Please sign in to view the Faculty Directory.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4 sm:p-6">
      {/* 1. Tactical System Header with Directory Unified Tabs */}
      <SystemHeader
        domain="DIRECTORY"
        breadcrumb="FACULTY"
        title="Student & Faculty Directory"
        description="Unified directory for student enrollment records, campus QR passes, and faculty profiles."
        metrics={[
          { label: "TOTAL FACULTY", value: totalTeachersCount },
          { label: "CURRENT PAGE", value: displayedTeachers.length },
        ]}
        tabs={[
          { id: "students", label: "Students" },
          { id: "teachers", label: "Teachers / Faculty", count: totalTeachersCount },
        ]}
        activeTab="teachers"
        onTabChange={(id) => {
          if (id === "students") router.push("/students")
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
              Add Teacher
            </Button>
          </div>
        }
      />

      {/* 2. Teachers DataModule */}
      <DataModule
        searchPlaceholder="Search faculty by name or unique ID..."
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

            {/* Employment Type Selector */}
            <Select
              value={typeFilter}
              onValueChange={(val) => setTypeFilter(val ?? "all")}
            >
              <SelectTrigger className="h-8 min-w-[170px] max-w-[240px] rounded-sm border-border bg-background font-mono text-xs">
                <span className="truncate">
                  {typeFilter === "all"
                    ? "All Employment Types"
                    : (EMPLOYMENT_TYPES.find((t) => t.value === typeFilter)?.label ?? typeFilter)}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Employment Types</SelectItem>
                {EMPLOYMENT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        }
        selectedCount={selectedIds.length}
        onClearSelection={() => setSelectedIds([])}
        bulkActions={
          <Button
            variant="destructive"
            size="xs"
            onClick={() => setBulkConfirmOpen(true)}
            className="h-6 rounded-sm px-2 font-mono text-[11px] uppercase"
          >
            <Trash2 className="mr-1 size-3" />
            Delete ({selectedIds.length})
          </Button>
        }
        toolbarRight={
          <Button
            variant="outline"
            size="xs"
            onClick={() => void loadTeachers()}
            disabled={loading}
            className="h-7 rounded-sm font-mono text-[11px] uppercase"
          >
            <RotateCcw className={cn("mr-1 size-3", loading && "animate-spin")} />
            Refresh
          </Button>
        }
        totalCount={totalTeachersCount}
        countLabel="FACULTY"
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
                  aria-label="Select all faculty on page"
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
                Teacher Name
              </TableHeadSortable>
              <TableHeadSortable
                className="font-mono text-[11px] font-semibold tracking-wider text-muted-foreground uppercase"
                sortKey="school_code"
                currentSortKey={sortConfig.key}
                currentSortOrder={sortConfig.order}
                onSort={requestSort}
              >
                School
              </TableHeadSortable>
              <TableHeadSortable
                className="font-mono text-[11px] font-semibold tracking-wider text-muted-foreground uppercase"
                sortKey="employment_type"
                currentSortKey={sortConfig.key}
                currentSortOrder={sortConfig.order}
                onSort={requestSort}
              >
                Employment Type
              </TableHeadSortable>
              <TableHead className="font-mono text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                Contact
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
            ) : displayedTeachers.length === 0 ? (
              <TableRow className="h-24">
                <TableCell
                  colSpan={7}
                  className="text-center font-mono text-xs text-muted-foreground"
                >
                  No faculty found matching your filter criteria.
                </TableCell>
              </TableRow>
            ) : (
              displayedTeachers.map((teacher) => {
                const isSelected = selectedIds.includes(teacher.id)
                const isFullTime = teacher.employment_type === "full_time"
                const typeLabel =
                  EMPLOYMENT_TYPES.find((et) => et.value === teacher.employment_type)?.label ??
                  teacher.employment_type ??
                  "NONE"

                return (
                  <TableRow
                    key={teacher.id}
                    data-state={isSelected ? "selected" : undefined}
                    onClick={() => {
                      setInspectedTeacher(teacher)
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
                        onCheckedChange={() => toggleSelectRow(teacher.id)}
                        aria-label={`Select teacher ${teacher.name}`}
                      />
                    </TableCell>
                    <TableCell className="px-3.5 font-mono">
                      <CodeChip accent>{teacher.unique_code}</CodeChip>
                    </TableCell>
                    <TableCell className="text-xs font-semibold text-foreground">
                      {teacher.name}
                    </TableCell>
                    <TableCell>
                      <CodeChip>{teacher.school_code}</CodeChip>
                    </TableCell>
                    <TableCell>
                      <TelemetryTag status={isFullTime ? "active" : "neutral"}>
                        {typeLabel.toUpperCase()}
                      </TelemetryTag>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {teacher.contact || "—"}
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
                            setInspectedTeacher(teacher)
                            setInspectorMode("telemetry")
                          }}
                          className="h-7 font-mono text-[11px] uppercase"
                        >
                          Inspect
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => setDeleting(teacher)}
                          className="text-destructive hover:text-destructive"
                          title="Delete Faculty Profile"
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

      {/* 3. Consolidated Slide-Over Teacher Inspector Sheet */}
      <InspectorSheet
        open={Boolean(inspectedTeacher)}
        onOpenChange={(open) => {
          if (!open) {
            setInspectedTeacher(null)
            setInspectorMode("telemetry")
          }
        }}
        code={inspectedTeacher?.unique_code}
        title={inspectedTeacher?.name ?? ""}
        subtitle={
          inspectorMode === "telemetry"
            ? "Faculty Profile & Teaching Telemetry"
            : "Edit Faculty Profile & Employment Stream"
        }
        status={
          inspectedTeacher
            ? {
                label: inspectedTeacher.employment_type
                  ? inspectedTeacher.employment_type.toUpperCase().replace("_", " ")
                  : "FACULTY",
                tone:
                  inspectedTeacher.employment_type === "full_time"
                    ? "active"
                    : "neutral",
              }
            : undefined
        }
        footerActions={
          inspectedTeacher ? (
            inspectorMode === "telemetry" ? (
              <div className="flex w-full items-center justify-between gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setInspectedTeacher(null)}
                  className="font-mono text-xs uppercase"
                >
                  Close
                </Button>
                <Link
                  href={`/teachers/${inspectedTeacher.id}/`}
                  className={cn(
                    buttonVariants({ size: "sm", variant: "default" }),
                    "font-mono text-xs uppercase"
                  )}
                >
                  Full Profile →
                </Link>
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
                  form="inspector-teacher-edit-form"
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
        {inspectedTeacher && (
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
                Faculty Profile
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

            {/* Mode 1: Faculty Telemetry View */}
            {inspectorMode === "telemetry" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-sm border border-border bg-muted/20 p-3">
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-foreground">
                      Faculty Timetable & Workload
                    </div>
                    <div className="font-mono text-[11px] text-muted-foreground">
                      Access assigned courses, lesson occurrences, and substitute coverage history.
                    </div>
                  </div>
                  <Link
                    href={`/teachers/${inspectedTeacher.id}/`}
                    className={cn(
                      buttonVariants({ size: "xs", variant: "outline" }),
                      "font-mono text-[11px] uppercase shrink-0"
                    )}
                  >
                    Timetable →
                  </Link>
                </div>

                <div>
                  <div className="mb-2 flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <span className="size-1.5 rounded-[1px] bg-primary" />
                    TELEMETRY ATTRIBUTES
                  </div>
                  <div className="divide-y divide-border/60 border-t border-b border-border/60">
                    {[
                      {
                        label: "TEACHER ID",
                        value: inspectedTeacher.unique_code,
                        mono: true,
                      },
                      {
                        label: "SCHOOL CODE",
                        value: inspectedTeacher.school_code,
                        mono: true,
                      },
                      {
                        label: "EMPLOYMENT TYPE",
                        value:
                          EMPLOYMENT_TYPES.find(
                            (t) => t.value === inspectedTeacher.employment_type
                          )?.label ??
                          inspectedTeacher.employment_type ??
                          "None",
                        mono: false,
                      },
                      {
                        label: "JOIN DATE",
                        value: inspectedTeacher.join_date
                          ? inspectedTeacher.join_date.slice(0, 10)
                          : "—",
                        mono: true,
                      },
                      {
                        label: "CONTACT",
                        value: inspectedTeacher.contact || "—",
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
                id="inspector-teacher-edit-form"
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
                    placeholder="e.g. Daw Su Su"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Employment Type
                  </label>
                  <Select
                    value={editEmploymentType || "none"}
                    onValueChange={(val) =>
                      setEditEmploymentType(!val || val === "none" ? "" : val)
                    }
                  >
                    <SelectTrigger className="mt-1.5 w-full font-mono text-xs">
                      <span className="truncate">
                        {editEmploymentType
                          ? (EMPLOYMENT_TYPES.find((et) => et.value === editEmploymentType)?.label ?? editEmploymentType)
                          : "None / Unassigned"}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None / Unassigned</SelectItem>
                      {EMPLOYMENT_TYPES.map((et) => (
                        <SelectItem key={et.value} value={et.value}>
                          {et.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium">Join Date</label>
                  <Input
                    type="date"
                    value={editJoinDate}
                    onChange={(e) => setEditJoinDate(e.target.value)}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium">Contact Information</label>
                  <Input
                    type="text"
                    value={editContact}
                    onChange={(e) => setEditContact(e.target.value)}
                    placeholder="Phone number or email"
                  />
                </div>
              </form>
            )}
          </div>
        )}
      </InspectorSheet>

      {/* 4. Teacher Creation Modal */}
      <TeacherCreateModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSave={handleSaveNewTeacher}
        saving={savingNewTeacher}
        schoolCode={createSchoolCode}
        setSchoolCode={setCreateSchoolCode}
      />

      <ConfirmDialog
        open={deleting !== null}
        title="Delete Teacher Profile"
        description={
          deleting
            ? `Are you sure you want to delete ${deleting.name}? This will remove their faculty assignment across all subjects.`
            : ""
        }
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleting(null)}
        loading={deletingInProgress}
      />

      <ConfirmDialog
        open={bulkConfirmOpen}
        title="Bulk Delete Teachers"
        description={`Are you sure you want to delete ${selectedIds.length} selected teacher(s)? This action cannot be undone.`}
        onConfirm={handleBulkDelete}
        onCancel={() => setBulkConfirmOpen(false)}
        loading={bulkDeleting}
      />

      {bulkModalOpen && (
        <BulkImportModal
          open={bulkModalOpen}
          onClose={() => setBulkModalOpen(false)}
          entityType="teacher"
          onImport={async (items) => {
            const api = await getApi()
            return api.bulkCreateTeachers(items)
          }}
          onSuccess={(count) => {
            toast.add({ title: `Successfully imported ${count} teacher(s).`, type: "success" })
            void loadTeachers()
          }}
        />
      )}
    </div>
  )
}
