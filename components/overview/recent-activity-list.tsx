"use client"

import * as React from "react"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import type { AuditCategory, AuditLog } from "@/lib/types"
import { formatRelativeTime } from "@/lib/utils"

const CATEGORY_LABELS: Record<AuditCategory, string> = {
  student: "Student",
  teacher: "Teacher",
  staff: "Staff",
  class: "Class",
  session: "Session",
  check_in: "Check-in",
  user: "User",
  other: "Other",
}

export function RecentActivityList({ logs }: { logs: AuditLog[] }) {
  if (logs.length === 0) {
    return (
      <Empty className="border-0 p-6">
        <EmptyHeader>
          <EmptyTitle>No activity yet</EmptyTitle>
          <EmptyDescription>
            Important changes to students, classes, sessions, and check-ins will show up here.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <ul className="flex flex-col divide-y divide-border">
      {logs.map((log) => (
        <li
          key={log.id}
          className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
        >
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate text-sm font-medium text-foreground">
              {log.summary || "System Update"}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              {CATEGORY_LABELS[log.category] ?? log.category}
            </span>
          </div>
          <span className="shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">
            {formatRelativeTime(log.timestamp)}
          </span>
        </li>
      ))}
    </ul>
  )
}
