/** Day-of renewal term-start awareness (Inbox lane). */

import { isoDate } from "@/lib/home/as-of";
import type { PanelUrgency } from "@/lib/notifications/panel";

export const TERM_START_KIND = "renewal_term_started" as const;

export function isSameUtcDay(a: Date, b: Date): boolean {
  return isoDate(a) === isoDate(b);
}

/** En-dash term label: 2026–27 when years differ, else a single year. */
export function termYearLabel(effective: Date, expiration: Date | null | undefined): string {
  const startY = effective.getUTCFullYear();
  if (!expiration || Number.isNaN(expiration.getTime())) return String(startY);
  const endY = expiration.getUTCFullYear();
  if (endY === startY) return String(startY);
  return `${startY}–${String(endY).slice(-2)}`;
}

/**
 * Renewal term starting today — not brand-new business.
 * Same calendar day on the term effective date, plus prior-term or original-effective proof.
 */
export function isRenewalTermStartCandidate(input: {
  termEffective: Date;
  asOf: Date;
  hasPriorTerm: boolean;
  originalEffectiveDate: Date | null;
}): boolean {
  if (!isSameUtcDay(input.termEffective, input.asOf)) return false;
  if (input.hasPriorTerm) return true;
  if (!input.originalEffectiveDate) return false;
  return isoDate(input.originalEffectiveDate) !== isoDate(input.termEffective);
}

/** Idempotent key: one alert per policy + term start day. */
export function termStartKey(policyId: string, termEffective: Date): string {
  return `${TERM_START_KIND}:${policyId}:${isoDate(termEffective)}`;
}

export function termStartCompareHref(policyId: string): string {
  return `/policies/${policyId}/compare`;
}

export function termStartWhy(input: {
  carrierName: string | null | undefined;
  termLabel: string;
}): string {
  const carrier = (input.carrierName ?? "").trim() || "Carrier";
  return `${carrier} ${input.termLabel} term started today`;
}

export function termStartEntityLine(input: {
  insuredName: string;
  lineOfBusiness?: string | null;
}): string {
  const name = input.insuredName.trim() || "Insured";
  const line = (input.lineOfBusiness ?? "").trim();
  return line ? `${name} · ${line}` : name;
}

export function termStartUrgency(): PanelUrgency {
  return "medium";
}

export function termStartPrimaryLabel(): string {
  return "Open Compare";
}
