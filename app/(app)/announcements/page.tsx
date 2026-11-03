"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@clerk/nextjs"
import { Megaphone, Plus, Search } from "lucide-react"

import {
  AnnouncementPinnedTag,
  AnnouncementTagChip,
} from "@/components/announcements/announcement-tags"
import { AnnouncementsListSkeleton } from "@/components/skeleton/communications-skeleton"
import { StaggerContainer, StaggerItem } from "@/components/animated-stagger"
import { useCurrentUser } from "@/components/current-user-provider"
import { createApi } from "@/lib/api"
import { descriptionPreview } from "@/lib/event-draft"
import { isStaffOrAbove } from "@/lib/roles"
import type { Announcement } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { SystemHeader } from "@/components/design-system/v2-primitives"

function formatListDate(iso: string | null) {
  if (!iso) return "—"
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function AnnouncementPressRow({ item }: { item: Announcement }) {
  const excerpt = descriptionPreview(item.body)
  const preview =
    excerpt.length > 150 ? `${excerpt.slice(0, 150).trimEnd()}…` : excerpt
  const showTags = item.is_pinned || item.tags.length > 0

  return (
    <Link
      href={`/announcements/${item.slug}`}
      className="group block space-y-2 py-6 transition-colors hover:bg-muted/20 px-3 -mx-3 rounded-sm"
    >
      <div className="flex items-center justify-between gap-2">
        <time
          dateTime={item.published_at ?? undefined}
          className="block font-mono text-xs tabular-nums text-muted-foreground"
        >
          {formatListDate(item.published_at)}
        </time>
        {item.is_pinned ? <AnnouncementPinnedTag /> : null}
      </div>

      <h2 className="text-xl font-semibold tracking-tight text-foreground transition-colors group-hover:underline">
        {item.title}
      </h2>

      {preview ? (
        <p className="line-clamp-2 max-w-3xl text-xs leading-relaxed text-muted-foreground sm:text-sm">
          {preview}
        </p>
      ) : null}

      {showTags ? (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {item.tags.map((tag) => (
            <AnnouncementTagChip key={tag.slug} name={tag.name} slug={tag.slug} />
          ))}
        </div>
      ) : null}
    </Link>
  )
}

export default function AnnouncementsPage() {
  const router = useRouter()
  const { getToken, isLoaded, isSignedIn } = useAuth()
  const { role } = useCurrentUser()
  const staff = isStaffOrAbove(role)
  const [announcements, setAnnouncements] = React.useState<Announcement[]>([])
  const [searchQuery, setSearchQuery] = React.useState("")
  const [debouncedQuery, setDebouncedQuery] = React.useState("")
  const [loading, setLoading] = React.useState(true)
  const [loadError, setLoadError] = React.useState<string | null>(null)

  React.useEffect(() => {
    const id = window.setTimeout(() => setDebouncedQuery(searchQuery.trim()), 300)
    return () => window.clearTimeout(id)
  }, [searchQuery])

  const load = React.useCallback(async () => {
    if (!isSignedIn) return
    setLoading(true)
    setLoadError(null)
    try {
      const token = await getToken()
      if (!token) return
      const data = await createApi(token).listAnnouncements({
        page_size: 200,
        q: debouncedQuery || undefined,
      })
      setAnnouncements(data.results)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load announcements")
    } finally {
      setLoading(false)
    }
  }, [debouncedQuery, getToken, isSignedIn])

  React.useEffect(() => {
    if (!isLoaded || !isSignedIn) return
    const timer = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(timer)
  }, [isLoaded, isSignedIn, load])

  const sorted = React.useMemo(() => {
    return [...announcements].sort((a, b) => {
      if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1
      const aTime = a.published_at ? new Date(a.published_at).getTime() : 0
      const bTime = b.published_at ? new Date(b.published_at).getTime() : 0
      return bTime - aTime
    })
  }, [announcements])

  return (
    <StaggerContainer className="flex flex-col gap-6">
      <StaggerItem>
        <SystemHeader
          domain="COMMUNICATIONS"
          breadcrumb="ANNOUNCEMENTS"
          title="Announcements"
          description="School updates for students, parents, teachers, and staff."
          tabs={[
            { id: "announcements", label: "Announcements", count: announcements.length },
            { id: "events", label: "Events" },
          ]}
          activeTab="announcements"
          onTabChange={(id) => {
            if (id === "events") router.push("/communications?tab=events")
          }}
          actions={
            staff ? (
              <Button
                size="sm"
                className="rounded-sm"
                render={<Link href="/announcements/new" />}
              >
                <Plus className="size-3.5" />
                New Announcement
              </Button>
            ) : null
          }
        />
      </StaggerItem>

      <StaggerItem>
        <div className="flex items-center justify-between gap-3">
          <div className="relative w-full max-w-sm">
            <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search announcements..."
              className="h-8 rounded-sm pl-8 text-xs"
            />
          </div>
          <span className="font-mono text-xs tabular-nums text-muted-foreground">
            {sorted.length} records
          </span>
        </div>
      </StaggerItem>

      {loading ? (
        <StaggerItem>
          <AnnouncementsListSkeleton />
        </StaggerItem>
      ) : loadError ? (
        <StaggerItem>
          <Card className="rounded-sm border border-destructive/30 bg-destructive/5">
            <CardContent className="py-10 text-center text-sm text-destructive">
              {loadError}
            </CardContent>
          </Card>
        </StaggerItem>
      ) : sorted.length === 0 ? (
        <StaggerItem>
          <Card className="rounded-sm border border-border bg-card">
            <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
              <Megaphone className="size-8 text-muted-foreground/40" />
              <p className="font-medium text-foreground">No announcements yet</p>
              <p className="text-xs text-muted-foreground">
                {staff
                  ? "Create the first announcement for your school community."
                  : "Check back later for school updates."}
              </p>
              {staff ? (
                <Button
                  size="sm"
                  className="rounded-sm"
                  render={<Link href="/announcements/new" />}
                >
                  <Plus className="size-3.5" />
                  Add Announcement
                </Button>
              ) : null}
            </CardContent>
          </Card>
        </StaggerItem>
      ) : (
        <div className="mx-auto w-full max-w-3xl divide-y divide-border">
          {sorted.map((item) => (
            <StaggerItem key={item.id}>
              <AnnouncementPressRow item={item} />
            </StaggerItem>
          ))}
        </div>
      )}
    </StaggerContainer>
  )
}
