import { and, eq, inArray, or } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { policies } from "@/lib/db/schema";
import { isAnaCoverageParty } from "@/lib/coverage/notices";
import {
  dismissedRuleIdsForHousehold,
  gapDismissParty,
  householdGapItems,
  type RenewalGapItem,
} from "@/lib/coverage/renewal-gaps";
import { loadDismissedGapRuleIdsForParties } from "@/lib/coverage/gap-dismissals";
import type { GapPolicyInput } from "@/lib/coverage/gaps";

export async function loadHouseholdGapPolicies(input: {
  contactId?: string | null;
  accountId?: string | null;
}): Promise<GapPolicyInput[]> {
  const contactId = input.contactId ?? null;
  const accountId = input.accountId ?? null;
  if (!contactId && !accountId) return [];

  const partyClause =
    contactId && accountId
      ? or(eq(policies.contactId, contactId), eq(policies.accountId, accountId))
      : contactId
        ? eq(policies.contactId, contactId)
        : eq(policies.accountId, accountId as string);

  const rows = await db
    .select({
      id: policies.id,
      status: policies.status,
      lineOfBusiness: policies.lineOfBusiness,
      policyNumber: policies.policyNumber,
    })
    .from(policies)
    .where(and(eq(policies.tenantId, DEFAULT_TENANT_ID), partyClause));

  return rows;
}

export async function loadRenewalGapItems(input: {
  contactId?: string | null;
  accountId?: string | null;
  partyName: string;
  isAna?: boolean;
  quoteCount?: number;
}): Promise<RenewalGapItem[]> {
  const party = gapDismissParty(input);
  const extra =
    input.contactId && input.accountId ? [{ partyKind: "account" as const, partyId: input.accountId }] : [];
  const [household, dismissedByParty] = await Promise.all([
    loadHouseholdGapPolicies(input),
    loadDismissedGapRuleIdsForParties(party ? [party, ...extra] : []),
  ]);
  return householdGapItems({
    policies: household,
    partyName: input.partyName,
    dismissedRuleIds: dismissedRuleIdsForHousehold(dismissedByParty, input),
    isAna: isAnaCoverageParty(input),
    quoteCount: input.quoteCount,
  });
}

export async function loadRenewalGapCounts(
  parties: Array<{
    contactId?: string | null;
    accountId?: string | null;
    partyName: string;
  }>,
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  const unique = new Map<string, (typeof parties)[number]>();
  for (const row of parties) {
    const key = row.contactId ? `contact:${row.contactId}` : row.accountId ? `account:${row.accountId}` : "";
    if (!key || unique.has(key)) continue;
    unique.set(key, row);
  }
  if (unique.size === 0) return counts;

  const contactIds = [...unique.values()].map((row) => row.contactId).filter((id): id is string => Boolean(id));
  const accountIds = [...unique.values()].map((row) => row.accountId).filter((id): id is string => Boolean(id));

  const partyClause = [];
  if (contactIds.length) partyClause.push(inArray(policies.contactId, contactIds));
  if (accountIds.length) partyClause.push(inArray(policies.accountId, accountIds));
  if (partyClause.length === 0) return counts;

  const rows = await db
    .select({
      id: policies.id,
      status: policies.status,
      lineOfBusiness: policies.lineOfBusiness,
      policyNumber: policies.policyNumber,
      contactId: policies.contactId,
      accountId: policies.accountId,
    })
    .from(policies)
    .where(
      and(
        eq(policies.tenantId, DEFAULT_TENANT_ID),
        partyClause.length === 1 ? partyClause[0] : or(...partyClause),
      ),
    );

  const dismissParties = [...unique.values()].flatMap((row) => {
    const out = [];
    if (row.contactId) out.push({ partyKind: "contact" as const, partyId: row.contactId });
    if (row.accountId) out.push({ partyKind: "account" as const, partyId: row.accountId });
    return out;
  });
  const dismissedByParty = await loadDismissedGapRuleIdsForParties(dismissParties);

  for (const [key, party] of unique) {
    const household = rows.filter((row) =>
      party.contactId
        ? row.contactId === party.contactId
        : party.accountId
          ? row.accountId === party.accountId
          : false,
    );
    counts.set(
      key,
      householdGapItems({
        policies: household,
        partyName: party.partyName,
        dismissedRuleIds: dismissedRuleIdsForHousehold(dismissedByParty, party),
        isAna: isAnaCoverageParty({ contactId: party.contactId }),
      }).length,
    );
  }
  return counts;
}

export function renewalGapCountKey(input: {
  contactId?: string | null;
  accountId?: string | null;
}): string | null {
  if (input.contactId) return `contact:${input.contactId}`;
  if (input.accountId) return `account:${input.accountId}`;
  return null;
}
