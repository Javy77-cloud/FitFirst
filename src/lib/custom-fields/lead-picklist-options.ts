/** Shared Lead picklist option catalogs — reuse Deal / queue constants; never fork duplicates. */

import { LINES } from "@/lib/domain";
import { LEAD_LANGUAGES } from "@/lib/crm/lead-fields";
import {
  LEAD_CADENCE_FILTERS,
  LEAD_QUEUE_STATUS_FILTERS,
  LEAD_TEMPERATURES,
} from "@/lib/leads/queue";
import { allPcCategoryLabels, allPcSubtypeLabels, INSURANCE_TYPE_OPTIONS } from "@/lib/deals/insurance-cascade";
import { SEEDED_PIPELINES } from "@/lib/wire/pipeline";
import { LINE_OF_BUSINESS_OPTIONS } from "./starter-picklists";

export const LEAD_TEMPERATURE_OPTIONS: string[] = [...LEAD_TEMPERATURES];

export const LEAD_STATUS_OPTIONS: string[] = LEAD_QUEUE_STATUS_FILTERS.map((row) => row.label);
export const LEAD_CADENCE_OPTIONS: string[] = LEAD_CADENCE_FILTERS.map((row) => row.label);

export const LEAD_LANGUAGE_OPTIONS: string[] = LEAD_LANGUAGES.map((row) => row.value);

/** Same LOB codes convert already understands (HO / AUTO / …). */
export const LEAD_INSURANCE_DESIRE_OPTIONS: string[] = [...LINES];

/** Shopping boards Deals use — product/type family the customer wants. */
export const LEAD_PIPELINE_OPTIONS: string[] = SEEDED_PIPELINES.filter((board) => board.kind === "shopping").map(
  (board) => (board.slug === "p-c" ? "P&C" : board.name),
);

/** Lead + Deal Insurance Type — Javy locked: PC / Life / Health only. */
export const LEAD_INSURANCE_TYPE_OPTIONS: string[] = INSURANCE_TYPE_OPTIONS.map((row) => row.label);

/** Middle category labels under Type=PC (Home / Auto / …). */
export const LEAD_INSURANCE_CATEGORY_OPTIONS: string[] = allPcCategoryLabels();

/** Same P&C form labels Deals seed on Insurance Form / subtype. */
export const LEAD_INSURANCE_SUBTYPE_OPTIONS: string[] = allPcSubtypeLabels();

/** Prefer the shared Lines-of-business starter list labels when a UI wants friendly names. */
export const LEAD_LINES_OF_BUSINESS_LABELS: string[] = [...LINE_OF_BUSINESS_OPTIONS];

export function pipelineSlugFromLeadPipeline(value: string | null | undefined): string | null {
  const raw = (value ?? "").trim().toLowerCase();
  if (!raw) return null;
  if (raw === "p&c" || raw === "p-c" || raw === "pc" || raw.includes("p&c")) return "p-c";
  if (raw === "life" || raw.startsWith("life")) return "life";
  if (raw === "health" || raw.startsWith("health")) return "health";
  if (raw === "flood" || raw.startsWith("flood")) return "p-c";
  const hit = SEEDED_PIPELINES.find(
    (board) => board.slug === raw || board.name.toLowerCase() === raw || board.name.toLowerCase().startsWith(raw),
  );
  return hit?.slug ?? null;
}
