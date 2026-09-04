import { and, eq, isNull, or, sql, type SQL } from "drizzle-orm";
import type { DeskSession } from "@/lib/auth/session";
import { alerts } from "@/lib/db/schema";

/** Tenant-wide alerts (null user) plus per-invitee company-meeting pings. */
export function alertVisibleWhere(session: DeskSession, tenantId: string): SQL {
  const tenant = eq(alerts.tenantId, tenantId);
  if (session.isAdmin) return tenant;
  if (!session.userId) return sql`false`;
  return and(tenant, or(isNull(alerts.userId), eq(alerts.userId, session.userId)))!;
}
