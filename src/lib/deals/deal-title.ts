import { LOB_TO_SHOP_LINE, QUOTING_FORMS, SHOP_LINE_LABELS } from "@/lib/domain";
import { isQuotingFormId, quotingFormById } from "@/lib/quoting/forms";
import { matchesContains } from "@/lib/search/live-query";

/**
 * Fallback LOB words when no cascade form/subtype is set.
 * Prefer deepest cascade pick (HO3, DP3, Term Life, …) via dealTitleFormWord.
 */
export const DEAL_TITLE_LOB_WORDS: Record<string, string> = {
  HO: "Homeowners",
  AUTO: "Auto",
  FLOOD: "Flood",
  UMBRELLA: "Umbrella",
  GL: "GL",
  BOP: "BOP",
  LIFE: "Life",
  HEALTH: "Health",
  RV: "RV",
  WC: "Workers Comp",
};

/** Sheet product ids / generic words that are not cascade form labels. */
const NON_FORM_TITLE_WORDS = /^(homeowners|landlord|renters|home)$/i;

/**
 * Deepest cascade pick label for titles — HO3, DP3, Auto, Term Life, etc.
 * Does not map Life→HO3 (legacy coerce) and skips generic sheet products.
 */
export function dealTitleFormWord(raw: string | null | undefined): string | null {
  const value = (raw ?? "").trim();
  if (!value) return null;
  if (NON_FORM_TITLE_WORDS.test(value)) return null;
  if (isQuotingFormId(value)) {
    return quotingFormById(value)?.label ?? value;
  }
  const byLabel = QUOTING_FORMS.find((form) => form.label.toLowerCase() === value.toLowerCase());
  if (byLabel) return byLabel.label;
  // Life / Health freeform (Term Life, Whole Life, …) — keep exact label.
  return value;
}

const LEGACY_SHOP_TITLE =
  /\s*(?:[·•\-–—]|-)\s*[A-Za-z0-9]+\s+shop\s*$/i;

const TITLE_PART_SEP = " / ";

