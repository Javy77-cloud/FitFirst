import { and, eq, inArray, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { alerts } from "@/lib/db/schema";
import { loadPanelCards } from "@/lib/notifications/load-panel";
import { PANEL_SIGNAL_KINDS, type PanelCard } from "@/lib/notifications/panel";
import { migrateOrphanCommitments } from "@/lib/notifications/load-commitments";
import { applyTermStartEffects } from "@/lib/notifications/term-start-effects";
import { TERM_START_KIND } from "@/lib/notifications/term-start";

export function panelAlertBody(why: string, key: string): string {
  return `<!--ff-panel:${key}-->\n\n${why}`;
}

export function parsePanelKey(body: string): string | null {
  return body.match(/<!--ff-panel:([^>]+)-->/)?.[1] ?? null;
}

function severityFor(card: PanelCard): string {
  if (card.urgency === "high") return "critical";
  if (card.urgency === "medium") return "warning";
  return "info";
}

/** Lane counts + board must hide dismissed / future-snoozed cards. */
export function visiblePanelCards(
  cards: readonly PanelCard[],
  dismissedKeys: ReadonlySet<string>,
  snoozedKeys: ReadonlySet<string>,
): PanelCard[] {
  return cards.filter((card) => !dismissedKeys.has(card.key) && !snoozedKeys.has(card.key));
}

export async function syncPanelSignals(): Promise<PanelCard[]> {
  await migrateOrphanCommitments().catch(() => 0);
  const cards = await loadPanelCards();
  const existing = await db
    .select()
    .from(alerts)
    .where(and(eq(alerts.tenantId, DEFAULT_TENANT_ID), inArray(alerts.kind, [...PANEL_SIGNAL_KINDS])));

  const liveKeys = new Set(cards.map((card) => card.key));
  const unreadByKey = new Map<string, (typeof existing)[number]>();
  const dismissedKeys = new Set<string>();
  const snoozedKeys = new Set<string>();
  const now = new Date();

  for (const row of existing) {
    const key = parsePanelKey(row.body) ?? `${row.kind}:${row.entityId ?? row.id}`;
    if (row.createdAt.getTime() > now.getTime()) {
      snoozedKeys.add(key);
      continue;
    }
    if (row.readAt) {
      dismissedKeys.add(key);
      continue;
    }
    unreadByKey.set(key, row);
  }

  for (const card of cards) {
    if (dismissedKeys.has(card.key) || snoozedKeys.has(card.key)) continue;
    if (card.alertId) {
      const unread = unreadByKey.get(card.key);
      if (unread) card.alertId = unread.id;
      continue;
    }
    const unread = unreadByKey.get(card.key);
    const body = card.metaBody?.includes("<!--ff-href:")
      ? `<!--ff-panel:${card.key}-->\n${card.metaBody}\n\n${card.why}`
      : card.metaBody
        ? `${panelAlertBody(card.why, card.key)}\n${card.metaBody}`
        : panelAlertBody(card.why, card.key);
    if (unread) {
      card.alertId = unread.id;
      if (unread.title !== card.entityLine || unread.body !== body) {
        await db
          .update(alerts)
          .set({
            title: card.entityLine,
            body,
            severity: severityFor(card),
          })
          .where(eq(alerts.id, unread.id));
      }
      continue;
    }
    const [inserted] = await db
      .insert(alerts)
      .values({
        tenantId: DEFAULT_TENANT_ID,
        kind: card.kind,
        title: card.entityLine,
        body,
        severity: severityFor(card),
        entityType: card.entityType,
        entityId: card.entityId || null,
      })
      .returning({ id: alerts.id });
    card.alertId = inserted?.id ?? null;
    if (card.kind === TERM_START_KIND && card.policyId && card.deadline) {
      await applyTermStartEffects({
        policyId: card.policyId,
        termEffective: card.deadline,
      }).catch(() => undefined);
    }
  }

  for (const [key, row] of unreadByKey) {
    if (liveKeys.has(key)) continue;
    // User-targeted pings (assign / forward) stay until the assignee dismisses.
    if (row.userId || row.recipientUserId) continue;
    await db.update(alerts).set({ readAt: now }).where(eq(alerts.id, row.id));
  }

  try {
    revalidatePath("/");
    revalidatePath("/notifications");
    revalidatePath("/alerts");
  } catch {
    // Render-time sync has no revalidate store; still return live cards.
  }

  const visible = visiblePanelCards(cards, dismissedKeys, snoozedKeys);
  return visible.map((card) => {
    const unread = unreadByKey.get(card.key);
    return {
      ...card,
      alertId: card.alertId ?? unread?.id ?? null,
    };
  });
}

export function schedulePanelSignalSync() {
  void syncPanelSignals().catch(() => undefined);
}

export async function attachAlertIds(cards: PanelCard[]): Promise<PanelCard[]> {
  const existing = await db
    .select()
    .from(alerts)
    .where(
      and(
        eq(alerts.tenantId, DEFAULT_TENANT_ID),
        inArray(alerts.kind, [...PANEL_SIGNAL_KINDS]),
        isNull(alerts.readAt),
      ),
    );
  const byKey = new Map<string, string>();
  for (const row of existing) {
    const key = parsePanelKey(row.body);
    if (key) byKey.set(key, row.id);
  }
  return cards.map((card) => ({ ...card, alertId: card.alertId ?? byKey.get(card.key) ?? null }));
}
