"use client"

import * as React from "react"
import { useParams } from "next/navigation"
import { AttendanceWorkspace } from "@/components/attendance/attendance-workspace"
import { RequireRole } from "@/components/require-role"

export default function ClassAttendancePage() {
  const params = useParams()
  const classId = params?.classId ? String(params.classId) : undefined

  return (
    <RequireRole mode="staff">
      <React.Suspense fallback={<AttendanceLoadingFallback />}>
        <AttendanceWorkspace initialClassId={classId} />
      </React.Suspense>
    </RequireRole>
  )
}

function AttendanceLoadingFallback() {
  return (
    <div className="flex h-96 w-full items-center justify-center rounded-sm border border-border bg-card">
      <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
        <span className="size-2 rounded-full bg-primary animate-pulse" />
        LOADING COHORT ATTENDANCE ROLL...
      </div>
    </div>
  )
}