export function dealTitleLobWord(
  line: string | null | undefined,
  formOrSubtype?: string | null,
): string {
  const fromForm = dealTitleFormWord(formOrSubtype);
  if (fromForm) return fromForm;
  const code = (line ?? "").trim().toUpperCase();
  if (DEAL_TITLE_LOB_WORDS[code]) return DEAL_TITLE_LOB_WORDS[code]!;
  const shop = LOB_TO_SHOP_LINE[code];
  if (shop && SHOP_LINE_LABELS[shop]) return SHOP_LINE_LABELS[shop];
  const cleaned = (line ?? "").trim();
  return cleaned || "Homeowners";
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Include retired title words so strip/parse still works on older deals. */
const LEGACY_TITLE_LOB_WORDS = ["Home", "Workers' Comp"] as const;

function allDealTitleLobWords() {
  return [
    ...new Set([
      ...Object.values(DEAL_TITLE_LOB_WORDS),
      ...Object.values(SHOP_LINE_LABELS),
      ...QUOTING_FORMS.map((form) => form.label),
      ...LEGACY_TITLE_LOB_WORDS,
    ]),
  ];
}

/** Drop shop leftovers and trailing " / {product}" (or legacy space LOB) so we can rebuild. */
export function stripDealTitleLob(title: string | null | undefined): string {
  let value = stripLegacyShopSuffix(title);
  const sepIdx = value.lastIndexOf(TITLE_PART_SEP);
  if (sepIdx >= 0) {
    return value.slice(0, sepIdx).trim();
  }
  for (const word of allDealTitleLobWords()) {
    value = value.replace(new RegExp(`(?:\\s+)${escapeRegExp(word)}\\s*$`, "i"), "").trim();
  }
  return value;
}

export function parseTitlePerson(title: string | null | undefined): {
  firstName: string;
  lastName: string;
} {
  const stripped = stripDealTitleLob(title);
  if (!stripped) return { firstName: "", lastName: "" };
  if (stripped.includes("/")) {
    const parts = stripped.split("/").map((part) => part.trim()).filter(Boolean);
    if (parts.length >= 2) return { firstName: parts[0]!, lastName: parts.slice(1).join(" ") };
    return { firstName: "", lastName: parts[0] ?? "" };
  }
  return splitPersonName(stripped);
}

export function joinDealTitleParts(...parts: Array<string | null | undefined>): string {
  return parts.map((part) => (part ?? "").trim()).filter(Boolean).join(TITLE_PART_SEP);
}

export function isLegacyShopTitle(title: string | null | undefined): boolean {
  const value = (title ?? "").trim();
  if (!value) return false;
  if (LEGACY_SHOP_TITLE.test(value)) return true;
  return /\bHO\s+shop\b/i.test(value) || (/\bshop\b/i.test(value) && /\bHO\d?\b/i.test(value));
}

export function stripLegacyShopSuffix(title: string | null | undefined): string {
  return (title ?? "")
    .replace(LEGACY_SHOP_TITLE, "")
    .replace(/\s+[·•\-–—]\s+[A-Za-z0-9]+(?:\s+shop)?\s*$/i, "")
    .trim();
}

export function splitPersonName(value: string | null | undefined): {
  firstName: string;
  lastName: string;
} {
  const raw = (value ?? "").trim();
  if (!raw) return { firstName: "", lastName: "" };
  if (raw.includes(",")) {
    const [last, given = ""] = raw.split(",").map((part) => part.trim());
    const [first] = given.split(/\s+/);
    return { firstName: first ?? "", lastName: last ?? "" };
  }
  const parts = raw.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return { firstName: "", lastName: parts[0]! };
  return { firstName: parts[0]!, lastName: parts.slice(1).join(" ") };
}

export type DealTitleInput = {
  firstName?: string | null;
  lastName?: string | null;
  contact?: { firstName?: string | null; lastName?: string | null } | null;
  lead?: { firstName?: string | null; lastName?: string | null } | null;
  accountName?: string | null;
  primaryNamedInsured?: string | null;
  existingTitle?: string | null;
  line: string | null | undefined;
  /** Deepest cascade form id (HO3, DP3, PA, …). */
  quotingForm?: string | null;
  /** Cascade subtype / life-health label (HO3, Term Life, …). */
  policySubType?: string | null;
};

export function resolveDealPerson(input: {
  firstName?: string | null;
  lastName?: string | null;
  contact?: { firstName?: string | null; lastName?: string | null } | null;
  lead?: { firstName?: string | null; lastName?: string | null } | null;
  accountName?: string | null;
  primaryNamedInsured?: string | null;
  existingTitle?: string | null;
}): { firstName: string; lastName: string; accountName: string } {
  const insured = splitPersonName(input.primaryNamedInsured);
  const leftover = parseTitlePerson(input.existingTitle);
  // Deal applicant/insured fields win over linked contact/lead so Deal Details
  // renames (wife as applicant, lead stays husband) retitle the deal.
  const explicitFirst =
    input.firstName?.trim() ||
    insured.firstName ||
    input.contact?.firstName?.trim() ||
    input.lead?.firstName?.trim() ||
    "";
  const explicitLast =
    input.lastName?.trim() ||
    insured.lastName ||
    input.contact?.lastName?.trim() ||
    input.lead?.lastName?.trim() ||
    "";
  const accountName = input.accountName?.trim() || "";
  const useLeftover = !explicitFirst && !explicitLast && !accountName;
  return {
    firstName: explicitFirst || (useLeftover ? leftover.firstName : ""),
    lastName: explicitLast || (useLeftover ? leftover.lastName : ""),
    accountName,
  };
}

export function formatDealPersonName(
  firstName?: string | null,
  lastName?: string | null,
): string {
  return [firstName, lastName]
    .map((part) => (part ?? "").trim())
    .filter(Boolean)
    .join(" ");
}

/** First Last / {form} — e.g. Gloria Martinez / DP3. One slash. Form label beats generic Homeowners. */
export function formatDealTitle(input: DealTitleInput): string {
  const person = resolveDealPerson(input);
  const name = formatDealPersonName(person.firstName, person.lastName) || person.accountName;
  const formHint =
    dealTitleFormWord(input.quotingForm) ?? dealTitleFormWord(input.policySubType) ?? null;
  const lob = formHint ?? dealTitleLobWord(input.line);
  if (!name) return lob;
  if (name.toLowerCase() === lob.toLowerCase()) return name;
  const suffix = `${TITLE_PART_SEP}${lob}`.toLowerCase();
  if (name.toLowerCase().endsWith(suffix)) return name;
  return joinDealTitleParts(name, lob);
}

export function dealTitleFromPerson(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  line: string | null | undefined,
  accountName?: string | null,
): string {
  return formatDealTitle({ firstName, lastName, line, accountName });
}

export type DealSearchFields = {
  title?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  accountName?: string | null;
  primaryNamedInsured?: string | null;
  lineOfBusiness?: string | null;
  quotingForm?: string | null;
  policySubType?: string | null;
};

/** Title plus first / last / LOB so search works even when the title lags. */
export function dealSearchHaystack(input: DealSearchFields): string {
  const parts = [
    input.title,
    input.firstName,
    input.lastName,
    input.accountName,
    input.primaryNamedInsured,
    input.lineOfBusiness,
    input.quotingForm,
    input.policySubType,
    dealTitleLobWord(input.lineOfBusiness, input.quotingForm ?? input.policySubType),
  ]
    .map((part) => (part == null ? "" : String(part).trim()))
    .filter(Boolean);
  return parts.join(" ");
}

export function matchesDealNameSearch(query: string, input: DealSearchFields): boolean {
  return matchesContains(query, dealSearchHaystack(input));
}

export function dealTitleForRecords(input: {
  lineOfBusiness: string;
  primaryNamedInsured?: string | null;
  title?: string | null;
  contact?: { firstName?: string | null; lastName?: string | null } | null;
  lead?: { firstName?: string | null; lastName?: string | null } | null;
  account?: { name?: string | null } | null;
  firstName?: string | null;
  lastName?: string | null;
  quotingForm?: string | null;
  policySubType?: string | null;
}): string {
  return formatDealTitle({
    firstName: input.firstName,
    lastName: input.lastName,
    contact: input.contact,
    lead: input.lead,
    accountName: input.account?.name,
    primaryNamedInsured: input.primaryNamedInsured,
    existingTitle: input.title,
    line: input.lineOfBusiness,
    quotingForm: input.quotingForm,
    policySubType: input.policySubType,
  });
}
