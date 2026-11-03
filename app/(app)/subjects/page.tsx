"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

export default function SubjectsPage() {
  const router = useRouter()

  React.useEffect(() => {
    router.replace("/classes?tab=subjects")
  }, [router])

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 rounded-sm border border-border bg-card p-8">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
      <div className="space-y-1 text-center">
        <p className="font-mono text-xs font-semibold uppercase tracking-wider text-foreground">
          Academics & Curriculum Hub
        </p>
        <p className="font-mono text-[11px] text-muted-foreground">
          Redirecting to unified workspace // Subject Catalog...
        </p>
      </div>
    </div>
  )
}
