"use client"

import { CalendarDays, AlertTriangle } from "lucide-react"
import type { TimetableConflictItem, TimetableSlot } from "@/lib/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  TimetableWeekSnippet,
  type TimetableSlotLine,
} from "@/components/timetable-week-snippet"

/** Shared hub section: weekly TimetableSlot grid, not dated sessions. */
export function HubTimetableCard({
  slots,
  description,
  editorHref,
  slotLine = "teacher",
  conflicts,
  conflictingSlotIds,
}: {
  slots: TimetableSlot[]
  description?: string
  editorHref?: string
  slotLine?: TimetableSlotLine
  conflicts?: TimetableConflictItem[]
  conflictingSlotIds?: number[]
}) {
  const hasConflicts = Boolean(conflicts && conflicts.length > 0)

  return (
    <Card className="border-border/80">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <CalendarDays className="size-5 text-muted-foreground" />
          Weekly timetable
        </CardTitle>
        <CardDescription>
          {description ?? "Assigned weekly slots — not dated session occurrences."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasConflicts && conflicts ? (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3.5 text-sm text-foreground">
            <div className="flex items-center gap-2 font-semibold text-amber-700 dark:text-amber-400">
              <AlertTriangle className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>
                {conflicts.length} Timetable{" "}
                {conflicts.length === 1 ? "Conflict" : "Conflicts"} Detected (Allowed)
              </span>
            </div>
            <ul className="mt-2 space-y-1 pl-6 text-xs text-muted-foreground list-disc">
              {conflicts.map((conflict, idx) => (
                <li key={idx}>{conflict.message}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <TimetableWeekSnippet
          slots={slots}
          editorHref={editorHref}
          slotLine={slotLine}
          conflicts={conflicts}
          conflictingSlotIds={conflictingSlotIds}
        />
      </CardContent>
    </Card>
  )
}
