import { after } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { alerts } from "@/lib/db/schema";
import {
  DEAL_COLD_CHASE_KIND,
  planColdChaseNotices,
  planColdChaseSync,
  type ColdChaseCard,
} from "@/lib/deals/cold-chase";

export async function syncDealColdChaseNotices(cards: readonly ColdChaseCard[]): Promise<number> {
  const planned = planColdChaseNotices(cards);
  const existing = await db
    .select({
      id: alerts.id,
      entityId: alerts.entityId,
      readAt: alerts.readAt,
    })
    .from(alerts)
    .where(
      and(
        eq(alerts.tenantId, DEFAULT_TENANT_ID),
        eq(alerts.kind, DEAL_COLD_CHASE_KIND),
        eq(alerts.entityType, "deal"),
      ),
    );

  const { insertDealIds, endEpisodeAlertIds } = planColdChaseSync(planned, existing);
  const insertSet = new Set(insertDealIds);
  let written = 0;
  for (const notice of planned) {
    if (!insertSet.has(notice.dealId)) continue;
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

  if (endEpisodeAlertIds.length) {
    await db.delete(alerts).where(inArray(alerts.id, endEpisodeAlertIds));
  }

  if (written || endEpisodeAlertIds.length) {
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
    onHold: Boolean(card.onHold),
  }));
  after(() => {
    void syncDealColdChaseNotices(snapshot).catch(() => {
      // Never fail the Deals desk because a chase ping missed.
    });
  });
}
