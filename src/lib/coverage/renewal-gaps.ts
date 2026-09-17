import {
  analyzeCoverageGaps,
  gapLineLabel,
  type CoverageGapFinding,
  type CoverageLine,
  type GapPolicyInput,
  type GapRuleId,
} from "@/lib/coverage/gaps";
import { DEAL_PRODUCT_DEFS, type DealProductId } from "@/lib/deals/deal-products";

export const RENEWAL_GAP_STRIP_LIMIT = 3;

export const GAP_DISMISS_REASONS = ["not_interested", "already_elsewhere", "not_eligible"] as const;
export type GapDismissReason = (typeof GAP_DISMISS_REASONS)[number];

export const GAP_DISMISS_REASON_LABELS: Record<GapDismissReason, string> = {
  not_interested: "Not interested",
  already_elsewhere: "Already elsewhere",
  not_eligible: "Not eligible",
};

export type GapDismissParty = {
  partyKind: "contact" | "account";
  partyId: string;
};

export type RenewalGapItem = {
  id: GapRuleId;
  title: string;
  why: string;
  missing: CoverageLine[];
  missingLabel: string;
  productId: DealProductId | null;
  productLabel: string | null;
  severity: CoverageGapFinding["severity"];
};

/** First catalog product for a missing companion line — never invent a fake product. */
export function dealProductForCoverageLine(line: CoverageLine): DealProductId | null {
  return DEAL_PRODUCT_DEFS.find((def) => def.lob === line)?.id ?? null;
}

export function isGapDismissReason(value: string | null | undefined): value is GapDismissReason {
  return GAP_DISMISS_REASONS.includes(String(value ?? "") as GapDismissReason);
}

export function gapDismissParty(input: {
  contactId?: string | null;
  accountId?: string | null;
}): GapDismissParty | null {
  if (input.contactId) return { partyKind: "contact", partyId: input.contactId };
  if (input.accountId) return { partyKind: "account", partyId: input.accountId };
  return null;
}

export function partyGapKey(kind: string, id: string): string {
  return `${kind}:${id}`;
}

export function filterActiveFindings<T extends { id: string }>(
  findings: readonly T[],
  dismissedRuleIds?: Iterable<string> | null,
): T[] {
  const skip = new Set(dismissedRuleIds ?? []);
  if (skip.size === 0) return [...findings];
  return findings.filter((finding) => !skip.has(finding.id));
}

export function toRenewalGapItem(finding: CoverageGapFinding): RenewalGapItem {
  const missing = finding.missing[0] ?? null;
  const productId = missing ? dealProductForCoverageLine(missing) : null;
  const productLabel = productId
    ? (DEAL_PRODUCT_DEFS.find((def) => def.id === productId)?.label ?? null)
    : null;
  return {
    id: finding.id,
    title: finding.title,
    why: finding.plainEnglish,
    missing: finding.missing,
    missingLabel: finding.missing.map(gapLineLabel).join(", "),
    productId,
    productLabel,
    severity: finding.severity,
  };
}

export function sliceRenewalGapStrip<T>(findings: readonly T[], limit = RENEWAL_GAP_STRIP_LIMIT): {
  visible: T[];
  overflowCount: number;
} {
  return {
    visible: findings.slice(0, limit),
    overflowCount: Math.max(0, findings.length - limit),
  };
}

export function householdGapItems(input: {
  policies: GapPolicyInput[];
  partyName: string;
  dismissedRuleIds?: Iterable<string> | null;
  isAna?: boolean;
  quoteCount?: number;
}): RenewalGapItem[] {
  const report = analyzeCoverageGaps({
    policies: input.policies,
    partyName: input.partyName,
    isAna: input.isAna,
    quoteCount: input.quoteCount,
  });
  return filterActiveFindings(report.findings, input.dismissedRuleIds).map(toRenewalGapItem);
}

export function householdGapCount(input: {
  policies: GapPolicyInput[];
  partyName: string;
  dismissedRuleIds?: Iterable<string> | null;
  isAna?: boolean;
}): number {
  return householdGapItems(input).length;
}

export function dismissedRuleIdsForHousehold(
  dismissedByParty: Map<string, Set<string>>,
  input: { contactId?: string | null; accountId?: string | null },
): Set<string> {
  const ids = new Set<string>();
  if (input.contactId) {
    for (const id of dismissedByParty.get(partyGapKey("contact", input.contactId)) ?? []) ids.add(id);
  }
  if (input.accountId) {
    for (const id of dismissedByParty.get(partyGapKey("account", input.accountId)) ?? []) ids.add(id);
  }
  return ids;
}

export function indexHouseholdPolicies(
  policies: Array<GapPolicyInput & { contactId?: string | null; accountId?: string | null }>,
): { byContact: Map<string, GapPolicyInput[]>; byAccount: Map<string, GapPolicyInput[]> } {
  const byContact = new Map<string, GapPolicyInput[]>();
  const byAccount = new Map<string, GapPolicyInput[]>();
  for (const row of policies) {
    const item: GapPolicyInput = {
      id: row.id,
      status: row.status,
      lineOfBusiness: row.lineOfBusiness,
      policyNumber: row.policyNumber,
    };
    if (row.contactId) {
      const list = byContact.get(row.contactId) ?? [];
      list.push(item);
      byContact.set(row.contactId, list);
    }
    if (row.accountId) {
      const list = byAccount.get(row.accountId) ?? [];
      list.push(item);
      byAccount.set(row.accountId, list);
    }
  }
  return { byContact, byAccount };
}

export function policiesForHousehold(
  index: ReturnType<typeof indexHouseholdPolicies>,
  input: { contactId?: string | null; accountId?: string | null; fallback?: GapPolicyInput[] },
): GapPolicyInput[] {
  if (input.contactId) {
    const rows = index.byContact.get(input.contactId);
    if (rows?.length) return rows;
  }
  if (input.accountId) {
    const rows = index.byAccount.get(input.accountId);
    if (rows?.length) return rows;
  }
  return input.fallback ?? [];
}
