import { redirect } from "next/navigation"

/**
 * Consolidated V2 Workspace:
 * The legacy duplicate 980-line student table in /check-in/management has been retired.
 * All QR badge preview, token rotation, activation/deactivation, and printing now live
 * directly inside the Student & Faculty Directory slide-over InspectorSheet at /students.
 */
export default function CheckInManagementRedirectPage() {
  redirect("/students")
}
