"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Search } from "lucide-react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { ThemeToggle } from "@/components/theme-toggle"
import { MotionToggle } from "@/components/motion-toggle"
import { Button } from "@/components/ui/button"
import { CommandSearchDialog } from "@/components/command-search-dialog"
import { useCurrentUser } from "@/components/current-user-provider"

interface BreadcrumbSegment {
  label: string
  href?: string
  isCurrent?: boolean
}

interface DomainBreadcrumb {
  domain: string
  items: BreadcrumbSegment[]
}

function resolveMonospaceBreadcrumbs(pathname: string): DomainBreadcrumb {
  const cleanPath = pathname.replace(/\/+$/, "")
  const segments = cleanPath.split("/").filter(Boolean)

  if (segments.length === 0 || segments[0] === "overview") {
    return {
      domain: "OPERATIONS",
      items: [{ label: "OVERVIEW", href: "/overview", isCurrent: true }],
    }
  }

  const root = segments[0]

  switch (root) {
    case "check-in": {
      const items: BreadcrumbSegment[] = [
        { label: "CHECK-IN", href: "/check-in", isCurrent: segments.length === 1 },
      ]
      if (segments.length > 1) {
        const sub = segments[1].toUpperCase()
        items.push({ label: sub, href: `/check-in/${segments[1]}`, isCurrent: true })
      }
      return { domain: "OPERATIONS", items }
    }

    case "attendance": {
      const items: BreadcrumbSegment[] = [
        { label: "ATTENDANCE", href: "/attendance", isCurrent: segments.length === 1 },
      ]
      if (segments.length > 1) {
        const sub = segments[1]
        const label = /^\d+$/.test(sub) ? `ROLL #${sub}` : sub.toUpperCase()
        items.push({ label, href: `/attendance/${sub}`, isCurrent: segments.length === 2 })
        if (segments.length > 2) {
          items.push({ label: segments[2].toUpperCase(), isCurrent: true })
        }
      }
      return { domain: "OPERATIONS", items }
    }

    case "schedule":
    case "timetable":
    case "sessions": {
      const domain = "OPERATIONS"
      if (root === "schedule") {
        const items: BreadcrumbSegment[] = [
          { label: "SCHEDULE", href: "/schedule", isCurrent: segments.length === 1 },
        ]
        if (segments.length > 1) {
          items.push({ label: segments[1].toUpperCase(), isCurrent: true })
        }
        return { domain, items }
      }
      if (root === "timetable") {
        const items: BreadcrumbSegment[] = [
          { label: "SCHEDULE", href: "/schedule" },
          { label: "TIMETABLE", href: "/timetable", isCurrent: segments.length === 1 },
        ]
        if (segments.length > 1) {
          const sub = segments[1]
          const label = /^\d+$/.test(sub) ? `SLOT #${sub}` : sub.toUpperCase()
          items.push({ label, isCurrent: true })
        }
        return { domain, items }
      }
      const items: BreadcrumbSegment[] = [
        { label: "SCHEDULE", href: "/schedule" },
        { label: "SESSIONS", href: "/sessions", isCurrent: segments.length === 1 },
      ]
      if (segments.length > 1) {
        const sub = segments[1]
        const label = /^\d+$/.test(sub) ? `SESSION #${sub}` : sub.toUpperCase()
        items.push({ label, href: `/sessions/${sub}`, isCurrent: segments.length === 2 })
        if (segments.length > 2) {
          items.push({ label: segments[2].toUpperCase(), isCurrent: true })
        }
      }
      return { domain, items }
    }

    case "classes":
    case "subjects": {
      const domain = "ACADEMICS"
      if (root === "subjects") {
        const items: BreadcrumbSegment[] = [
          { label: "HUB", href: "/classes" },
          { label: "SUBJECTS", href: "/subjects", isCurrent: segments.length === 1 },
        ]
        if (segments.length > 1) {
          const sub = segments[1]
          const label = /^\d+$/.test(sub) ? `SUBJECT #${sub}` : sub.toUpperCase()
          items.push({ label, isCurrent: true })
        }
        return { domain, items }
      }
      const items: BreadcrumbSegment[] = [
        { label: "HUB", href: "/classes", isCurrent: segments.length === 1 },
      ]
      if (segments.length > 1) {
        const sub = segments[1]
        const label = /^\d+$/.test(sub) ? `COHORT #${sub}` : sub.toUpperCase()
        items.push({ label, href: `/classes/${sub}`, isCurrent: segments.length === 2 })
        if (segments.length > 2) {
          items.push({ label: segments[2].toUpperCase(), isCurrent: true })
        }
      }
      return { domain, items }
    }

    case "students":
    case "teachers": {
      const domain = "DIRECTORY"
      const sectionLabel = root === "students" ? "REGISTRY" : "FACULTY"
      const singular = root === "students" ? "STUDENT" : "TEACHER"
      const items: BreadcrumbSegment[] = [
        { label: sectionLabel, href: `/${root}`, isCurrent: segments.length === 1 },
      ]
      if (segments.length > 1) {
        const sub = segments[1]
        const label = /^\d+$/.test(sub) ? `${singular} #${sub}` : sub.toUpperCase()
        items.push({ label, href: `/${root}/${sub}`, isCurrent: segments.length === 2 })
        if (segments.length > 2) {
          items.push({ label: segments[2].toUpperCase(), isCurrent: true })
        }
      }
      return { domain, items }
    }

    case "communications":
    case "announcements":
    case "events": {
      const domain = "COMMS"
      if (root === "communications") {
        const items: BreadcrumbSegment[] = [
          { label: "DISPATCH", href: "/communications", isCurrent: segments.length === 1 },
        ]
        if (segments.length > 1) {
          items.push({ label: segments[1].toUpperCase(), isCurrent: true })
        }
        return { domain, items }
      }
      const sectionLabel = root === "announcements" ? "ANNOUNCEMENTS" : "EVENTS"
      const items: BreadcrumbSegment[] = [
        { label: "DISPATCH", href: "/communications" },
        { label: sectionLabel, href: `/${root}`, isCurrent: segments.length === 1 },
      ]
      if (segments.length > 1) {
        const sub = segments[1]
        const label = /^\d+$/.test(sub) ? `DETAIL #${sub}` : sub === "new" ? "NEW" : sub.toUpperCase().slice(0, 16)
        items.push({ label, href: `/${root}/${sub}`, isCurrent: segments.length === 2 })
        if (segments.length > 2) {
          items.push({ label: segments[2].toUpperCase(), isCurrent: true })
        }
      }
      return { domain, items }
    }

    case "users": {
      const domain = "ADMIN"
      const items: BreadcrumbSegment[] = [
        { label: "USERS", href: "/users/management", isCurrent: segments.length === 1 },
      ]
      if (segments.length > 1) {
        const sub = segments[1]
        const label = sub === "management" ? "DIRECTORY" : sub.toUpperCase()
        items.push({ label, href: `/users/${segments[1]}`, isCurrent: segments.length === 2 })
        if (segments.length > 2) {
          items.push({ label: segments[2].toUpperCase(), isCurrent: true })
        }
      }
      return { domain, items }
    }

    case "settings": {
      return {
        domain: "SYSTEM",
        items: [{ label: "PREFERENCES", href: "/settings", isCurrent: true }],
      }
    }

    case "pending": {
      return {
        domain: "SYSTEM",
        items: [{ label: "PENDING LINK", href: "/pending", isCurrent: true }],
      }
    }

    case "account-locked": {
      return {
        domain: "SYSTEM",
        items: [{ label: "LOCKED", href: "/account-locked", isCurrent: true }],
      }
    }

    default: {
      return {
        domain: "SYSTEM",
        items: segments.map((seg, i) => ({
          label: /^\d+$/.test(seg) ? `#${seg}` : seg.toUpperCase(),
          href: `/${segments.slice(0, i + 1).join("/")}`,
          isCurrent: i === segments.length - 1,
        })),
      }
    }
  }
}

