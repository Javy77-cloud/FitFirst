import { and, eq, isNull, or, sql, type SQL } from "drizzle-orm";
import type { DeskSession } from "@/lib/auth/session";
import { alerts } from "@/lib/db/schema";

/** Admin sees the tenant. Agents see a row only when both user_id and recipient_user_id are null or them. */
export function alertVisibleWhere(session: DeskSession, tenantId: string): SQL {
  const tenant = eq(alerts.tenantId, tenantId);
  if (session.isAdmin) return tenant;
  if (!session.userId) return sql`false`;
  return and(
    tenant,
    or(isNull(alerts.userId), eq(alerts.userId, session.userId)),
    or(isNull(alerts.recipientUserId), eq(alerts.recipientUserId, session.userId)),
  )!;
}
