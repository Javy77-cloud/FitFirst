import {
  LOST_BUSINESS_REASON_LABELS,
  isLostBusinessReason,
} from "@/lib/domain";
import {
  REASON_FOR_NO_LABELS,
  bindRequirementChips,
  isReasonForNo,
  normalizeRiskOutcome,
  shortReasonLabel,
} from "@/lib/quotes/outcomes";

export type QuoteRowReason = {
  label: string;
  detail: string | null;
  chips: string[];
  provided: boolean;
};

const GENERIC = /needs follow-up|^—$|ready to bind|re-check this quote before bind/i;

function labelStoredReason(value: string | null | undefined): string | null {
  const raw = (value ?? "").trim();
  if (!raw) return null;
  if (isLostBusinessReason(raw)) return LOST_BUSINESS_REASON_LABELS[raw];
  if (isReasonForNo(raw)) return REASON_FOR_NO_LABELS[raw];
  if (GENERIC.test(raw)) return null;
  return raw.replace(/[_-]+/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function concreteReasonFromBlob(blob: string): string | null {
  const text = blob.trim();
  if (!text) return null;
  const flood = text.match(/flood\s*zone\s*([a-z0-9]+)/i);
  if (flood?.[1]) return `Flood zone ${flood[1].toUpperCase()}`;
  if (/uw\s*(hold|referral|review)|underwriting\s*(hold|referral)/i.test(text)) {
    return "Underwriting hold";
  }
  if (/not appointed|unappointed|no appointment/i.test(text)) return "Not appointed";
  if (/premium\s*(mismatch|too high|increase)|rate\s*increase/i.test(text)) {
    return "Premium mismatch";
  }
  if (/deductible\s*(mismatch|too high|increase)/i.test(text)) return "Deductible mismatch";
  if (/coverage\s*(mismatch|short|gap|below)/i.test(text)) return "Coverage mismatch";
  return null;
}

/**
 * Concrete on-row reason for warnings / conditionals.
 * Prefers bindRequirements, coverage gaps, and parsed note chips — never a hollow generic
 * when a real field exists. Falls back to an honest empty state.
 */
export function quoteRowReason(input: {
  notes?: string | null;
  riskOutcome?: string | null;
  coverageGaps?: string[] | null;
  bindRequirements?: string[] | null;
  coverageA?: number | null;
  hurricaneDeductible?: string | null;
  requestedCoverageA?: number | null;
  logWhy?: string | null;
  lostReason?: string | null;
  reasonForNo?: string | null;
}): QuoteRowReason {
  const storedReason = labelStoredReason(input.lostReason) ?? labelStoredReason(input.reasonForNo);
  const reasonBlob = [input.notes, input.logWhy].filter(Boolean).join(" · ");
  const chips = bindRequirementChips({
    notes: reasonBlob || input.notes,
    gaps: input.coverageGaps,
    bindRequirements: input.bindRequirements,
    coverageA: input.coverageA,
    hurricaneDeductible: input.hurricaneDeductible,
    requestedCoverageA: input.requestedCoverageA,
  });
  const fromBlob = concreteReasonFromBlob(reasonBlob);
  const outcome = normalizeRiskOutcome(input.riskOutcome);
  const short = shortReasonLabel({
    notes: reasonBlob || input.notes,
    riskOutcome: input.riskOutcome,
    gaps: input.coverageGaps ?? undefined,
  });
  if (chips.length) {
    return {
      label: chips[0]!,
      detail: chips.slice(1).join(" · ") || null,
      chips,
      provided: true,
    };
  }
  if (storedReason) {
    return { label: storedReason, detail: fromBlob && fromBlob !== storedReason ? fromBlob : null, chips, provided: true };
  }
  if (fromBlob) {
    return { label: fromBlob, detail: short && !GENERIC.test(short) ? short : null, chips, provided: true };
  }
  if (short && !GENERIC.test(short)) {
    return { label: short, detail: null, chips: [short], provided: true };
  }
  if (outcome === "bindable") {
    return { label: "Ready to bind", detail: null, chips: [], provided: true };
  }
  if (outcome === "conditional") {
    return {
      label: "Reason not provided by carrier",
      detail: "Conditional — no bind requirement or UW note landed on this quote.",
      chips: [],
      provided: false,
    };
  }
  if (outcome === "declined") {
    return {
      label: "Reason not provided by carrier",
      detail: "Declined — carrier did not send a readable why.",
      chips: [],
      provided: false,
    };
  }
  if (outcome === "no_market") {
    return {
      label: "No market",
      detail: "Carrier closed or will not write this risk.",
      chips: [],
      provided: true,
    };
  }
  return {
    label: "Reason not provided by carrier",
    detail: null,
    chips: [],
    provided: false,
  };
}
