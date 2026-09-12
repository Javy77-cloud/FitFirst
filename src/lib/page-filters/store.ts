/** SERVER ONLY — postgres. Client UI must import @/lib/page-filters (no store). */
import { and, eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { agencyPageFilterPrefs } from "@/lib/db/schema";
import { defaultPageFilters } from "./defaults";
import { normalizePageFilterModule, resolvePageFilters } from "./prefs";
import type { PageFilter } from "./types";

export async function loadPageFilterPrefs(moduleId: string): Promise<PageFilter[]> {
  const module = normalizePageFilterModule(moduleId);
  if (!module) return [];
  try {
    const [row] = await db
      .select({ filters: agencyPageFilterPrefs.filters })
      .from(agencyPageFilterPrefs)
      .where(
        and(eq(agencyPageFilterPrefs.tenantId, DEFAULT_TENANT_ID), eq(agencyPageFilterPrefs.module, module)),
      )
      .limit(1);
    return resolvePageFilters(module, row ? row.filters : null);
  } catch {
    return defaultPageFilters(module);
  }
}

export async function savePageFilterPrefs(
  moduleId: string,
  filters: PageFilter[],
): Promise<PageFilter[]> {
  const module = normalizePageFilterModule(moduleId);
  if (!module) throw new Error("Unknown page-filter module.");
  const next = resolvePageFilters(module, filters);
  const [existing] = await db
    .select({ id: agencyPageFilterPrefs.id })
    .from(agencyPageFilterPrefs)
    .where(and(eq(agencyPageFilterPrefs.tenantId, DEFAULT_TENANT_ID), eq(agencyPageFilterPrefs.module, module)))
    .limit(1);
  if (existing) {
    await db
      .update(agencyPageFilterPrefs)
      .set({ filters: next, updatedAt: new Date() })
      .where(eq(agencyPageFilterPrefs.id, existing.id));
  } else {
    await db.insert(agencyPageFilterPrefs).values({
      tenantId: DEFAULT_TENANT_ID,
      module,
      filters: next,
    });
  }
  return next;
}
