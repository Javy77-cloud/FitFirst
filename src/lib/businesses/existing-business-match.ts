import { normalizeEin } from "@/lib/wire/match-party";
import { normalizeName } from "@/lib/lifecycle/lead-match";

export type ExistingBusinessRow = {
  id: string;
  name: string;
  legalName?: string | null;
  dba?: string | null;
  einLast4?: string | null;
  einLookup?: string | null;
};

export type BusinessMatchReason = "ein" | "name";

export type BusinessMatch = {
  business: ExistingBusinessRow;
  reason: BusinessMatchReason;
};

function nameCandidates(row: ExistingBusinessRow): string[] {
  return [row.name, row.legalName, row.dba]
    .map((v) => normalizeName(v))
    .filter(Boolean) as string[];
}

/**
 * Soft duplicate warn for Add Business.
 * Prefer EIN (last4 when vaulted), then exact normalized legal/DBA/name.
 * Never blocks save — caller shows a banner only.
 */
export function findExistingBusinessMatch(
  businesses: readonly ExistingBusinessRow[],
  incoming: { name?: string | null; legalName?: string | null; dba?: string | null; ein?: string | null },
): BusinessMatch | null {
  const einDigits = normalizeEin(incoming.ein);
  if (einDigits && einDigits.length >= 4) {
    const last4 = einDigits.slice(-4);
    const einHit = businesses.find((row) => (row.einLast4 ?? "").trim() === last4);
    if (einHit) return { business: einHit, reason: "ein" };
  }

  const incomingNames = [incoming.legalName, incoming.name, incoming.dba]
    .map((v) => normalizeName(v))
    .filter(Boolean) as string[];
  if (!incomingNames.length) return null;

  for (const row of businesses) {
    const existing = nameCandidates(row);
    if (incomingNames.some((n) => existing.includes(n))) {
      return { business: row, reason: "name" };
    }
  }
  return null;
}

export function businessMatchLabel(match: BusinessMatch): string {
  const row = match.business;
  const dba = (row.dba ?? "").trim();
  if (dba && dba.toLowerCase() !== row.name.toLowerCase()) return `${row.name} (DBA ${dba})`;
  return row.name;
}

export function businessMatchReasonText(reason: BusinessMatchReason): string {
  if (reason === "ein") return "same EIN";
  return "same name";
}
