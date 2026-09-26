import { and, eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { navActorKey } from "@/lib/desk/nav-layout";
import { db } from "@/lib/db";
import { agentUiPrefs } from "@/lib/db/schema";
import {
  dealResumePlaceUnchanged,
  emptyDealResumeMemory,
  parseDealResumeMemory,
  rememberDealPlace,
  type AgentDealTab,
  type DealResumeMemory,
} from "@/lib/deals/deal-resume";

function actorKey(userId: string): string {
  return navActorKey(userId);
}

/** This agent’s deal places. Empty when unsigned or the column is not migrated yet. */
export async function loadDealResume(userId: string | null | undefined): Promise<DealResumeMemory> {
  const id = String(userId ?? "").trim();
  if (!id) return emptyDealResumeMemory();
  try {
    const [row] = await db
      .select({ dealResume: agentUiPrefs.dealResume })
      .from(agentUiPrefs)
      .where(and(eq(agentUiPrefs.tenantId, DEFAULT_TENANT_ID), eq(agentUiPrefs.actorKey, actorKey(id))));
    return parseDealResumeMemory(row?.dealResume);
  } catch {
    return emptyDealResumeMemory();
  }
}

/** Remember the screen and product this agent just opened on a deal. */
export async function saveDealResumePlace(
  userId: string | null | undefined,
  input: { dealId: string; productKey: string; tab: AgentDealTab; at?: number },
): Promise<void> {
  const id = String(userId ?? "").trim();
  if (!id || !input.dealId || !input.productKey) return;
  try {
    const current = await loadDealResume(id);
    if (
      dealResumePlaceUnchanged(current, {
        dealId: input.dealId,
        productKey: input.productKey,
        tab: input.tab,
      })
    ) {
      return;
    }
    const next = rememberDealPlace(current, input);
    const key = actorKey(id);
    const [existing] = await db
      .select({ id: agentUiPrefs.id })
      .from(agentUiPrefs)
      .where(and(eq(agentUiPrefs.tenantId, DEFAULT_TENANT_ID), eq(agentUiPrefs.actorKey, key)));
    if (existing) {
      await db
        .update(agentUiPrefs)
        .set({ dealResume: next, updatedAt: new Date() })
        .where(eq(agentUiPrefs.id, existing.id));
      return;
    }
    await db.insert(agentUiPrefs).values({
      tenantId: DEFAULT_TENANT_ID,
      actorKey: key,
      dealResume: next,
    });
  } catch {
    // Resume is optional. A missing column must not take down the deal.
  }
}
