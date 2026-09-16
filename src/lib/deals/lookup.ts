import { formatPersonName } from "@/lib/crm/display";
import { foldPartyQuery, matchesPartyQuery, phoneDigits } from "@/lib/crm/party-typeahead";
import { dealTitleLobWord } from "@/lib/deals/deal-title";
import type { DocSlot, DocType } from "@/lib/domain";
import { DEAL_UPLOAD_DOC_TYPES, DOC_TYPES } from "@/lib/domain";

export type DealLookupRow = {
  id: string;
  title: string;
  partyName: string | null;
  email?: string | null;
  phone?: string | null;
  contactId?: string | null;
  accountId?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  lineOfBusiness?: string | null;
};

export function normalizeDealQuery(value: string): string {
  return foldPartyQuery(value);
}

export function partyLabel(input: {
  contact?: { firstName?: string | null; lastName?: string | null } | null;
  account?: { name?: string | null; legalName?: string | null; dba?: string | null } | null;
}): string | null {
  if (input.contact) {
    const label = formatPersonName({
      firstName: input.contact.firstName,
      lastName: input.contact.lastName,
    });
    return label === "—" ? null : label;
  }
  const business =
    input.account?.name?.trim() ||
    input.account?.legalName?.trim() ||
    input.account?.dba?.trim() ||
    "";
  return business || null;
}

export function dealLookupHaystack(row: DealLookupRow): string {
  return [
    row.title,
    row.partyName ?? "",
    row.firstName ?? "",
    row.lastName ?? "",
    row.lineOfBusiness ?? "",
    dealTitleLobWord(row.lineOfBusiness),
    row.email ?? "",
    row.phone ?? "",
    phoneDigits(row.phone),
  ]
    .map((part) => foldPartyQuery(part))
    .filter(Boolean)
    .join(" ");
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

  const includes = rows.filter((row) =>
    matchesPartyQuery(query, {
      kind: "contact",
      id: row.id,
      title: row.title,
      partyName: row.partyName,
      firstName: row.firstName,
      lastName: row.lastName,
      name: [row.lineOfBusiness, dealTitleLobWord(row.lineOfBusiness)].filter(Boolean).join(" "),
      email: row.email,
      phone: row.phone,
    }),
  );
  if (includes.length === 1) return includes[0];

  return null;
}

export function suggestDealLookup(rows: DealLookupRow[], query: string, limit = 8): DealLookupRow[] {
  const q = normalizeDealQuery(query);
  if (!q) return [];
  return rows
    .filter((row) =>
      matchesPartyQuery(query, {
        kind: "contact",
        id: row.id,
        title: row.title,
        partyName: row.partyName,
        firstName: row.firstName,
        lastName: row.lastName,
        name: [row.lineOfBusiness, dealTitleLobWord(row.lineOfBusiness)].filter(Boolean).join(" "),
        email: row.email,
        phone: row.phone,
      }),
    )
    .slice(0, limit);
}

export function isDealUploadDocType(value: string): value is (typeof DEAL_UPLOAD_DOC_TYPES)[number] {
  return (DEAL_UPLOAD_DOC_TYPES as readonly string[]).includes(value);
}

export function slotForDocType(docType: string): DocSlot {
  if (docType === "signed_app") return "signed_app";
  if (docType === "quote" || docType === "quote_pdf") return "quote_pdf";
  if (docType === "proposal_pdf" || docType === "proposal") return "proposal";
  if (docType === "policy_dec" || docType === "policy_complete" || docType === "policy_id") {
    return "policy_file";
  }
  return "source_doc";
}

export function coerceDealUploadDocType(value: string): DocType {
  const raw = value.trim().toLowerCase();
  if (raw === "declaration" || raw === "declarations" || raw === "dec_page") return "dec";
  if ((DOC_TYPES as readonly string[]).includes(raw)) return raw as DocType;
  return "other";
}
