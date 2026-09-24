import { and, eq, inArray, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { coalesceAsync } from "@/lib/alerts/coalesce";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { alerts } from "@/lib/db/schema";
import { syncLiveDealColdChaseNotices } from "@/lib/deals/cold-chase-sync";
import { DEAL_COLD_CHASE_KIND } from "@/lib/deals/cold-chase";
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

/**
 * Panel sync must never insert deal_cold_chase — Deals page + AppShell both
 * schedule writers; racing inserts double Petersen/Palacios/Hamilton. The
 * canonical writer is syncDealColdChaseNotices (episode suppress + coalesce).
 */
export function panelOwnsInsert(kind: string): boolean {
  return kind !== DEAL_COLD_CHASE_KIND;
}

export async function syncPanelSignals(): Promise<PanelCard[]> {
  return coalesceAsync("panel-signals", () => syncPanelSignalsOnce());
}

async function syncPanelSignalsOnce(): Promise<PanelCard[]> {
  await migrateOrphanCommitments().catch(() => 0);
  const cards = await loadPanelCards();

  // Sole insert path for cold chase (episode suppress + coalesce). Panel never
  // inserts this kind — dual AppShell+/deals writers raced into ×2 bells.
  await syncLiveDealColdChaseNotices().catch(() => 0);

  const existing = await db
    .select()
    .from(alerts)
    .where(and(eq(alerts.tenantId, DEFAULT_TENANT_ID), inArray(alerts.kind, [...PANEL_SIGNAL_KINDS])));

  const liveKeys = new Set(cards.map((card) => card.key));
  const unreadByKey = new Map<string, (typeof existing)[number]>();
  const dismissedKeys = new Set<string>();
  const snoozedKeys = new Set<string>();
  const collapseDupIds: string[] = [];
  const now = new Date();

  // Cold-chase episode end is owned by syncDealColdChaseNotices. For other
  // panel kinds, drop unread rows whose live key cleared (user-targeted stay).
  for (const row of existing) {
    const key = parsePanelKey(row.body) ?? `${row.kind}:${row.entityId ?? row.id}`;
    if (row.kind === DEAL_COLD_CHASE_KIND) {
      // Attach / dismiss only — inserts + episode deletes happen above.
      if (row.readAt) {
        dismissedKeys.add(key);
        continue;
      }
      if (row.createdAt.getTime() > now.getTime()) {
        snoozedKeys.add(key);
        continue;
      }
      const prior = unreadByKey.get(key);
      if (prior) {
        collapseDupIds.push(row.id);
        continue;
      }
      unreadByKey.set(key, row);
      continue;
    }

    if (row.createdAt.getTime() > now.getTime()) {
      snoozedKeys.add(key);
      continue;
    }
    if (row.readAt) {
      dismissedKeys.add(key);
      continue;
    }
    const prior = unreadByKey.get(key);
    if (prior) {
      collapseDupIds.push(row.id);
      continue;
    }
    unreadByKey.set(key, row);
  }

  if (collapseDupIds.length) {
    await db.delete(alerts).where(inArray(alerts.id, collapseDupIds));
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
    if (!panelOwnsInsert(card.kind)) {
      // Cold chase: attach if a row already exists (writer ran above).
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

  // Re-attach cold-chase alert ids after the canonical writer.
  const coldExisting = await db
    .select({ id: alerts.id, body: alerts.body, entityId: alerts.entityId, readAt: alerts.readAt })
    .from(alerts)
    .where(
      and(
        eq(alerts.tenantId, DEFAULT_TENANT_ID),
        eq(alerts.kind, DEAL_COLD_CHASE_KIND),
        isNull(alerts.readAt),
      ),
    );
  const coldByKey = new Map<string, string>();
  for (const row of coldExisting) {
    const key = parsePanelKey(row.body) ?? `${DEAL_COLD_CHASE_KIND}:${row.entityId ?? row.id}`;
    if (!coldByKey.has(key)) coldByKey.set(key, row.id);
  }
  for (const card of cards) {
    if (card.kind !== DEAL_COLD_CHASE_KIND) continue;
    card.alertId = coldByKey.get(card.key) ?? card.alertId ?? null;
    if (card.alertId) continue;
    // Mark-as-read suppress: a read row for this key keeps the card dismissed.
    if (dismissedKeys.has(card.key)) continue;
  }

  for (const [key, row] of unreadByKey) {
    if (liveKeys.has(key)) continue;
    if (row.kind === DEAL_COLD_CHASE_KIND) continue; // episode delete owns this
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
      alertId: card.alertId ?? unread?.id ?? coldByKey.get(card.key) ?? null,
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
    if (key && !byKey.has(key)) byKey.set(key, row.id);
  }
  return cards.map((card) => ({ ...card, alertId: card.alertId ?? byKey.get(card.key) ?? null }));
}
