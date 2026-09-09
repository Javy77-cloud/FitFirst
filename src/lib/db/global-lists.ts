import { and, asc, eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { globalLists, type GlobalListRow } from "@/lib/db/schema";
import { defaultGlobalLists, type GlobalListKey } from "@/lib/desk/global-lists";
import type { InsuranceFamily } from "@/lib/desk/policy-family";

export async function ensureDefaultGlobalLists(tenantId = DEFAULT_TENANT_ID) {
  const seeds = defaultGlobalLists();
  if (seeds.length === 0) return;

  const existing = await db
    .select({ listKey: globalLists.listKey, slug: globalLists.slug })
    .from(globalLists)
    .where(eq(globalLists.tenantId, tenantId));
  const taken = new Set(existing.map((row) => `${row.listKey}::${row.slug}`));
  const missing = seeds.filter((row) => !taken.has(`${row.listKey}::${row.slug}`));
  if (missing.length === 0) return;

  await db.insert(globalLists).values(
    missing.map((row) => ({
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
    .orderBy(asc(globalLists.listKey), asc(globalLists.label), asc(globalLists.sortOrder));
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
