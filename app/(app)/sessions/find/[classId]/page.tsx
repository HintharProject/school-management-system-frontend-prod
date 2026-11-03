"use client"

import * as React from "react"
import { useParams } from "next/navigation"
import { ScheduleWorkspace } from "@/components/timetable/schedule-workspace"
import { RequireRole } from "@/components/require-role"

export default function FindSessionsByClassPage() {
  const params = useParams()
  const classId = params?.classId ? String(params.classId) : undefined

  return (
    <RequireRole mode="staff">
      <React.Suspense fallback={<ScheduleLoadingFallback />}>
        <ScheduleWorkspace initialClassId={classId} initialTab="sessions" />
      </React.Suspense>
    </RequireRole>
  )
}

function ScheduleLoadingFallback() {
  return (
    <div className="flex h-96 w-full items-center justify-center rounded-sm border border-border bg-card">
      <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
        <span className="size-2 rounded-full bg-primary animate-pulse" />
        LOADING SESSIONS WORKSPACE...
      </div>
    </div>
  )
}
