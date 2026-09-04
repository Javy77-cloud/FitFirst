import type { DocSlot, DocType } from "@/lib/domain";
import { DEAL_UPLOAD_DOC_TYPES, DOC_TYPES } from "@/lib/domain";

export type DealLookupRow = {
  id: string;
  title: string;
  partyName: string | null;
};

export function normalizeDealQuery(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function partyLabel(input: {
  contact?: { firstName: string; lastName: string } | null;
  account?: { name: string } | null;
}): string | null {
  if (input.contact) {
    return `${input.contact.lastName}, ${input.contact.firstName}`;
  }
  if (input.account?.name) return input.account.name;
  return null;
}

export function dealLookupHaystack(row: DealLookupRow): string {
  return normalizeDealQuery([row.title, row.partyName ?? ""].filter(Boolean).join(" "));
}

/**
 * Resolve an existing Deal from a typed name (person or business) or a selected id.
 * Ambiguous names do not attach — the agent must pick one Deal.
 */
export function matchDealLookup(
  rows: DealLookupRow[],
  query: string,
  dealId?: string | null,
): DealLookupRow | null {
  if (dealId) {
    const byId = rows.find((row) => row.id === dealId);
    if (byId) return byId;
  }
  const q = normalizeDealQuery(query);
  if (!q) return null;

  const exactTitle = rows.filter((row) => normalizeDealQuery(row.title) === q);
  if (exactTitle.length === 1) return exactTitle[0];

  const exactParty = rows.filter((row) => row.partyName && normalizeDealQuery(row.partyName) === q);
  if (exactParty.length === 1) return exactParty[0];

  const starts = rows.filter((row) => {
    const title = normalizeDealQuery(row.title);
    const party = row.partyName ? normalizeDealQuery(row.partyName) : "";
    return title.startsWith(q) || (party !== "" && party.startsWith(q));
  });
  if (starts.length === 1) return starts[0];

  const includes = rows.filter((row) => dealLookupHaystack(row).includes(q));
  if (includes.length === 1) return includes[0];

  return null;
}

export function suggestDealLookup(rows: DealLookupRow[], query: string, limit = 8): DealLookupRow[] {
  const q = normalizeDealQuery(query);
  if (!q) return rows.slice(0, limit);
  return rows.filter((row) => dealLookupHaystack(row).includes(q)).slice(0, limit);
}

export function isDealUploadDocType(value: string): value is (typeof DEAL_UPLOAD_DOC_TYPES)[number] {
  return (DEAL_UPLOAD_DOC_TYPES as readonly string[]).includes(value);
}

export function slotForDocType(docType: string): DocSlot {
  if (docType === "signed_app") return "signed_app";
  if (docType === "quote" || docType === "quote_pdf") return "quote_pdf";
  if (docType === "proposal_pdf") return "proposal";
  if (docType === "policy_dec" || docType === "policy_complete" || docType === "policy_id") {
    return "policy_file";
  }
  return "source_doc";
}

export function coerceDealUploadDocType(value: string): DocType {
  const raw = value.trim().toLowerCase();
  if ((DOC_TYPES as readonly string[]).includes(raw)) return raw as DocType;
  return "other";
}
