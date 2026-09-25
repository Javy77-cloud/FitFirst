/**
 * Mark one policy declaration as term_role:current.
 * Other Current documents on that policy become Prior so one DEC is current.
 */
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import { tagsWithTermRole, termRoleFromTags } from "@/lib/documents/document-labels";
import { DEFAULT_TENANT_ID } from "@/lib/domain";

export type DecTagRow = { id: string; tags: string[] | null };

export function planCurrentDecRoleUpdates(
  docs: readonly DecTagRow[],
  documentId: string,
): { id: string; tags: string[] }[] {
  const targetId = documentId.trim();
  if (!targetId) return [];
  const updates: { id: string; tags: string[] }[] = [];
  for (const doc of docs) {
    const role = termRoleFromTags(doc.tags);
    if (doc.id === targetId) {
      if (role !== "current") updates.push({ id: doc.id, tags: tagsWithTermRole(doc.tags, "current") });
      continue;
    }
    if (role === "current") updates.push({ id: doc.id, tags: tagsWithTermRole(doc.tags, "prior") });
  }
  return updates;
}

type TagStore = {
  select: typeof db.select;
  update: typeof db.update;
};

export async function markPolicyDecAsCurrent(
  input: { policyId: string; documentId: string },
  store: TagStore = db,
): Promise<{ ok: true; changed: boolean } | { ok: false; error: string }> {
  const policyId = input.policyId.trim();
  const documentId = input.documentId.trim();
  if (!policyId || !documentId) return { ok: false, error: "Declaration required." };

  const onPolicy = await store
    .select({ id: documents.id, tags: documents.tags, policyId: documents.policyId })
    .from(documents)
    .where(and(eq(documents.tenantId, DEFAULT_TENANT_ID), eq(documents.policyId, policyId)));

  let pool: { id: string; tags: string[] | null; policyId: string | null }[] = onPolicy;
  if (!pool.some((doc) => doc.id === documentId)) {
    const [row] = await store
      .select({ id: documents.id, tags: documents.tags, policyId: documents.policyId })
      .from(documents)
      .where(and(eq(documents.tenantId, DEFAULT_TENANT_ID), eq(documents.id, documentId)));
    if (!row || (row.policyId && row.policyId !== policyId)) {
      return { ok: false, error: "Declaration not on this policy." };
    }
    pool = [...pool, row];
  }

  const updates = planCurrentDecRoleUpdates(pool, documentId);
  for (const update of updates) {
    await store.update(documents).set({ tags: update.tags }).where(eq(documents.id, update.id));
  }
  return { ok: true, changed: updates.length > 0 };
}
