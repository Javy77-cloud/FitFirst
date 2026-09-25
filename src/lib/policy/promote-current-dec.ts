/**
 * Shared path when a declaration becomes the Current page on a policy.
 *
 * Promotes that document to term_role:current and demotes every other Current
 * document on the policy to prior (the existing "not current" role). Does not
 * invent a policy status and does not archive the policy.
 *
 * Term dates are rolled only when advanceTerm is set (the explicit Current
 * control). Upload and carrier receive promote the page without annual-rolling
 * a term that has not been read yet. Issue writes the replacement term itself
 * and calls this with advanceTerm false.
 *
 * syncAutomations refreshes renewal_30 / renewal_60. Off-book policies schedule
 * nothing and close leftovers.
 */
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { tagsWithTermRole, type DocumentTermRole } from "@/lib/documents/document-labels";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { documents, policies } from "@/lib/db/schema";
import { isDeclarationDocType } from "@/lib/policy/dec-prompt";
import { markPolicyDecAsCurrent } from "@/lib/policy/mark-dec-current";

/** Issued declaration types that replace the Current page. Not id cards, endorsements, or a full policy packet. */
export function arrivingDeclarationBecomesCurrent(docType: string | null | undefined): boolean {
  return isDeclarationDocType(docType);
}

/**
 * One policy on the deal can be linked. Zero or many means we do not guess
 * which book the new declaration belongs to.
 */
export function soleLinkedPolicyId(policyIds: readonly (string | null | undefined)[]): string | null {
  const unique = [...new Set(policyIds.map((id) => (id ?? "").trim()).filter(Boolean))];
  return unique.length === 1 ? unique[0]! : null;
}

/** Roles that already mean "this page is not the in-force Current". */
const HELD_OFF_CURRENT = new Set(["renewal", "prior", "archive"]);

/**
 * Issue fill promotes unless the issue writer already tagged this page
 * renewal, prior, or archive. A future term must not knock off the in-force Current.
 */
export function issueFillShouldPromoteCurrent(termRole: string | null | undefined): boolean {
  const role = (termRole ?? "").trim().toLowerCase();
  if (!role) return true;
  return !HELD_OFF_CURRENT.has(role);
}

export type PromoteCurrentDecResult =
  | { ok: true; documentsChanged: boolean; termsAdvanced: boolean }
  | { ok: false; error: string };

export async function promoteArrivingCurrentDec(input: {
  policyId: string;
  documentId: string;
  /**
   * Roll book dates through advancePolicyCurrentTerm.
   * True for the explicit Current control. False for upload, API, and issue
   * (issue already wrote the replacement term from DEC dates).
   */
  advanceTerm?: boolean;
  /** Refresh renewal_30 / renewal_60. Defaults to true. */
  syncAutomations?: boolean;
}): Promise<PromoteCurrentDecResult> {
  const policyId = input.policyId.trim();
  const documentId = input.documentId.trim();
  if (!policyId || !documentId) return { ok: false, error: "Declaration required." };

  const marked = await markPolicyDecAsCurrent({ policyId, documentId });
  if (!marked.ok) return marked;

  let termsAdvanced = false;
  if (input.advanceTerm) {
    const { advancePolicyCurrentTerm } = await import("@/lib/policy/advance-current-term-apply");
    const advanced = await advancePolicyCurrentTerm({
      policyId,
      trigger: "document_term_role",
    });
    if (!advanced.ok) return { ok: false, error: advanced.error };
    termsAdvanced = advanced.advanced;
  }

  if (input.syncAutomations !== false) {
    const { syncPolicyDateAutomations } = await import("@/app/actions/policy-record");
    await syncPolicyDateAutomations(policyId);
  }

  try {
    revalidatePath(`/policies/${policyId}`);
    revalidatePath("/policies");
    revalidatePath("/renewals");
    revalidatePath("/renewals/queue");
  } catch {
    /* revalidatePath throws outside a request */
  }

  return { ok: true, documentsChanged: marked.changed, termsAdvanced };
}

/**
 * Tag one document renewal / prior / archive. Does not demote sibling Current pages.
 */
export async function tagDocumentTermRoleOnly(input: {
  documentId: string;
  policyId: string;
  role: Extract<DocumentTermRole, "renewal" | "prior" | "archive">;
}): Promise<void> {
  const documentId = input.documentId.trim();
  const policyId = input.policyId.trim();
  if (!documentId || !policyId) return;
  const [doc] = await db
    .select({ id: documents.id, tags: documents.tags, policyId: documents.policyId })
    .from(documents)
    .where(and(eq(documents.tenantId, DEFAULT_TENANT_ID), eq(documents.id, documentId)));
  if (!doc) return;
  if (doc.policyId && doc.policyId !== policyId) return;
  await db
    .update(documents)
    .set({ tags: tagsWithTermRole(doc.tags, input.role) })
    .where(eq(documents.id, doc.id));
}

/**
 * Carrier API: link the new declaration only when the deal has exactly one policy,
 * then promote that page. Multiple products stay untouched until issue.
 */
export async function promoteSoleDealPolicyDeclaration(input: {
  dealId: string;
  documentId: string;
}): Promise<{ promoted: boolean; policyId: string | null }> {
  const dealId = input.dealId.trim();
  const documentId = input.documentId.trim();
  if (!dealId || !documentId) return { promoted: false, policyId: null };

  const rows = await db
    .select({ id: policies.id })
    .from(policies)
    .where(and(eq(policies.tenantId, DEFAULT_TENANT_ID), eq(policies.dealId, dealId)));
  const policyId = soleLinkedPolicyId(rows.map((row) => row.id));
  if (!policyId) return { promoted: false, policyId: null };

  const [doc] = await db
    .select({ policyId: documents.policyId })
    .from(documents)
    .where(and(eq(documents.tenantId, DEFAULT_TENANT_ID), eq(documents.id, documentId)));
  if (doc?.policyId && doc.policyId !== policyId) return { promoted: false, policyId: null };
  if (!doc?.policyId) {
    await db
      .update(documents)
      .set({ policyId })
      .where(and(eq(documents.tenantId, DEFAULT_TENANT_ID), eq(documents.id, documentId)));
  }

  const promoted = await promoteArrivingCurrentDec({
    policyId,
    documentId,
    advanceTerm: false,
  });
  return { promoted: promoted.ok, policyId };
}
