import {
  APPETITE_CAPTURE_RESULTS,
  QUOTE_RESULTS,
  QUOTING_FORMS,
  type AppetiteCaptureResult,
  type QuoteAttemptResult,
  type QuotingFormId,
  type ShopLine,
} from "@/lib/domain";

export function quotingFormById(id: string) {
  return QUOTING_FORMS.find((form) => form.id === id) ?? null;
}

export function isQuotingFormId(id: string): id is QuotingFormId {
  return QUOTING_FORMS.some((form) => form.id === id);
}

/** HO3 also prepares Auto + commercial worksheets so the desk does not start those from scratch. */
export function companionLines(formId: string): ShopLine[] {
  if (formId === "HO3") return ["auto", "general_liability", "workers_comp"];
  return [];
}

export function sheetsToPrepare(formId: string): ShopLine[] {
  const form = quotingFormById(formId);
  if (!form) return ["home"];
  const lines = new Set<ShopLine>([form.shopLine, ...companionLines(formId)]);
  return Array.from(lines);
}

export function canUnlockQuoting(input: { reviewed: boolean; sure: boolean }): boolean {
  return Boolean(input.reviewed && input.sure);
}

export function isAppetiteCaptureResult(value: string): value is AppetiteCaptureResult {
  return (APPETITE_CAPTURE_RESULTS as readonly string[]).includes(value);
}

/** `maybe` stays on the internal log and does not feed filter-first matching. */
export function isMatchPriorResult(value: string): value is QuoteAttemptResult {
  return (QUOTE_RESULTS as readonly string[]).includes(value);
}

export function quotingUnlockedForDeal(deal: {
  quotingUnlocked?: boolean | null;
  pipelineStage?: string | null;
}): boolean {
  if (deal.quotingUnlocked) return true;
  return deal.pipelineStage === "bound" || deal.pipelineStage === "closed_won";
}

const LEGACY_INSURANCE_TYPE_TO_FORM: Record<string, QuotingFormId> = {
  Home: "HO3",
  Homeowners: "HO3",
  Renters: "HO3",
  Landlord: "DP3",
  Auto: "PA",
  "Personal auto": "PA",
  Motorcycle: "PA",
  "Commercial Auto": "PA",
  Flood: "FLOOD",
  Umbrella: "HO3",
  GL: "GL",
  BOP: "BOP",
  Life: "HO3",
  Health: "HO3",
  RV: "PA",
  "Workers Comp": "WC",
  "Workers' Comp": "WC",
};

/** Picklist / legacy LOB words → quoting form id (HO3, PA, …). */
export function coerceQuotingFormId(value: string | null | undefined): QuotingFormId | null {
  const raw = (value ?? "").trim();
  if (!raw) return null;
  if (isQuotingFormId(raw)) return raw;
  const byLabel = QUOTING_FORMS.find((form) => form.label.toLowerCase() === raw.toLowerCase());
  if (byLabel) return byLabel.id;
  const legacy = LEGACY_INSURANCE_TYPE_TO_FORM[raw];
  return legacy ?? null;
}

export function quotingFormLabel(id: string | null | undefined): string {
  const form = quotingFormById(id ?? "");
  return form?.label ?? (id ?? "").trim();
}

/** Option labels for the Deal Details Insurance subtype picklist. */
export function insuranceSubtypeOptions(): string[] {
  return QUOTING_FORMS.map((form) => form.label);
}
