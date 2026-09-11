/** Shared Lead picklist option catalogs — reuse Deal / queue constants; never fork duplicates. */

import { LINES } from "@/lib/domain";
import { LEAD_LANGUAGES } from "@/lib/crm/lead-fields";
import { LEAD_QUEUE_STATUSES, LEAD_TEMPERATURES } from "@/lib/leads/queue";
import { allPcSubtypeLabels, insuranceTypesForFamily } from "@/lib/deals/insurance-cascade";
import { SEEDED_PIPELINES } from "@/lib/wire/pipeline";
import { LINE_OF_BUSINESS_OPTIONS } from "./starter-picklists";

export const LEAD_TEMPERATURE_OPTIONS: string[] = [...LEAD_TEMPERATURES];

export const LEAD_STATUS_OPTIONS: string[] = [...LEAD_QUEUE_STATUSES];

export const LEAD_LANGUAGE_OPTIONS: string[] = LEAD_LANGUAGES.map((row) => row.value);

/** Same LOB codes convert already understands (HO / AUTO / …). */
export const LEAD_INSURANCE_DESIRE_OPTIONS: string[] = [...LINES];

/** Shopping boards Deals use — product/type family the customer wants. */
export const LEAD_PIPELINE_OPTIONS: string[] = SEEDED_PIPELINES.filter((board) => board.kind === "shopping").map(
  (board) => (board.slug === "p-c" ? "P&C" : board.name),
);

/** Deal Details Insurance Type cascade options (all families). */
export const LEAD_INSURANCE_TYPE_OPTIONS: string[] = [
  ...new Set([
    ...insuranceTypesForFamily("pc").map((row) => row.label),
    ...insuranceTypesForFamily("life").map((row) => row.label),
    ...insuranceTypesForFamily("health").map((row) => row.label),
  ]),
];

/** Same P&C subtype labels Deals seed on Insurance subtype. */
export const LEAD_INSURANCE_SUBTYPE_OPTIONS: string[] = allPcSubtypeLabels();

/** Prefer the shared Lines-of-business starter list labels when a UI wants friendly names. */
export const LEAD_LINES_OF_BUSINESS_LABELS: string[] = [...LINE_OF_BUSINESS_OPTIONS];

export function pipelineSlugFromLeadPipeline(value: string | null | undefined): string | null {
  const raw = (value ?? "").trim().toLowerCase();
  if (!raw) return null;
  if (raw === "p&c" || raw === "p-c" || raw === "pc" || raw.includes("p&c")) return "p-c";
  if (raw === "life" || raw.startsWith("life")) return "life";
  if (raw === "health" || raw.startsWith("health")) return "health";
  if (raw === "flood" || raw.startsWith("flood")) return "flood";
  const hit = SEEDED_PIPELINES.find(
    (board) => board.slug === raw || board.name.toLowerCase() === raw || board.name.toLowerCase().startsWith(raw),
  );
  return hit?.slug ?? null;
}
