"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import { useAuth } from "@clerk/nextjs"
import {
  CalendarDays,
  MapPin,
  Megaphone,
  Plus,
  Search,
} from "lucide-react"

import {
  AnnouncementPinnedTag,
  AnnouncementTagChip,
} from "@/components/announcements/announcement-tags"
import {
  AnnouncementsListSkeleton,
  EventsHomeSkeleton,
} from "@/components/skeleton/communications-skeleton"
import { StaggerContainer, StaggerItem } from "@/components/animated-stagger"
import { useCurrentUser } from "@/components/current-user-provider"
import { buildQueryString, createApi, publicRequest } from "@/lib/api"
import { descriptionPreview } from "@/lib/event-draft"
import { isStaffOrAbove } from "@/lib/roles"
import type { Announcement, CommTag, Paginated, SchoolEvent } from "@/lib/types"
import {
  EVENT_AUDIENCE_LABELS,
  EVENT_REGISTRATION_STATUS_LABELS,
} from "@/lib/communications-labels"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { SystemHeader } from "@/components/design-system/v2-primitives"
import {
  formatBackendTime,
  parseBackendDateTime,
  toLocalDateString,
  cn,
} from "@/lib/utils"

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

function dateGroupKey(iso: string): string {
  return toLocalDateString(parseBackendDateTime(iso))
}

function formatDateGroupLabel(isoDate: string): { primary: string; weekday: string } {
  const today = toLocalDateString()
  const tomorrowDate = new Date()
  tomorrowDate.setDate(tomorrowDate.getDate() + 1)
  const tomorrow = toLocalDateString(tomorrowDate)

  const date = new Date(`${isoDate}T12:00:00`)
  const weekday = date.toLocaleDateString(undefined, { weekday: "long" })

  if (isoDate === today) return { primary: "Today", weekday }
  if (isoDate === tomorrow) return { primary: "Tomorrow", weekday }

  return {
    primary: date.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    weekday,
  }
}

function groupEventsByDate(events: SchoolEvent[]) {
  const groups = new Map<string, SchoolEvent[]>()
  for (const event of events) {
    const key = dateGroupKey(event.starts_at)
    const list = groups.get(key) ?? []
    list.push(event)
    groups.set(key, list)
  }
  return Array.from(groups.entries()).map(([date, items]) => ({ date, items }))
}

function CommunicationsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tabParam = searchParams.get("tab")
  const [activeTab, setActiveTab] = React.useState<string>(
    tabParam === "events" ? "events" : "announcements"
  )

  const { getToken, isLoaded, isSignedIn } = useAuth()
  const { role } = useCurrentUser()
  const staff = isStaffOrAbove(role)

  // Announcements State
  const [announcements, setAnnouncements] = React.useState<Announcement[]>([])
  const [announcementSearch, setAnnouncementSearch] = React.useState("")
  const [debouncedAnnouncementQuery, setDebouncedAnnouncementQuery] = React.useState("")
  const [announcementsLoading, setAnnouncementsLoading] = React.useState(true)
  const [announcementsError, setAnnouncementsError] = React.useState<string | null>(null)

  // Events State
  const [events, setEvents] = React.useState<SchoolEvent[]>([])
  const [tags, setTags] = React.useState<CommTag[]>([])
  const [selectedTag, setSelectedTag] = React.useState<string | null>(null)
  const [eventSearch, setEventSearch] = React.useState("")
  const [debouncedEventQuery, setDebouncedEventQuery] = React.useState("")
  const [eventFilterTab, setEventFilterTab] = React.useState<"upcoming" | "past" | "mine">("upcoming")
  const [eventsLoading, setEventsLoading] = React.useState(true)
  const [eventsError, setEventsError] = React.useState<string | null>(null)

  // Debounce Announcement Search
  React.useEffect(() => {
    const id = window.setTimeout(() => setDebouncedAnnouncementQuery(announcementSearch.trim()), 300)
    return () => window.clearTimeout(id)
  }, [announcementSearch])

  // Debounce Event Search
  React.useEffect(() => {
    const id = window.setTimeout(() => setDebouncedEventQuery(eventSearch.trim()), 300)
    return () => window.clearTimeout(id)
  }, [eventSearch])

  // Load Announcements
  const loadAnnouncements = React.useCallback(async () => {
    if (!isSignedIn) return
    setAnnouncementsLoading(true)
    setAnnouncementsError(null)
    try {
      const token = await getToken()
      if (!token) return
      const data = await createApi(token).listAnnouncements({
        page_size: 200,
        q: debouncedAnnouncementQuery || undefined,
      })
      setAnnouncements(data.results)
    } catch (err) {
      setAnnouncementsError(err instanceof Error ? err.message : "Failed to load announcements")
    } finally {
      setAnnouncementsLoading(false)
    }
  }, [debouncedAnnouncementQuery, getToken, isSignedIn])

  // Load Events
  const loadEvents = React.useCallback(async () => {
    setEventsLoading(true)
    setEventsError(null)
    try {
      const params = {
        page_size: 200,
        tag: selectedTag ?? undefined,
        q: debouncedEventQuery || undefined,
        when: eventFilterTab === "past" ? "past" : eventFilterTab === "upcoming" ? "upcoming" : undefined,
      }
      let data: Paginated<SchoolEvent>
      if (isSignedIn) {
        const token = await getToken()
        if (!token) throw new Error("No auth token available")
        data = await createApi(token).listEvents(params)
        const tagData = await createApi(token).listTags({ scope: "event" })
        setTags(tagData)
      } else {
        data = await publicRequest<Paginated<SchoolEvent>>(
          `/events${buildQueryString(params)}`
        )
      }
      setEvents(data.results)
    } catch (err) {
      setEventsError(err instanceof Error ? err.message : "Failed to load events")
    } finally {
      setEventsLoading(false)
    }
  }, [debouncedEventQuery, getToken, isSignedIn, selectedTag, eventFilterTab])

  React.useEffect(() => {
    if (!isLoaded || !isSignedIn) return
    void loadAnnouncements()
  }, [isLoaded, isSignedIn, loadAnnouncements])

  React.useEffect(() => {
    if (!isLoaded) return
    void loadEvents()
  }, [isLoaded, loadEvents])

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId)
    router.replace(`/communications?tab=${tabId}`)
  }

  const sortedAnnouncements = React.useMemo(() => {
    return [...announcements].sort((a, b) => {
      if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1
      const aTime = a.published_at ? new Date(a.published_at).getTime() : 0
      const bTime = b.published_at ? new Date(b.published_at).getTime() : 0
      return bTime - aTime
    })
  }, [announcements])

  const visibleEvents = React.useMemo(() => {
    return eventFilterTab === "mine"
      ? events.filter((event) => event.my_registration)
      : events
  }, [eventFilterTab, events])

  const groupedEvents = React.useMemo(() => groupEventsByDate(visibleEvents), [visibleEvents])

  return (
    <StaggerContainer className="flex flex-col gap-6">
      <StaggerItem>
        <SystemHeader
          domain="COMMUNICATIONS"
          breadcrumb="DISPATCH"
          title="Communications & Dispatch"
          description="School updates, broadcast announcements, and community calendar."
          tabs={[
            { id: "announcements", label: "Announcements", count: announcements.length },
            { id: "events", label: "Events", count: events.length },
          ]}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          actions={
            staff ? (
              activeTab === "announcements" ? (
                <Button
                  size="sm"
                  className="rounded-sm"
                  render={<Link href="/announcements/new" />}
                >
                  <Plus className="size-3.5" />
                  New Announcement
                </Button>
              ) : (
                <Button
                  size="sm"
                  className="rounded-sm"
                  render={<Link href="/events/manage/new" />}
                >
                  <Plus className="size-3.5" />
                  New Event
                </Button>
              )
            ) : null
          }
        />
      </StaggerItem>

      {/* Tab 1: Announcements */}
      {activeTab === "announcements" ? (
        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between gap-3">
            <div className="relative w-full max-w-sm">
              <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                value={announcementSearch}
                onChange={(e) => setAnnouncementSearch(e.target.value)}
                placeholder="Filter announcements by keyword..."
                className="h-8 rounded-sm pl-8 text-xs"
              />
            </div>
            <span className="font-mono text-xs tabular-nums text-muted-foreground">
              {sortedAnnouncements.length} records
            </span>
          </div>

          {announcementsLoading ? (
            <AnnouncementsListSkeleton />
          ) : announcementsError ? (
            <Card className="rounded-sm border border-destructive/30 bg-destructive/5">
              <CardContent className="py-8 text-center text-sm text-destructive">
                {announcementsError}
              </CardContent>
            </Card>
          ) : sortedAnnouncements.length === 0 ? (
            <Card className="rounded-sm border border-border bg-card">
              <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
                <Megaphone className="size-8 text-muted-foreground/40" />
                <p className="font-medium text-foreground">No announcements found</p>
                <p className="text-xs text-muted-foreground">
                  {staff
                    ? "Dispatch the first bulletin to staff, students, and parents."
                    : "Check back later for school updates."}
                </p>
                {staff ? (
                  <Button
                    size="sm"
                    className="mt-2 rounded-sm"
                    render={<Link href="/announcements/new" />}
                  >
                    <Plus className="size-3.5" />
                    Create Announcement
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          ) : (
            <div className="rounded-sm border border-border bg-card divide-y divide-border">
              {sortedAnnouncements.map((item) => {
                const excerpt = descriptionPreview(item.body)
                const preview = excerpt.length > 150 ? `${excerpt.slice(0, 150).trimEnd()}…` : excerpt
                const showTags = item.is_pinned || item.tags.length > 0

                return (
                  <Link
                    key={item.id}
                    href={`/announcements/${item.slug}`}
                    className="group flex flex-col gap-1.5 p-4 transition-colors hover:bg-muted/30"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <time
                        dateTime={item.published_at ?? undefined}
                        className="font-mono text-xs tabular-nums text-muted-foreground"
                      >
                        {formatListDate(item.published_at)}
                      </time>
                      {item.is_pinned ? <AnnouncementPinnedTag /> : null}
                    </div>

                    <h2 className="text-base font-semibold text-foreground transition-colors group-hover:underline">
                      {item.title}
                    </h2>

                    {preview ? (
                      <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
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
              })}
            </div>
          )}
        </div>
      ) : null}

      {/* Tab 2: Events */}
      {activeTab === "events" ? (
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="relative w-64">
                <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  value={eventSearch}
                  onChange={(e) => setEventSearch(e.target.value)}
                  placeholder="Filter events..."
                  className="h-8 rounded-sm pl-8 text-xs"
                />
              </div>

              {/* Segmented Filter Pills */}
              <div className="inline-flex rounded-sm border border-border p-0.5 bg-muted/20">
                {(["upcoming", "past", "mine"] as const).map((filterKey) => {
                  const active = eventFilterTab === filterKey
                  const label =
                    filterKey === "upcoming"
                      ? "Upcoming"
                      : filterKey === "past"
                        ? "Past"
                        : "Registered"

                  return (
                    <button
                      key={filterKey}
                      type="button"
                      onClick={() => setEventFilterTab(filterKey)}
                      className={cn(
                        "rounded-sm px-2.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-wider transition-colors",
                        active
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>

            <span className="font-mono text-xs tabular-nums text-muted-foreground">
              {visibleEvents.length} events
            </span>
          </div>

          {eventsLoading ? (
            <EventsHomeSkeleton />
          ) : eventsError ? (
            <Card className="rounded-sm border border-destructive/30 bg-destructive/5">
              <CardContent className="py-8 text-center text-sm text-destructive">
                {eventsError}
              </CardContent>
            </Card>
          ) : groupedEvents.length === 0 ? (
            <Card className="rounded-sm border border-border bg-card">
              <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
                <CalendarDays className="size-8 text-muted-foreground/40" />
                <p className="font-medium text-foreground">No events scheduled</p>
                <p className="text-xs text-muted-foreground">
                  {staff
                    ? "Schedule school activities, meetings, or extracurricular events."
                    : "No events match this filter."}
                </p>
                {staff ? (
                  <Button
                    size="sm"
                    className="mt-2 rounded-sm"
                    render={<Link href="/events/manage/new" />}
                  >
                    <Plus className="size-3.5" />
                    Schedule Event
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {groupedEvents.map(({ date, items }) => {
                const label = formatDateGroupLabel(date)
                return (
                  <div key={date} className="space-y-2">
                    <div className="flex items-baseline gap-2 border-b border-border pb-1">
                      <span className="font-mono text-xs font-bold uppercase tracking-[0.08em] text-foreground">
                        {label.primary}
                      </span>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {label.weekday}
                      </span>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {items.map((event) => {
                        const location = event.location.trim()
                        const isVirtual = /^https?:\/\//i.test(location)
                        const startTime = formatBackendTime(event.starts_at)
                        const endTime = event.ends_at ? formatBackendTime(event.ends_at) : null
                        const timeLabel = endTime ? `${startTime} – ${endTime}` : startTime

                        return (
                          <div
                            key={event.id}
                            className="flex flex-col justify-between rounded-sm border border-border bg-card p-3.5 transition-colors hover:border-foreground/20"
                          >
                            <Link href={`/events/${event.slug}`} className="group block space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-mono text-xs font-semibold tabular-nums text-muted-foreground">
                                  {timeLabel}
                                </span>
                                <Badge
                                  variant={event.audience === "external" ? "default" : "secondary"}
                                  className="rounded-[2px] font-mono text-[10px] uppercase tracking-wider"
                                >
                                  {EVENT_AUDIENCE_LABELS[event.audience]}
                                </Badge>
                              </div>

                              <h3 className="text-sm font-semibold tracking-tight text-foreground transition-colors group-hover:underline">
                                {event.title}
                              </h3>

                              {event.my_registration ? (
                                <span className="inline-block rounded-[2px] border border-success/30 bg-success/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase text-success">
                                  {EVENT_REGISTRATION_STATUS_LABELS[event.my_registration.status]}
                                </span>
                              ) : null}

                              {location ? (
                                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <MapPin className="size-3 shrink-0" />
                                  <span className="truncate">{isVirtual ? "Online / Virtual" : location}</span>
                                </p>
                              ) : null}
                            </Link>

                            {staff ? (
                              <div className="mt-3 flex justify-end border-t border-border pt-2">
                                <Button
                                  size="xs"
                                  variant="outline"
                                  className="rounded-sm"
                                  render={<Link href={`/events/manage/${event.slug}`} />}
                                >
                                  Manage
                                </Button>
                              </div>
                            ) : null}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      ) : null}
    </StaggerContainer>
  )
}

export default function CommunicationsPage() {
  return (
    <React.Suspense
      fallback={
        <div className="space-y-6">
          <AnnouncementsListSkeleton />
        </div>
      }
    >
      <CommunicationsContent />
    </React.Suspense>
  )
}
