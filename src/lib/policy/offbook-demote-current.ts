/**
 * When a policy goes off-book (lapsed / cancelled / non_renewed / expired),
 * demote any document tagged term_role:current → prior, and any policy_terms
 * role current → prior. Keeps files; never invents Current.
 *
 * Safe to call whenever the *next* status is off-book (including lapsed→cancelled
 * if a Current tag somehow remains). No-op when next status is still in force.
 */
import { and, eq, inArray } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { documents, policyTerms } from "@/lib/db/schema";
import {
  tagsWithTermRole,
  termRoleFromTags,
} from "@/lib/documents/document-labels";
import { isOffBookStatus } from "@/lib/policy/status";

export function shouldDemoteCurrentForStatus(nextStatus: string | null | undefined): boolean {
  return isOffBookStatus(nextStatus);
}

export type OffBookDocRow = {
  id: string;
  tags?: string[] | null;
};

export type OffBookDocDemotion = {
  id: string;
  /** Tags after demotion (includes term_role:prior). */
  tags: string[];
};

/** Pure: Current docs → Prior. Prior / Not set / other roles unchanged. */
export function planOffBookDocumentDemotions(
  docs: readonly OffBookDocRow[],
): OffBookDocDemotion[] {
  const changes: OffBookDocDemotion[] = [];
  for (const doc of docs) {
    if (termRoleFromTags(doc.tags) !== "current") continue;
    changes.push({
      id: doc.id,
      tags: tagsWithTermRole(doc.tags, "prior"),
    });
  }
  return changes;
}

export type OffBookTermRow = {
  id: string;
  role: string;
};

/** Pure: policy_terms current → prior ids. */
export function planOffBookTermDemotions(terms: readonly OffBookTermRow[]): string[] {
  return terms.filter((row) => row.role === "current").map((row) => row.id);
}

export type OffBookDemoteResult = {
  documentsDemoted: number;
  termsDemoted: number;
};

/**
 * Apply demotions for one policy. Idempotent: already-Prior / Not set → 0.
 * Does not delete documents.
 */
export async function demoteCurrentOnOffBookStatus(
  policyId: string,
): Promise<OffBookDemoteResult> {
  const id = policyId?.trim();
  if (!id) return { documentsDemoted: 0, termsDemoted: 0 };

  const docs = await db
    .select({ id: documents.id, tags: documents.tags })
    .from(documents)
    .where(and(eq(documents.tenantId, DEFAULT_TENANT_ID), eq(documents.policyId, id)));

  const docPlan = planOffBookDocumentDemotions(docs);
  for (const change of docPlan) {
    await db.update(documents).set({ tags: change.tags }).where(eq(documents.id, change.id));
  }

  const terms = await db
    .select({ id: policyTerms.id, role: policyTerms.role })
    .from(policyTerms)
    .where(and(eq(policyTerms.tenantId, DEFAULT_TENANT_ID), eq(policyTerms.policyId, id)));

  const termIds = planOffBookTermDemotions(terms);
  for (const termId of termIds) {
    await db
      .update(policyTerms)
      .set({
        role: "prior",
        notes: "Prior term (off-book status — demoted from current).",
      })
      .where(eq(policyTerms.id, termId));
  }

  return { documentsDemoted: docPlan.length, termsDemoted: termIds.length };
}

/** Mass-update / bulk: demote each policy id (caller already set off-book status). */
export async function demoteCurrentOnOffBookStatusMany(
  policyIds: readonly string[],
): Promise<OffBookDemoteResult> {
  const ids = [...new Set(policyIds.map((id) => id.trim()).filter(Boolean))];
  if (ids.length === 0) return { documentsDemoted: 0, termsDemoted: 0 };

  const docs = await db
    .select({ id: documents.id, tags: documents.tags, policyId: documents.policyId })
    .from(documents)
    .where(and(eq(documents.tenantId, DEFAULT_TENANT_ID), inArray(documents.policyId, ids)));

  const docPlan = planOffBookDocumentDemotions(docs);
  for (const change of docPlan) {
    await db.update(documents).set({ tags: change.tags }).where(eq(documents.id, change.id));
  }

  const terms = await db
    .select({ id: policyTerms.id, role: policyTerms.role })
    .from(policyTerms)
    .where(and(eq(policyTerms.tenantId, DEFAULT_TENANT_ID), inArray(policyTerms.policyId, ids)));

  const termIds = planOffBookTermDemotions(terms);
  for (const termId of termIds) {
    await db
      .update(policyTerms)
      .set({
        role: "prior",
        notes: "Prior term (off-book status — demoted from current).",
      })
      .where(eq(policyTerms.id, termId));
  }

  return { documentsDemoted: docPlan.length, termsDemoted: termIds.length };
}
