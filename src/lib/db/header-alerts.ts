import { cache } from "react";
import { and, desc, isNotNull, isNull, lte, sql } from "drizzle-orm";
import { currentDeskSession } from "@/lib/auth/session";
import { alertVisibleWhere } from "@/lib/alerts/visibility";
import { toHeaderAlert, type HeaderAlert } from "@/lib/desk/header-alerts";
import { RECENT_NOTIFICATION_LIMIT, recentNotifications } from "@/lib/desk/notifications";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { alerts } from "@/lib/db/schema";

export const loadHeaderNotificationState = cache(async function loadHeaderNotificationState(): Promise<{
  unread: number;
  alerts: HeaderAlert[];
}> {
  const session = await currentDeskSession();
  const visible = alertVisibleWhere(session, DEFAULT_TENANT_ID);
  const due = lte(alerts.createdAt, new Date());
  const [countRow, unreadRows, readRows] = await Promise.all([
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(alerts)
      .where(and(visible, due, isNull(alerts.readAt))),
    db
      .select()
      .from(alerts)
      .where(and(visible, due, isNull(alerts.readAt)))
      .orderBy(desc(alerts.createdAt))
      .limit(RECENT_NOTIFICATION_LIMIT),
    db
      .select()
      .from(alerts)
      .where(and(visible, due, isNotNull(alerts.readAt)))
      .orderBy(desc(alerts.createdAt))
      .limit(RECENT_NOTIFICATION_LIMIT),
  ]);

  const unread = countRow[0]?.n ?? 0;
  const recent = recentNotifications(
    [...unreadRows, ...readRows].map((row) => ({ row, read: Boolean(row.readAt) })),
  );
  return {
    unread,
    alerts: recent.map((item) => toHeaderAlert(item.row)),
  };
});
