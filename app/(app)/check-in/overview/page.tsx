import { redirect } from "next/navigation"

/**
 * Consolidated V2 Workspace:
 * /check-in/overview is now merged directly into /check-in (Daily Roll & Scan Log Ledger).
 * Redirects legacy links while preserving query parameters (e.g. date, class_id).
 */
export default async function CheckInOverviewRedirectPage({
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
  const qs = params.toString()
  redirect(qs ? `/check-in?${qs}` : "/check-in")
}
