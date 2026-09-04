import { eq } from "drizzle-orm";
import { requireSignedIn } from "@/lib/auth/guards";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { deals, policies, users } from "@/lib/db/schema";
import { accessStatusFromFlags } from "@/lib/people/status";
import { rankScorecards, visibleScorecards } from "./metrics";
import { parseScorecardSort, type ProducerScorecard, type ScorecardSort } from "./types";

const tenant = () => DEFAULT_TENANT_ID;

export async function loadProducerScorecards(sortRaw?: string | null): Promise<{
  session: Awaited<ReturnType<typeof requireSignedIn>>;
  sort: ScorecardSort;
  ranked: ProducerScorecard[];
  visible: ProducerScorecard[];
}> {
  const session = await requireSignedIn();
  const sort = parseScorecardSort(sortRaw);
  const [people, dealRows, policyRows] = await Promise.all([
    db.select().from(users).where(eq(users.tenantId, tenant())),
    db
      .select({
        id: deals.id,
        ownerId: deals.ownerId,
        pipelineStage: deals.pipelineStage,
        boundAt: deals.boundAt,
        archivedAt: deals.archivedAt,
      })
      .from(deals)
      .where(eq(deals.tenantId, tenant())),
    db
      .select({
        id: policies.id,
        ownerId: policies.ownerId,
        status: policies.status,
        premium: policies.premium,
        dealId: policies.dealId,
      })
      .from(policies)
      .where(eq(policies.tenantId, tenant())),
  ]);

  const ranked = rankScorecards(
    people.map((person) => ({
      id: person.id,
      name: person.name,
      role: person.role,
      status: accessStatusFromFlags(person),
    })),
    dealRows,
    policyRows.map((row) => ({
      id: row.id,
      ownerId: row.ownerId,
      status: row.status,
      premium: row.premium == null ? 0 : Number(row.premium),
      dealId: row.dealId,
    })),
    sort,
  );

  return {
    session,
    sort,
    ranked,
    visible: visibleScorecards(ranked, { isAdmin: session.isAdmin, userId: session.userId }),
  };
}

export async function loadOneScorecard(userId: string, sortRaw?: string | null) {
  const { session, ranked, sort } = await loadProducerScorecards(sortRaw);
  const card = ranked.find((row) => row.userId === userId) ?? null;
  if (!card) return { session, sort, ranked, card: null, allowed: false };
  const allowed = session.isAdmin || session.userId === card.userId;
  return { session, sort, ranked, card: allowed ? card : null, allowed };
}
