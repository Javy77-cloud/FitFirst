import { LOB_TO_SHOP_LINE, SHOP_LINE_LABELS } from "@/lib/domain";
import { matchesContains } from "@/lib/search/live-query";

/** Short LOB words for deal titles — Home, Auto, Flood — never HO / HO3 shop codes. */
export const DEAL_TITLE_LOB_WORDS: Record<string, string> = {
  HO: "Home",
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

const LEGACY_SHOP_TITLE =
  /\s*(?:[·•\-–—]|-)\s*[A-Za-z0-9]+\s+shop\s*$/i;

export function dealTitleLobWord(line: string | null | undefined): string {
  const code = (line ?? "").trim().toUpperCase();
  if (DEAL_TITLE_LOB_WORDS[code]) return DEAL_TITLE_LOB_WORDS[code]!;
  const shop = LOB_TO_SHOP_LINE[code];
  if (shop && SHOP_LINE_LABELS[shop]) return SHOP_LINE_LABELS[shop];
  const cleaned = (line ?? "").trim();
  return cleaned || "Home";
}

export function isLegacyShopTitle(title: string | null | undefined): boolean {
  const value = (title ?? "").trim();
  if (!value) return false;
  if (LEGACY_SHOP_TITLE.test(value)) return true;
  return /\bHO\s+shop\b/i.test(value) || /\bshop\b/i.test(value) && /\bHO\d?\b/i.test(value);
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
  const leftover = splitPersonName(stripLegacyShopSuffix(input.existingTitle));
  const firstName =
    input.firstName?.trim() ||
    input.contact?.firstName?.trim() ||
    input.lead?.firstName?.trim() ||
    insured.firstName ||
    leftover.firstName ||
    "";
  const lastName =
    input.lastName?.trim() ||
    input.contact?.lastName?.trim() ||
    input.lead?.lastName?.trim() ||
    insured.lastName ||
    leftover.lastName ||
    "";
  return {
    firstName,
    lastName,
    accountName: input.accountName?.trim() || "",
  };
}

/** First Last Lob — e.g. Javier Canales Home. Falls back to account name for commercial. */
export function formatDealTitle(input: DealTitleInput): string {
  const person = resolveDealPerson(input);
  const who = [person.firstName, person.lastName].filter(Boolean).join(" ") || person.accountName;
  const lob = dealTitleLobWord(input.line);
  if (!who) return lob;
  const already = new RegExp(`\\b${lob.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
  if (already.test(who)) return who;
  return `${who} ${lob}`;
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
    dealTitleLobWord(input.lineOfBusiness),
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
  });
}
