/**
 * Quote-pull confirmation sampling.
 * First pull from a new carrier + form layout always confirms.
 * After that, sample roughly one in five. Denied / low-confidence go to admin.
 */

export const QUOTE_CONFIRM_MARKER = "[confirm:";
export const QUOTE_CONFIRM_ACCEPTED = "[confirm:accepted]";
export const QUOTE_CONFIRM_SAMPLED = "[confirm:sample]";
export const QUOTE_CONFIRM_ADMIN = "[confirm:admin]";

export type QuoteConfirmKind = "first" | "sample" | "admin" | "skip";

export function confirmWhy(kind: Exclude<QuoteConfirmKind, "skip">, formId: string): string {
  const marker =
    kind === "first" || kind === "sample"
      ? kind === "first"
        ? QUOTE_CONFIRM_ACCEPTED
        : QUOTE_CONFIRM_SAMPLED
      : QUOTE_CONFIRM_ADMIN;
  return `${marker} form:${formId}`;
}

export function whyHasFormConfirm(why: string | null | undefined, formId: string): boolean {
  const text = why ?? "";
  return text.includes(QUOTE_CONFIRM_MARKER) && text.includes(`form:${formId}`);
}

export function hasCarrierFormConfirmation(
  logs: { carrierId: string; why?: string | null }[],
  carrierId: string,
  formId: string,
): boolean {
  return logs.some((log) => log.carrierId === carrierId && whyHasFormConfirm(log.why, formId));
}

/** Stable ~1-in-5 sample from a quote id. */
export function sampleRequiresConfirm(quoteId: string): boolean {
  let hash = 0;
  for (let i = 0; i < quoteId.length; i += 1) {
    hash = (hash * 31 + quoteId.charCodeAt(i)) >>> 0;
  }
  return hash % 5 === 0;
}

export function isLowConfidencePull(input: {
  premium?: string | number | null;
  bindable?: boolean | null;
  stub?: boolean | null;
}): boolean {
  if (input.bindable === false) return true;
  if (input.premium == null || input.premium === "") return true;
  return false;
}

export function quotePullNeedsConfirm(input: {
  quoteId: string;
  carrierId: string;
  formId: string;
  logs: { carrierId: string; why?: string | null }[];
  denied?: boolean;
  lowConfidence?: boolean;
}): QuoteConfirmKind {
  if (input.denied || input.lowConfidence) return "admin";
  if (!hasCarrierFormConfirmation(input.logs, input.carrierId, input.formId)) return "first";
  if (sampleRequiresConfirm(input.quoteId)) return "sample";
  return "skip";
}
