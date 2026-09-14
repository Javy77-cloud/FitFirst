import { and, eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import {
  defaultStoredNavLayout,
  navActorKey,
  normalizeNavLayout,
  type NavLayoutOptions,
  type StoredNavLayout,
} from "@/lib/desk/nav-layout";
import { db } from "./index";
import { agentUiPrefs } from "./schema";

export async function getStoredNavLayout(
  userId: string | null | undefined,
  options: NavLayoutOptions = {},
): Promise<StoredNavLayout> {
  if (!userId) return defaultStoredNavLayout(options);
  const [row] = await db
    .select({ navLayout: agentUiPrefs.navLayout })
    .from(agentUiPrefs)
    .where(and(eq(agentUiPrefs.tenantId, DEFAULT_TENANT_ID), eq(agentUiPrefs.actorKey, navActorKey(userId))));
  return normalizeNavLayout(row?.navLayout ?? null, options);
}

export async function upsertStoredNavLayout(
  userId: string,
  layout: StoredNavLayout | null,
  options: NavLayoutOptions = {},
): Promise<StoredNavLayout> {
  const actorKey = navActorKey(userId);
  const next = layout ? normalizeNavLayout(layout, options) : null;
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
  return next ?? defaultStoredNavLayout(options);
}
