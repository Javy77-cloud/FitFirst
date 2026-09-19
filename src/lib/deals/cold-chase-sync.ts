import { after } from "next/server";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { alerts } from "@/lib/db/schema";
import {
  DEAL_COLD_CHASE_KIND,
  planColdChaseNotices,
  type ColdChaseCard,
} from "@/lib/deals/cold-chase";

export async function syncDealColdChaseNotices(cards: readonly ColdChaseCard[]): Promise<number> {
  const planned = planColdChaseNotices(cards);
  const existing = await db
    .select({
      id: alerts.id,
      entityId: alerts.entityId,
    })
    .from(alerts)
    .where(
      and(
        eq(alerts.tenantId, DEFAULT_TENANT_ID),
        eq(alerts.kind, DEAL_COLD_CHASE_KIND),
        eq(alerts.entityType, "deal"),
        isNull(alerts.readAt),
      ),
    );

  const unreadByDeal = new Map<string, string>();
  for (const row of existing) {
    if (row.entityId) unreadByDeal.set(row.entityId, row.id);
  }

  const plannedIds = new Set(planned.map((notice) => notice.dealId));
  let written = 0;
  for (const notice of planned) {
    if (unreadByDeal.has(notice.dealId)) continue;
    await db.insert(alerts).values({
      tenantId: DEFAULT_TENANT_ID,
      kind: DEAL_COLD_CHASE_KIND,
      title: notice.title,
      body: `<!--ff-panel:deal_cold_chase:${notice.dealId}-->\n\n${notice.body}`,
      severity: "warning",
      entityType: "deal",
      entityId: notice.dealId,
      userId: notice.ownerId,
      recipientUserId: notice.ownerId,
    });
    written += 1;
  }

  const staleIds = [...unreadByDeal.entries()]
    .filter(([dealId]) => !plannedIds.has(dealId))
    .map(([, id]) => id);
  if (staleIds.length) {
    await db.update(alerts).set({ readAt: new Date() }).where(inArray(alerts.id, staleIds));
  }

  if (written || staleIds.length) {
    revalidatePath("/");
    revalidatePath("/notifications");
    revalidatePath("/alerts");
    revalidatePath("/deals");
  }
  return written;
}

export function scheduleDealColdChaseNotices(cards: readonly ColdChaseCard[]) {
  const snapshot = cards.map((card) => ({
    id: card.id,
    heat: card.heat,
    closed: card.closed,
    insured: card.insured,
    title: card.title,
    ownerId: card.ownerId,
  }));
  after(() => {
    void syncDealColdChaseNotices(snapshot).catch(() => {
      // Never fail the Deals desk because a chase ping missed.
    });
  });
}
