import { DESK_AS_OF } from "@/lib/home/as-of";

const EXPIRING_DOC_TYPES = new Set([
  "policy_id",
  "id_card",
  "coi",
  "certificate",
  "inspection",
  "inspection_report",
]);

export function isExpiringDocType(docType: string): boolean {
  const raw = docType.toLowerCase();
  if (EXPIRING_DOC_TYPES.has(raw)) return true;
  return /id|coi|inspection|certificate/.test(raw);
}

export function daysUntilDocExpiry(
  expiresAt: Date | string | null | undefined,
  asOf: Date = DESK_AS_OF,
): number | null {
  if (!expiresAt) return null;
  const exp = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
  if (Number.isNaN(exp.getTime())) return null;
  const startAsOf = Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth(), asOf.getUTCDate());
  const startExp = Date.UTC(exp.getUTCFullYear(), exp.getUTCMonth(), exp.getUTCDate());
  return Math.round((startExp - startAsOf) / 86_400_000);
}

/** Warn when ID/COI/inspection expires within 30 days (or already expired). */
export function docExpiryWarning(
  docType: string,
  expiresAt: Date | string | null | undefined,
  asOf: Date = DESK_AS_OF,
): { warn: boolean; days: number | null; label: string | null } {
  if (!isExpiringDocType(docType)) return { warn: false, days: null, label: null };
  const days = daysUntilDocExpiry(expiresAt, asOf);
  if (days == null) return { warn: false, days: null, label: null };
  if (days < 0) return { warn: true, days, label: `Expired ${Math.abs(days)} days ago` };
  if (days <= 30) return { warn: true, days, label: `Expires in ${days} days` };
  return { warn: false, days, label: null };
}

export function autoTagDocType(docType: string): string {
  const raw = docType.replaceAll("_", " ");
  if (/dec/i.test(docType)) return "Dec";
  if (/endors/i.test(docType)) return "Endorsement";
  if (/appl/i.test(docType)) return "Application";
  if (/bind/i.test(docType)) return "Binder";
  if (/id/i.test(docType)) return "ID card";
  if (/aor/i.test(docType)) return "AOR";
  if (/notice/i.test(docType)) return "Notice";
  if (/coi|certificate/i.test(docType)) return "COI";
  if (/inspect/i.test(docType)) return "Inspection";
  return raw.replace(/\b\w/g, (ch) => ch.toUpperCase());
}
