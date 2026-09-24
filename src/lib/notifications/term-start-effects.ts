/**
 * Day-of term-start side effects (same sweep as Inbox renewal_term_started):
 * - Flip document term roles (renewal→current, current→prior, older priors→archive)
 * - Quietly drop Handled renewals queue rows so the policy leaves the Handled filter
 */
import { and, eq } from "drizzle-orm";
import { notHiddenDocument } from "@/lib/documents/visible-docs";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { documents, renewalQueue } from "@/lib/db/schema";
import {
  planTermStartRoleFlip,
  tagsWithTermRole,
  termRoleFromTags,
} from "@/lib/documents/document-labels";
import { RENEWAL_HANDLED_STAGE } from "@/lib/renewal/handled";
import { termStartKey } from "@/lib/notifications/term-start";

export type TermStartEffectResult = {
  policyId: string;
  key: string;
  flipped: number;
  clearedHandled: boolean;
};

export async function applyTermStartEffects(input: {
  policyId: string;
  termEffective: Date;
}): Promise<TermStartEffectResult> {
  const key = termStartKey(input.policyId, input.termEffective);

  const docs = await db
    .select({
      id: documents.id,
      tags: documents.tags,
      createdAt: documents.createdAt,
    })
    .from(documents)
    .where(
      and(
        eq(documents.tenantId, DEFAULT_TENANT_ID),
        eq(documents.policyId, input.policyId),
        notHiddenDocument(),
      ),
    );

  const plan = planTermStartRoleFlip(docs);
  for (const change of plan) {
    const doc = docs.find((row) => row.id === change.id);
    if (!doc) continue;
    if (termRoleFromTags(doc.tags) !== change.from) continue;
    await db
      .update(documents)
      .set({ tags: tagsWithTermRole(doc.tags, change.to) })
      .where(eq(documents.id, change.id));
  }

  const handledRows = await db
    .select({ id: renewalQueue.id })
    .from(renewalQueue)
    .where(
      and(
        eq(renewalQueue.tenantId, DEFAULT_TENANT_ID),
        eq(renewalQueue.policyId, input.policyId),
        eq(renewalQueue.stage, RENEWAL_HANDLED_STAGE),
      ),
    );
  let clearedHandled = false;
  if (handledRows.length > 0) {
    await db
      .delete(renewalQueue)
      .where(
        and(
          eq(renewalQueue.tenantId, DEFAULT_TENANT_ID),
          eq(renewalQueue.policyId, input.policyId),
          eq(renewalQueue.stage, RENEWAL_HANDLED_STAGE),
        ),
      );
    clearedHandled = true;
  }

  return { policyId: input.policyId, key, flipped: plan.length, clearedHandled };
}
