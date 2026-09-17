import type { LayoutSection } from "@/lib/custom-fields/types";

/** Cascade keys that decide which Risk Profile opens. */
export const PIPELINE_STRIP_FIELD_KEYS = [
  "insurance_type",
  "insurance_category",
  "insurance_subtype",
] as const;

export const PIPELINE_STRIP_SECTION_ID = "pipeline";
export const PIPELINE_STRIP_LABEL = "Pipeline";

/** Detect the Insurance Quote Request / Insurance Type cascade section. */
export function isInsuranceQuoteRequestSection(section: {
  id?: string | null;
  label?: string | null;
  fieldKeys?: string[] | null;
}): boolean {
  const label = (section.label ?? "").trim();
  if (/insurance quote request/i.test(label)) return true;
  if (/^insurance type$/i.test(label)) return true;
  const keys = section.fieldKeys ?? [];
  if (
    keys.includes("insurance_type") &&
    (section.id === "details" || /^details$/i.test(label))
  ) {
    return true;
  }
  return false;
}

export function isPipelineStripSection(section: {
  id?: string | null;
  label?: string | null;
  fieldKeys?: string[] | null;
}): boolean {
  const id = (section.id ?? "").trim().toLowerCase();
  const label = (section.label ?? "").trim();
  if (id === PIPELINE_STRIP_SECTION_ID || /^pipeline$/i.test(label)) return true;
  if (isInsuranceQuoteRequestSection(section)) return true;
  const keys = section.fieldKeys ?? [];
  return PIPELINE_STRIP_FIELD_KEYS.some((key) => keys.includes(key));
}

export function pipelineStripSection(): LayoutSection {
  return {
    id: PIPELINE_STRIP_SECTION_ID,
    label: PIPELINE_STRIP_LABEL,
    fieldKeys: [...PIPELINE_STRIP_FIELD_KEYS],
    density: 3,
  };
}

export function normalizePipelineStripSection(
  section?: { id?: string | null; label?: string | null; fieldKeys?: string[] | null } | null,
): LayoutSection {
  const keys = [...(section?.fieldKeys ?? [])];
  const next: string[] = [...PIPELINE_STRIP_FIELD_KEYS];
  const seen = new Set(next);
  for (const key of keys) {
    if (key === "pipeline" || !key || seen.has(key)) continue;
    if ((PIPELINE_STRIP_FIELD_KEYS as readonly string[]).includes(key)) {
      next.push(key);
      seen.add(key);
    }
  }
  return {
    id: PIPELINE_STRIP_SECTION_ID,
    label: PIPELINE_STRIP_LABEL,
    fieldKeys: next.length ? next : [...PIPELINE_STRIP_FIELD_KEYS],
    density: 3,
  };
}

/** @deprecated Blue card retired — Pipeline strip is required-red, not sky. */
export const INSURANCE_QUOTE_SECTION_STYLE = {
  background: "#e0f2fe",
  borderColor: "#9ec9e8",
  boxShadow: "0 1px 2px rgba(15, 39, 68, 0.06), 0 4px 12px rgba(29, 78, 137, 0.10)",
} as const;
