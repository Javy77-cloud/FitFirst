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
  if (form) {
    const lines = new Set<ShopLine>([form.shopLine, ...companionLines(formId)]);
    return Array.from(lines);
  }
  const lower = (formId ?? "").trim().toLowerCase();
  if (
    lower === "life" ||
    lower.includes("life") ||
    lower === "iul" ||
    lower.includes("final expense")
  ) {
    return ["life"];
  }
  if (
    lower === "health" ||
    lower.includes("health") ||
    lower.includes("medicare") ||
    lower.includes("marketplace")
  ) {
    return ["health"];
  }
  return ["home"];
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
  Renters: "HO4",
  HO4: "HO4",
  Landlord: "DP3",
  Auto: "PA",
  "Personal auto": "PA",
  Motorcycle: "MOTORCYCLE",
  "Commercial Auto": "CA",
  "Commercial auto": "CA",
  Flood: "FLOOD",
  Umbrella: "HO3",
  GL: "GL",
  BOP: "BOP",
  // Life / Health are freeform subtypes — never coerce to HO3.
  RV: "RV",
  Boat: "BOAT",
  Watercraft: "BOAT",
  "Boat/Watercraft": "BOAT",
  "Mobile Home": "MH",
  "Manufactured Home": "MH",
  "Mobile/Manufactured": "MH",
  "Workers Comp": "WC",
  "Workers' Comp": "WC",
};

const LIFE_HEALTH_PICK: Record<string, { quotingForm: string; policySubType: string; lineOfBusiness: string; quotingLine: ShopLine }> = {
  life: { quotingForm: "Term Life", policySubType: "Term Life", lineOfBusiness: "LIFE", quotingLine: "life" },
  "term life": { quotingForm: "Term Life", policySubType: "Term Life", lineOfBusiness: "LIFE", quotingLine: "life" },
  "whole life": { quotingForm: "Whole Life", policySubType: "Whole Life", lineOfBusiness: "LIFE", quotingLine: "life" },
  iul: { quotingForm: "IUL", policySubType: "IUL", lineOfBusiness: "LIFE", quotingLine: "life" },
  "final expense": { quotingForm: "Final Expense", policySubType: "Final Expense", lineOfBusiness: "LIFE", quotingLine: "life" },
  health: { quotingForm: "Marketplace", policySubType: "Marketplace", lineOfBusiness: "HEALTH", quotingLine: "health" },
  marketplace: { quotingForm: "Marketplace", policySubType: "Marketplace", lineOfBusiness: "HEALTH", quotingLine: "health" },
  "medicare advantage": { quotingForm: "Medicare Advantage", policySubType: "Medicare Advantage", lineOfBusiness: "HEALTH", quotingLine: "health" },
  "medicare a&b": { quotingForm: "Medicare A&B", policySubType: "Medicare A&B", lineOfBusiness: "HEALTH", quotingLine: "health" },
  supplemental: { quotingForm: "Supplemental", policySubType: "Supplemental", lineOfBusiness: "HEALTH", quotingLine: "health" },
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

/** Map a LinePicker / subtype pick onto deal create fields. */
export function dealCreateFieldsFromPick(raw: string | null | undefined): {
  quotingForm: string;
  policySubType: string;
  lineOfBusiness: string;
  quotingLine: ShopLine;
} {
  const trimmed = (raw ?? "").trim();
  const lifeHealth = LIFE_HEALTH_PICK[trimmed.toLowerCase()];
  if (lifeHealth) return { ...lifeHealth };
  // Unknown Life/Health freeform label (agency custom subfilter) → keep label, route by keywords.
  const lower = trimmed.toLowerCase();
  if (trimmed && (lower.includes("life") || lower === "iul" || lower.includes("final expense"))) {
    return {
      quotingForm: trimmed,
      policySubType: trimmed,
      lineOfBusiness: "LIFE",
      quotingLine: "life",
    };
  }
  if (trimmed && (lower.includes("health") || lower.includes("medicare") || lower.includes("marketplace"))) {
    return {
      quotingForm: trimmed,
      policySubType: trimmed,
      lineOfBusiness: "HEALTH",
      quotingLine: "health",
    };
  }
  const formId = coerceQuotingFormId(trimmed) ?? "HO3";
  const form = quotingFormById(formId) ?? quotingFormById("HO3")!;
  return {
    quotingForm: form.id,
    policySubType: form.label,
    lineOfBusiness: form.lob,
    quotingLine: form.shopLine,
  };
}
