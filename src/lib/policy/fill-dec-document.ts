/**
 * Declaration the desk Fill-from-DEC button reads.
 * Shared by the policy action and the book Fill-from-DEC script so a dry-run
 * names the same file the fill will open.
 */
import { and, eq } from "drizzle-orm";
import { notHiddenDocument } from "@/lib/documents/visible-docs";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { documents, policies } from "@/lib/db/schema";
import { isUuid } from "@/lib/ids";
import { pickPolicyDecDocument, type DecDocLike } from "@/lib/policy/fill-from-dec";

const decDocColumns = {
  id: documents.id,
  filename: documents.filename,
  storagePath: documents.storagePath,
  mimeType: documents.mimeType,
  docType: documents.docType,
  slot: documents.slot,
  createdAt: documents.createdAt,
  tags: documents.tags,
};

/** Policy + declaration file only. No Gemini. */
export async function loadFillDecDocument(input: {
  policyId: string;
  documentId?: string | null;
  /** Book pass. Current term-role declaration, else the desk pick. */
  preferCurrent?: boolean;
}): Promise<
  | { ok: true; policy: typeof policies.$inferSelect; doc: DecDocLike & { storagePath?: string | null } }
  | { ok: false; error: string }
> {
  if (!isUuid(input.policyId)) return { ok: false, error: "Policy required." };
  const [policy] = await db
    .select()
    .from(policies)
    .where(and(eq(policies.tenantId, DEFAULT_TENANT_ID), eq(policies.id, input.policyId)));
  if (!policy) return { ok: false, error: "Policy not found." };

  const docs = await db
    .select(decDocColumns)
    .from(documents)
    .where(
      and(
        eq(documents.tenantId, DEFAULT_TENANT_ID),
        eq(documents.policyId, policy.id),
        notHiddenDocument(),
      ),
    );

  let pool = docs;
  if (policy.sourceDocumentId && !pool.some((doc) => doc.id === policy.sourceDocumentId)) {
    const [source] = await db
      .select(decDocColumns)
      .from(documents)
      .where(and(eq(documents.tenantId, DEFAULT_TENANT_ID), eq(documents.id, policy.sourceDocumentId)));
    if (source) pool = [...pool, source];
  }

  if (input.documentId && !pool.some((doc) => doc.id === input.documentId)) {
    return { ok: false, error: "Declaration not on this policy." };
  }
  const doc = pickPolicyDecDocument(pool, {
    documentId: input.documentId,
    sourceDocumentId: policy.sourceDocumentId,
    preferCurrentTerm: input.preferCurrent === true,
  });
  if (!doc) return { ok: false, error: "No declaration page on this policy." };
  return { ok: true, policy, doc };
}
