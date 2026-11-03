import { redirect } from "next/navigation"

/**
 * Consolidated V2 Workspace:
 * /check-in/corrections is now merged directly into /check-in?tab=logs (Scan Log & Bulk Undo).
 * Redirects legacy links while preserving any date/search query parameters.
 */
export default async function CheckInCorrectionsRedirectPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>
}) {
  const resolved = await searchParams
  const params = new URLSearchParams()
  if (resolved) {
    for (const [key, val] of Object.entries(resolved)) {
      if (typeof val === "string") params.set(key, val)
      else if (Array.isArray(val)) val.forEach((v) => params.append(key, v))
    }
  }
  params.set("tab", "logs")
  redirect(`/check-in?${params.toString()}`)
}
