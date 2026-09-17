import { and, eq, inArray, or } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { coverageGapDismissals } from "@/lib/db/schema";
import {
  partyGapKey,
  type GapDismissParty,
  type GapDismissReason,
} from "@/lib/coverage/renewal-gaps";

export async function loadTenantDismissedGapRuleIds(): Promise<Map<string, Set<string>>> {
  const out = new Map<string, Set<string>>();
  const rows = await db
    .select({
      partyKind: coverageGapDismissals.partyKind,
      partyId: coverageGapDismissals.partyId,
      ruleId: coverageGapDismissals.ruleId,
    })
    .from(coverageGapDismissals)
    .where(eq(coverageGapDismissals.tenantId, DEFAULT_TENANT_ID))
    .catch(() => []);
  for (const row of rows) {
    const key = partyGapKey(row.partyKind, row.partyId);
    const set = out.get(key) ?? new Set<string>();
    set.add(row.ruleId);
    out.set(key, set);
  }
  return out;
}

export async function loadDismissedGapRuleIds(party: GapDismissParty | null): Promise<Set<string>> {
  if (!party) return new Set();
  const map = await loadDismissedGapRuleIdsForParties([party]);
  return map.get(partyGapKey(party.partyKind, party.partyId)) ?? new Set();
}

export async function loadDismissedGapRuleIdsForParties(
  parties: GapDismissParty[],
): Promise<Map<string, Set<string>>> {
  const out = new Map<string, Set<string>>();
  const contactIds = [...new Set(parties.filter((row) => row.partyKind === "contact").map((row) => row.partyId))];
  const accountIds = [...new Set(parties.filter((row) => row.partyKind === "account").map((row) => row.partyId))];
  if (contactIds.length === 0 && accountIds.length === 0) return out;

  const clauses = [];
  if (contactIds.length) {
    clauses.push(
      and(eq(coverageGapDismissals.partyKind, "contact"), inArray(coverageGapDismissals.partyId, contactIds)),
    );
  }
  if (accountIds.length) {
    clauses.push(
      and(eq(coverageGapDismissals.partyKind, "account"), inArray(coverageGapDismissals.partyId, accountIds)),
    );
  }

  const rows = await db
    .select({
      partyKind: coverageGapDismissals.partyKind,
      partyId: coverageGapDismissals.partyId,
      ruleId: coverageGapDismissals.ruleId,
    })
    .from(coverageGapDismissals)
    .where(
      and(
        eq(coverageGapDismissals.tenantId, DEFAULT_TENANT_ID),
        clauses.length === 1 ? clauses[0] : or(...clauses),
      ),
    )
    .catch(() => []);

  for (const row of rows) {
    const key = partyGapKey(row.partyKind, row.partyId);
    const set = out.get(key) ?? new Set<string>();
    set.add(row.ruleId);
    out.set(key, set);
  }
  return out;
}

export async function upsertCoverageGapDismissal(input: {
  party: GapDismissParty;
  ruleId: string;
  reason: GapDismissReason;
  dismissedBy?: string | null;
}): Promise<void> {
  await db
    .insert(coverageGapDismissals)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      partyKind: input.party.partyKind,
      partyId: input.party.partyId,
      ruleId: input.ruleId,
      reason: input.reason,
      dismissedBy: input.dismissedBy ?? null,
    })
    .onConflictDoUpdate({
      target: [
        coverageGapDismissals.tenantId,
        coverageGapDismissals.partyKind,
        coverageGapDismissals.partyId,
        coverageGapDismissals.ruleId,
      ],
      set: {
        reason: input.reason,
        dismissedBy: input.dismissedBy ?? null,
        updatedAt: new Date(),
      },
    });
}
