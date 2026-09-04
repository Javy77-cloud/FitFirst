import { and, asc, eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { globalLists, type GlobalListRow } from "@/lib/db/schema";
import { defaultGlobalLists, type GlobalListKey } from "@/lib/desk/global-lists";
import type { InsuranceFamily } from "@/lib/desk/policy-family";

export async function ensureDefaultGlobalLists(tenantId = DEFAULT_TENANT_ID) {
  const existing = await db
    .select({ id: globalLists.id })
    .from(globalLists)
    .where(eq(globalLists.tenantId, tenantId))
    .limit(1);
  if (existing.length > 0) return;

  const seeds = defaultGlobalLists();
  if (seeds.length === 0) return;
  await db.insert(globalLists).values(
    seeds.map((row) => ({
      tenantId,
      listKey: row.listKey,
      family: row.family,
      parentSlug: row.parentSlug,
      slug: row.slug,
      label: row.label,
      sortOrder: row.sortOrder,
      color: row.color,
      active: true,
    })),
  );
}

export async function loadGlobalLists(listKey?: GlobalListKey): Promise<GlobalListRow[]> {
  await ensureDefaultGlobalLists();
  const where = listKey
    ? and(eq(globalLists.tenantId, DEFAULT_TENANT_ID), eq(globalLists.listKey, listKey))
    : eq(globalLists.tenantId, DEFAULT_TENANT_ID);
  return db
    .select()
    .from(globalLists)
    .where(where)
    .orderBy(asc(globalLists.listKey), asc(globalLists.sortOrder), asc(globalLists.label));
}

export function labelsFor(
  rows: GlobalListRow[],
  listKey: GlobalListKey,
  family?: InsuranceFamily | null,
): string[] {
  return rows
    .filter((row) => row.listKey === listKey && row.active)
    .filter((row) => !family || !row.family || row.family === family)
    .map((row) => row.label);
}
