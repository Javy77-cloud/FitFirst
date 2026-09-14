import {
  RENEWAL_QUEUE_STAGE_LABELS,
  RENEWAL_QUEUE_STAGES,
  isRenewalQueueStage,
} from "@/lib/domain-ams";
import { LINES } from "@/lib/domain";
import { matchesContains } from "@/lib/search/live-query";
import {
  matchesField,
  uniqueOptions,
  type FilterField,
} from "@/lib/saved-filters";
import {
  applyPageFilterPrefsToFields,
  type PageFilter,
} from "@/lib/page-filters";
import type { RenewalBoardCard } from "@/lib/renewal/board-data";

/** URL keys for Renewals pipeline column filters (q counted separately). */
export const RENEWAL_PIPELINE_FILTER_KEYS = [
  "stage",
  "line",
  "carrier",
  "subType",
  "daysBand",
] as const;

export type RenewalPipelineFilterKey = (typeof RENEWAL_PIPELINE_FILTER_KEYS)[number];

export type RenewalPipelineColumnFilter = Partial<Record<RenewalPipelineFilterKey, string>>;

export const RENEWAL_PIPELINE_PRESERVE_PARAMS = [
  "pipeline",
  "view",
  "book",
  "queue",
  "pcSub",
  "lifeSub",
  "healthSub",
] as const;

/** Known days-until bands — not invented row values; optional window chips. */
export const RENEWAL_DAYS_BANDS: Array<{ value: string; label: string }> = [
  { value: "overdue", label: "Overdue" },
  { value: "0-30", label: "0–30 days" },
  { value: "31-60", label: "31–60 days" },
  { value: "61-90", label: "61–90 days" },
  { value: "91-180", label: "91–180 days" },
];

export function matchesRenewalDaysBand(daysUntil: number, band: string | undefined): boolean {
  if (!band) return true;
  if (band === "overdue") return daysUntil < 0;
  if (band === "0-30") return daysUntil >= 0 && daysUntil <= 30;
  if (band === "31-60") return daysUntil >= 31 && daysUntil <= 60;
  if (band === "61-90") return daysUntil >= 61 && daysUntil <= 90;
  if (band === "91-180") return daysUntil >= 91 && daysUntil <= 180;
  return true;
}

export function matchesRenewalPipelineColumnFilters(
  card: RenewalBoardCard,
  filter: RenewalPipelineColumnFilter,
): boolean {
  if (filter.stage && !matchesField(card.stage, filter.stage)) return false;
  if (filter.line && !matchesField(card.lineOfBusiness, filter.line)) return false;
  if (filter.carrier && !matchesField(card.carrierName, filter.carrier)) return false;
  if (filter.subType && !matchesField(card.policySubType, filter.subType)) return false;
  if (!matchesRenewalDaysBand(card.daysUntil, filter.daysBand)) return false;
  return true;
}

export function matchesRenewalContains(card: RenewalBoardCard, q: string): boolean {
  return matchesContains(
    q,
    card.clientName,
    card.policyNumber,
    card.carrierName,
    card.lineOfBusiness,
    card.policySubType,
    card.stage,
  );
}

export function buildRenewalPipelineFilterFields(
  cards: RenewalBoardCard[],
  prefs?: PageFilter[],
): FilterField[] {
  const stageExtras = RENEWAL_QUEUE_STAGES.map((value) => ({
    value,
    label: RENEWAL_QUEUE_STAGE_LABELS[value],
  }));
  const lineExtras = LINES.map((value) => ({ value, label: value }));

  const fields: FilterField[] = [
    {
      key: "stage",
      label: "Stage",
      options: uniqueOptions(
        cards.map((card) => card.stage),
        stageExtras,
      ).map((option) => ({
        value: option.value,
        label: isRenewalQueueStage(option.value)
          ? RENEWAL_QUEUE_STAGE_LABELS[option.value]
          : option.label,
      })),
    },
    {
      key: "line",
      label: "Line",
      options: uniqueOptions(
        cards.map((card) => card.lineOfBusiness),
        lineExtras,
      ),
    },
    {
      key: "carrier",
      label: "Carrier",
      options: uniqueOptions(cards.map((card) => card.carrierName)),
    },
    {
      key: "subType",
      label: "Policy subtype",
      options: uniqueOptions(cards.map((card) => card.policySubType)),
    },
    {
      key: "daysBand",
      label: "Days band",
      options: [...RENEWAL_DAYS_BANDS],
    },
  ];
  return prefs ? applyPageFilterPrefsToFields(fields, prefs) : fields;
}
