import { and, eq } from "drizzle-orm";
import { currentDeskSession } from "@/lib/auth/session";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { deskColumnPrefs } from "@/lib/db/schema";

function cleanIds(columns: string[]): string[] {
  return columns.filter((id): id is string => typeof id === "string" && id.trim().length > 0);
}

export async function loadListColumnPrefs(tableKey: string): Promise<string[] | null> {
  const key = tableKey.trim();
  if (!key) return null;
  const session = await currentDeskSession();
  if (!session.userId) return null;
  const [existing] = await db
    .select()
    .from(deskColumnPrefs)
    .where(
      and(
        eq(deskColumnPrefs.tenantId, DEFAULT_TENANT_ID),
        eq(deskColumnPrefs.userId, session.userId),
        eq(deskColumnPrefs.tableKey, key),
      ),
    );
  if (!existing || !Array.isArray(existing.columns)) return null;
  const ids = cleanIds(existing.columns);
  return ids.length ? ids : null;
}

export async function upsertListColumnPrefs(tableKey: string, columns: string[]): Promise<void> {
  const key = tableKey.trim();
  const picked = cleanIds(columns);
  if (!key || picked.length === 0) return;
  const session = await currentDeskSession();
  if (!session.userId) return;
  const [existing] = await db
    .select()
    .from(deskColumnPrefs)
    .where(
      and(
        eq(deskColumnPrefs.tenantId, DEFAULT_TENANT_ID),
        eq(deskColumnPrefs.userId, session.userId),
        eq(deskColumnPrefs.tableKey, key),
      ),
    );
  if (existing) {
    await db
      .update(deskColumnPrefs)
      .set({ columns: picked, updatedAt: new Date() })
      .where(eq(deskColumnPrefs.id, existing.id));
    return;
  }
  await db.insert(deskColumnPrefs).values({
    tenantId: DEFAULT_TENANT_ID,
    userId: session.userId,
    tableKey: key,
    columns: picked,
  });
}
