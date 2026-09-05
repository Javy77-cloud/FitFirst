import { and, eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import {
  defaultStoredNavLayout,
  navActorKey,
  normalizeNavLayout,
  type StoredNavLayout,
} from "@/lib/desk/nav-layout";
import { db } from "./index";
import { agentUiPrefs } from "./schema";

export async function getStoredNavLayout(userId: string | null | undefined): Promise<StoredNavLayout> {
  if (!userId) return defaultStoredNavLayout();
  const [row] = await db
    .select({ navLayout: agentUiPrefs.navLayout })
    .from(agentUiPrefs)
    .where(and(eq(agentUiPrefs.tenantId, DEFAULT_TENANT_ID), eq(agentUiPrefs.actorKey, navActorKey(userId))));
  return normalizeNavLayout(row?.navLayout ?? null);
}

export async function upsertStoredNavLayout(
  userId: string,
  layout: StoredNavLayout | null,
): Promise<StoredNavLayout> {
  const actorKey = navActorKey(userId);
  const next = layout ? normalizeNavLayout(layout) : null;
  const [existing] = await db
    .select({ id: agentUiPrefs.id })
    .from(agentUiPrefs)
    .where(and(eq(agentUiPrefs.tenantId, DEFAULT_TENANT_ID), eq(agentUiPrefs.actorKey, actorKey)));
  if (existing) {
    await db
      .update(agentUiPrefs)
      .set({ navLayout: next, updatedAt: new Date() })
      .where(eq(agentUiPrefs.id, existing.id));
  } else {
    await db.insert(agentUiPrefs).values({
      tenantId: DEFAULT_TENANT_ID,
      actorKey,
      navLayout: next,
    });
  }
  return next ?? defaultStoredNavLayout();
}
