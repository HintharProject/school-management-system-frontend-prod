import type { Class, EducationLevel } from "@/lib/types"
import { EDUCATION_LEVELS } from "@/lib/types"

/** Max lengths — keep in sync with Django `Class` / `Cohort` model fields. */
export const COHORT_IDENTIFIER_MAX_LENGTH = 1
export const COHORT_SUB_CATEGORY_MAX_LENGTH = 10

export const COHORT_IDENTIFIER_PLACEHOLDER = "e.g. K, A, B"
export const COHORT_SUB_CATEGORY_PLACEHOLDER = "e.g. 1, 2"

export const COHORT_IDENTIFIER_HINT =
  "Cohort letter only (e.g. K, A, B)."
export const COHORT_SUB_CATEGORY_HINT =
  "Optional Sub-Cohort Category number (e.g. 1, 2 — combines into Cohort Identifier like IG K1 or IAL K2)."

/** Strip non-letters and keep a single uppercase character. */
export function sanitizeCohortIdentifierInput(value: string): string {
  return value.replace(/[^A-Za-z]/g, "").toUpperCase().slice(0, COHORT_IDENTIFIER_MAX_LENGTH)
}

/** Strip to letters/numbers and uppercase letters (e.g. 2a → 2A). */
export function sanitizeCohortSubCategoryInput(value: string): string {
  return value
    .replace(/[^A-Za-z0-9]/g, "")
    .replace(/[A-Za-z]/g, (ch) => ch.toUpperCase())
    .slice(0, COHORT_SUB_CATEGORY_MAX_LENGTH)
}

/** Concatenate cohort letter + optional sub-cohort category (e.g. K + 1 → K1, K + 2 → K2). */
export function formatClassStream(
  cohortIdentifier: string,
  cohortSubCategory?: string | null
): string {
  return `${cohortIdentifier ?? ""}${cohortSubCategory ?? ""}`.trim()
}

/**
 * Explicit Cohort Identifier string: e.g. "IG K1", "IAL K2", "Year6 A".
 */
export function formatCohortIdentifier(
  cls: Pick<Class, "education_level" | "cohort_identifier"> & {
    cohort_sub_category?: string | null
    full_cohort_identifier?: string | null
  }
): string {
  if (cls.full_cohort_identifier) return cls.full_cohort_identifier
  const stream = formatClassStream(cls.cohort_identifier, cls.cohort_sub_category)
  return stream ? `${cls.education_level} ${stream}` : cls.education_level
}

/**
 * Explicit Course label: Cohort Identifier + Subject name, e.g. "IG K1 — Mathematics".
 */
export function formatCourseLabel(
  cls: (Pick<Class, "education_level" | "cohort_identifier"> & {
    cohort_sub_category?: string | null
    full_cohort_identifier?: string | null
  }) | string,
  subjectName: string
): string {
  const cohortId = typeof cls === "string" ? cls : formatCohortIdentifier(cls)
  return cohortId ? `${cohortId} — ${subjectName}` : subjectName
}

/** Human-readable cohort label, e.g. "Year 6 · A", "IGCSE · K1", or "IAL (A Level) · K2". */
export function formatClassLabel(
  cls: Pick<Class, "education_level" | "cohort_identifier"> & {
    cohort_sub_category?: string | null
  }
): string {
  const level = educationLevelLabel(cls.education_level)
  const stream = formatClassStream(cls.cohort_identifier, cls.cohort_sub_category)
  return stream ? `${level} · ${stream}` : level
}

export function educationLevelLabel(level: EducationLevel | string): string {
  return EDUCATION_LEVELS.find((l) => l.value === level)?.label ?? level
}

/** Format API `class_labels` entries that may still be raw (`Year6 A` / `IG K2A`). */
export function formatClassLabelText(raw: string): string {
  const text = raw.trim()
  if (!text) return "Unassigned"
  if (text.includes("·")) return text
  const match = text.match(/^(IAL|IG|Year\d+)\s*(.*)$/i)
  if (!match) return text
  const level = educationLevelLabel(match[1])
  const stream = (match[2] || "").trim()
  return stream ? `${level} · ${stream}` : level
}
