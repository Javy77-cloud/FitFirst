import { and, desc, eq, isNull } from "drizzle-orm";
import { currentDeskSession } from "@/lib/auth/session";
import { alertVisibleWhere } from "@/lib/alerts/visibility";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { alerts } from "@/lib/db/schema";
import {
  INBOX_ASSIGNED_KIND,
  inboxMailDeepLink,
  parsePanelHref,
} from "@/lib/desk/inbox-assign";
import { parsePanelKey } from "@/lib/notifications/sync-panel";
import type { PanelCard } from "@/lib/notifications/panel";
import { displayNoticeBody } from "@/lib/coverage/notices";

/** Unread assign/forward pings for the signed-in agent (Inbox lane). */
export async function loadInboxAssignedSignals(): Promise<PanelCard[]> {
  const session = await currentDeskSession();
  if (!session.signedIn) return [];
  const visible = alertVisibleWhere(session, DEFAULT_TENANT_ID);
  const rows = await db
    .select()
    .from(alerts)
    .where(and(visible, eq(alerts.kind, INBOX_ASSIGNED_KIND), isNull(alerts.readAt)))
    .orderBy(desc(alerts.createdAt))
    .limit(40);

  const cards: PanelCard[] = [];
  for (const row of rows) {
    const key = parsePanelKey(row.body) ?? `${INBOX_ASSIGNED_KIND}:${row.id}`;
    const href =
      parsePanelHref(row.body) ??
      inboxMailDeepLink({
        body: row.body,
        entityType: row.entityType,
        entityId: row.entityId,
      });
    cards.push({
      key,
      kind: INBOX_ASSIGNED_KIND,
      urgency: "high",
      entityLine: row.title,
      why: displayNoticeBody(row.body),
      primary: {
        id: "open_thread",
        label: "Open thread",
        href,
        action: "open_entity",
      },
      href,
      entityType: row.entityType || "contact",
      entityId: row.entityId || "",
      deadline: row.createdAt,
      source: "live",
      alertId: row.id,
      contactId: row.entityType === "contact" ? row.entityId : null,
      dealId: row.entityType === "deal" ? row.entityId : null,
      policyId: row.entityType === "policy" ? row.entityId : null,
    });
  }
  return cards;
}
