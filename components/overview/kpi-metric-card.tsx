"use client"

import * as React from "react"
import { ArrowDownRight, ArrowUpRight, Minus, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import type { StatTrend } from "@/lib/types"

export function TrendIndicator({ trend }: { trend: StatTrend }) {
  const Icon =
    trend.direction === "up"
      ? ArrowUpRight
      : trend.direction === "down"
        ? ArrowDownRight
        : Minus
  const label =
    trend.direction === "stable"
      ? "Stable vs prior 30d"
      : `${trend.delta > 0 ? "+" : ""}${trend.delta} vs prior 30d`

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-mono text-[11px] font-medium tabular-nums",
        trend.direction === "up" && "text-success",
        trend.direction === "down" && "text-destructive",
        trend.direction === "stable" && "text-muted-foreground"
      )}
    >
      <Icon className="size-3 shrink-0" />
      {label}
    </span>
  )
}

export interface KpiMetricCardProps {
  label: string
  hint: string
  icon: LucideIcon
  value: number
  trend?: StatTrend
}

export function KpiMetricCard({
  label,
  hint,
  icon: Icon,
  value,
  trend,
}: KpiMetricCardProps) {
  return (
    <div className="flex flex-col justify-between rounded-sm border border-border bg-card p-3.5 transition-colors hover:border-foreground/20">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {label}
        </span>
        <Icon className="size-4 text-muted-foreground/80" />
      </div>

      <div className="mt-2.5 space-y-1">
        <div className="font-mono text-2xl font-bold tabular-nums text-foreground">
          {value}
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-xs text-muted-foreground">{hint}</span>
          {trend ? <TrendIndicator trend={trend} /> : null}
        </div>
      </div>
    </div>
  )
}
