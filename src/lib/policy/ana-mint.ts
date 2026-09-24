import { CONTACT_ID, DEAL_ID, LEAD_ID, RISK_ID } from "@/lib/fixtures/ids";
import { isProtectedAnaRecord } from "@/lib/developer-hub/protected";

export const ANA_MINT_REFUSAL =
  "Ana Dib stays unbound. Coverage A stays $321,000. This mint was refused.";

export type AnaMintIdentity = {
  dealId?: string | null;
  contactId?: string | null;
  leadId?: string | null;
  riskId?: string | null;
  riskIds?: readonly (string | null | undefined)[] | null;
  namedInsured?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  coverageA?: number | null;
};

const ANA_IDS = new Set([LEAD_ID, DEAL_ID, RISK_ID, CONTACT_ID]);

function norm(value?: string | null): string {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

/** Stable identity key. Ana's key is refused on every mint attempt, including duplicates. */
export function anaMintIdentityKey(input: AnaMintIdentity): string | null {
  const ids = [input.dealId, input.contactId, input.leadId, input.riskId, ...(input.riskIds ?? [])];
  for (const id of ids) {
    const value = (id ?? "").trim();
    if (value && (ANA_IDS.has(value) || isProtectedAnaRecord(value))) return `ana:${value}`;
  }
  const named = norm(input.namedInsured);
  const person = norm(`${input.firstName ?? ""} ${input.lastName ?? ""}`);
  const blob = `${named} ${person}`.trim();
  if (/\bana\b/.test(blob) && /\bdib\b/.test(blob)) return "ana:name";
  return null;
}

export function refuseAnaPolicyMint(
  input: AnaMintIdentity,
): { refused: true; reason: "ana_locked"; message: string } | { refused: false } {
  if (!anaMintIdentityKey(input)) return { refused: false };
  return { refused: true, reason: "ana_locked", message: ANA_MINT_REFUSAL };
}
