"use client"

import * as React from "react"
import { ScheduleWorkspace } from "@/components/timetable/schedule-workspace"
import { RequireRole } from "@/components/require-role"

export default function SessionsPage() {
  return (
    <RequireRole mode="staff">
      <React.Suspense fallback={<SessionsLoadingFallback />}>
        <ScheduleWorkspace initialTab="sessions" />
      </React.Suspense>
    </RequireRole>
  )
}

function SessionsLoadingFallback() {
  return (
    <div className="flex h-96 w-full items-center justify-center rounded-sm border border-border bg-card">
      <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
        <span className="size-2 rounded-full bg-primary animate-pulse" />
        LOADING SESSIONS & DISPATCH WORKSPACE...
      </div>
    </div>
  )
}
