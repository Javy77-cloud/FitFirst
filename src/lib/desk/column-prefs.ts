import { and, eq } from "drizzle-orm";
import { currentDeskSession } from "@/lib/auth/session";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { deskColumnPrefs } from "@/lib/db/schema";
import { mergeColumnWidths, parseListSort, type ListSort } from "@/lib/list-columns";

function cleanIds(columns: string[]): string[] {
  return columns.filter((id): id is string => typeof id === "string" && id.trim().length > 0);
}

export type StoredListColumnPrefs = {
  columns: string[] | null;
  widths: Record<string, number>;
  sort: ListSort | null;
};

export async function loadListColumnPrefs(tableKey: string): Promise<string[] | null> {
  const stored = await loadListColumnLayout(tableKey);
  return stored?.columns ?? null;
}

export async function loadListColumnLayout(tableKey: string): Promise<StoredListColumnPrefs | null> {
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
  if (!existing) return null;
  const ids = Array.isArray(existing.columns) ? cleanIds(existing.columns) : [];
  return {
    columns: ids.length ? ids : null,
    widths: mergeColumnWidths(
      Object.keys(existing.widths ?? {}).map((id) => ({ id, label: id })),
      existing.widths ?? {},
    ),
    sort: parseListSort(existing.sort),
  };
}

export async function upsertListColumnPrefs(
  tableKey: string,
  columns: string[],
  extras?: { widths?: Record<string, number>; sort?: ListSort | null },
): Promise<void> {
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
  const widths = extras?.widths ?? existing?.widths ?? {};
  const sort = extras && "sort" in extras ? extras.sort ?? null : existing?.sort ?? null;
  if (existing) {
    await db
      .update(deskColumnPrefs)
      .set({ columns: picked, widths, sort, updatedAt: new Date() })
      .where(eq(deskColumnPrefs.id, existing.id));
    return;
  }
  await db.insert(deskColumnPrefs).values({
    tenantId: DEFAULT_TENANT_ID,
    userId: session.userId,
    tableKey: key,
    columns: picked,
    widths,
    sort,
  });
}
