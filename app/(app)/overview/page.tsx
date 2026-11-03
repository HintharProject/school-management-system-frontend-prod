"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import { useUser } from "@clerk/nextjs"
import {
  CalendarCheck,
  Download,
  QrCode,
  RefreshCw,
  ScrollText,
  UserPlus,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { DashboardOverviewSkeleton } from "@/components/page-skeletons"
import { ChartChunkSkeleton } from "@/components/charts/chart-chunk-skeleton"
import { StableBlock } from "@/components/animation/stable-block"
import { RequireRole } from "@/components/require-role"
import { StaggerContainer, StaggerItem } from "@/components/animated-stagger"
import { useStatsQuery, apiQueryKeys } from "@/hooks/use-api-queries"
import { useQueryClient } from "@tanstack/react-query"
import type { Stats } from "@/lib/types"
import { downloadCsv } from "@/lib/export-utils"
import { dashboardGreeting, pickDashboardSubtext } from "@/lib/dashboard-greeting"
import { cn } from "@/lib/utils"
import { SystemHeader } from "@/components/design-system/v2-primitives"
import { KpiMetricCard } from "@/components/overview/kpi-metric-card"
import { RecentActivityList } from "@/components/overview/recent-activity-list"

const StudentEnrollmentChart = dynamic(
  () =>
    import("@/components/charts/student-enrollment-chart").then(
      (m) => m.StudentEnrollmentChart
    ),
  { ssr: false, loading: () => <ChartChunkSkeleton className="h-64 min-h-[16rem]" /> }
)

const kpiCards: {
  key: keyof Stats["trends"]
  label: string
  hint: string
  icon: typeof CalendarCheck
  value: (stats: Stats) => number
}[] = [
  {
    key: "students",
    label: "Students",
    hint: "Enrolled headcount",
    icon: UserPlus,
    value: (stats) => stats.students,
  },
  {
    key: "teachers",
    label: "Teachers",
    hint: "Active faculty",
    icon: Users,
    value: (stats) => stats.teachers,
  },
  {
    key: "sessions",
    label: "Sessions",
    hint: "Past 30 days",
    icon: CalendarCheck,
    value: (stats) => stats.trends.sessions.current,
  },
  {
    key: "check_ins",
    label: "Check-ins",
    hint: "Past 30 days",
    icon: QrCode,
    value: (stats) => stats.trends.check_ins.current,
  },
]

function OverviewContent() {
  const { user } = useUser()
  const queryClient = useQueryClient()
  const { data: stats, isFetching, isLoading, error, refetch } = useStatsQuery()
  const loading = isLoading || isFetching
  const showSkeleton = isLoading && !stats
  const greeting = dashboardGreeting(user?.firstName)
  const [subtext, setSubtext] = React.useState(() => pickDashboardSubtext())

  return (
    <StaggerContainer className="flex flex-col gap-5">
      <StaggerItem>
        <SystemHeader
          domain="OPERATIONS"
          breadcrumb="OVERVIEW"
          title={greeting}
          description={subtext}
          metrics={
            stats
              ? [
                  { label: "Enrolled", value: stats.students, tone: "default" },
                  { label: "Faculty", value: stats.teachers, tone: "default" },
                  {
                    label: "Sessions (30d)",
                    value: stats.trends.sessions.current,
                    tone: stats.trends.sessions.direction === "up" ? "success" : "default",
                  },
                  {
                    label: "Check-Ins (30d)",
                    value: stats.trends.check_ins.current,
                    tone: stats.trends.check_ins.direction === "up" ? "success" : "default",
                  },
                ]
              : undefined
          }
          actions={
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={loading}
                onClick={() => {
                  setSubtext(pickDashboardSubtext())
                  void queryClient.invalidateQueries({ queryKey: apiQueryKeys.stats })
                  void refetch()
                }}
              >
                <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
                Refresh
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  window.location.href = "/check-in/terminal"
                }}
              >
                <QrCode className="size-3.5" />
                Check-In Terminal
              </Button>
            </div>
          }
        />
      </StaggerItem>

      {error ? (
        <StaggerItem>
          <div className="rounded-sm border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {error instanceof Error ? error.message : "Failed to load telemetry stats"}
          </div>
        </StaggerItem>
      ) : null}

      {showSkeleton ? (
        <StaggerItem>
          <StableBlock>
            <DashboardOverviewSkeleton />
          </StableBlock>
        </StaggerItem>
      ) : (
        <>
          <StaggerItem>
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Key Performance Indicators
              </span>
              <Button
                type="button"
                variant="outline"
                size="xs"
                disabled={!stats}
                onClick={() => {
                  if (!stats) return
                  downloadCsv(
                    "dashboard-overview.csv",
                    kpiCards.map(({ key, label, value }) => ({
                      metric: label,
                      value: value(stats),
                      delta: stats.trends[key].delta,
                      direction: stats.trends[key].direction,
                    }))
                  )
                }}
              >
                <Download className="size-3" />
                Export CSV
              </Button>
            </div>
          </StaggerItem>

          <StaggerItem>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {kpiCards.map(({ key, label, hint, icon, value }) => (
                <KpiMetricCard
                  key={key}
                  label={label}
                  hint={hint}
                  icon={icon}
                  value={stats ? value(stats) : 0}
                  trend={stats?.trends[key]}
                />
              ))}
            </div>
          </StaggerItem>

          <StaggerItem>
            <div className="grid gap-4 lg:grid-cols-5">
              <div className="flex flex-col rounded-sm border border-border bg-card p-4 lg:col-span-3">
                <div className="mb-3">
                  <h3 className="font-mono text-xs font-semibold uppercase tracking-[0.08em] text-foreground">
                    Student Enrollment
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {stats && stats.student_series.length < 12
                      ? "Headcount since the first recorded enrollment"
                      : "Cumulative headcount over the last 12 months"}
                  </p>
                </div>
                <div className="min-h-[16rem] flex-1">
                  <StudentEnrollmentChart data={stats?.student_series ?? []} className="h-full" />
                </div>
              </div>

              <div className="flex flex-col rounded-sm border border-border bg-card p-4 lg:col-span-2">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h3 className="font-mono text-xs font-semibold uppercase tracking-[0.08em] text-foreground">
                      Recent Activity
                    </h3>
                    <p className="text-xs text-muted-foreground">Latest operational audit logs</p>
                  </div>
                  <ScrollText className="size-4 text-muted-foreground" />
                </div>
                <RecentActivityList logs={stats?.recent_activity ?? []} />
              </div>
            </div>
          </StaggerItem>
        </>
      )}
    </StaggerContainer>
  )
}

export default function OverviewPage() {
  return (
    <RequireRole mode="staff">
      <OverviewContent />
    </RequireRole>
  )
}