export function SiteHeader() {
  const pathname = usePathname()
  const breadcrumbData = React.useMemo(() => resolveMonospaceBreadcrumbs(pathname), [pathname])
  const [searchOpen, setSearchOpen] = React.useState(false)
  const [isMac, setIsMac] = React.useState(false)
  const { user: account, loading: accountLoading } = useCurrentUser()
  const accountLocked = !accountLoading && account?.is_active === false

  React.useEffect(() => {
    setIsMac(typeof window !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.platform || ""))
  }, [])

  React.useEffect(() => {
    if (accountLocked) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        setSearchOpen((prev) => !prev)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [accountLocked])

  return (
    <>
      <header
        className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border bg-card px-4"
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <SidebarTrigger className="-ml-1 rounded-sm" />
          <Separator orientation="vertical" className="mr-1 h-4" />
          <div className="hidden sm:flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] select-none">
            <span aria-hidden="true" className="size-2 shrink-0 rounded-[1px] bg-primary mr-1" />
            <span className="text-muted-foreground">{breadcrumbData.domain}</span>
            {breadcrumbData.items.map((item, index) => (
              <React.Fragment key={`${item.label}-${index}`}>
                <span className="text-border" aria-hidden="true">//</span>
                {item.isCurrent || !item.href ? (
                  <span className="text-foreground">{item.label}</span>
                ) : (
                  <Link
                    href={item.href}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {item.label}
                  </Link>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!accountLocked ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSearchOpen(true)}
              className="h-8 w-48 justify-between text-xs text-muted-foreground font-normal px-2.5 rounded-sm border border-border bg-card hover:bg-muted/50"
            >
              <span className="flex items-center gap-1.5 truncate">
                <Search className="size-3.5" />
                <span>Search Hinthar...</span>
              </span>
              <kbd className="pointer-events-none inline-flex h-4 select-none items-center gap-0.5 rounded-sm border border-border bg-muted px-1 text-[10px] font-medium opacity-100">
                <span>{isMac ? "⌘" : "Ctrl"}</span>K
              </kbd>
            </Button>
          ) : null}

          <MotionToggle />
          <ThemeToggle />
        </div>
      </header>

      <CommandSearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  )
}
