import { mergeDealListCascadeSync } from "@/lib/deals/insurance-cascade";
import { DEAL_WORK_TAB_KEY } from "@/lib/deals/tabs";
import { formatDealTitle, parseTitlePerson, stripDealTitleLob } from "@/lib/deals/deal-title";

/** Custom-field keys that must not ride along when cloning Deal Details. */
export const DEAL_COPY_SKIP_KEYS = new Set([DEAL_WORK_TAB_KEY]);

/** Copy filled Deal Details values; drop work-tab and empties. */
export function copyDealDetailValues(
  source: Record<string, string | null | undefined> | null | undefined,
): Record<string, string> {
  const out: Record<string, string> = {};
  if (!source) return out;
  for (const [key, raw] of Object.entries(source)) {
    if (DEAL_COPY_SKIP_KEYS.has(key)) continue;
    const value = String(raw ?? "").trim();
    if (value) out[key] = value;
  }
  return mergeDealListCascadeSync(out);
}

export type SourceDealTitleParts = {
  title?: string | null;
  lineOfBusiness?: string | null;
  primaryNamedInsured?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  accountName?: string | null;
  contact?: { firstName?: string | null; lastName?: string | null } | null;
  quotingForm?: string | null;
  policySubType?: string | null;
};

/** Rebuild First Last / {form} — never append "(copy)". */
export function titleForCopiedDeal(input: SourceDealTitleParts): string {
  const line = input.lineOfBusiness || "HO";
  const fromTitle = parseTitlePerson(input.title);
  const stripped = stripDealTitleLob(input.title);
  // Drop a trailing "(copy)" leftover from older duplicates.
  const cleaned = stripped.replace(/\s*\(copy\)\s*$/i, "").trim();
  return formatDealTitle({
    firstName: input.firstName || input.contact?.firstName || fromTitle.firstName,
    lastName: input.lastName || input.contact?.lastName || fromTitle.lastName,
    accountName: input.accountName,
    primaryNamedInsured: input.primaryNamedInsured,
    existingTitle: cleaned || input.title,
    line,
    quotingForm: input.quotingForm,
    policySubType: input.policySubType,
  });
}

export type CreateDealPickHit = {
  kind: "deal" | "contact";
  id: string;
  title: string;
  subtitle: string;
  /** When kind=contact, optional latest deal to copy from. */
  sourceDealId?: string | null;
};
