"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { persistFile } from "@/app/actions/documents";
import {
  clearCreatePolicyPrompt,
  maybeQueueCreatePolicyPrompt,
  resolveDeclarationCarrierName,
} from "@/app/actions/declaration-prompt";
import { db } from "@/lib/db";
import { documents, risks } from "@/lib/db/schema";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { parseDealProduct } from "@/lib/deals/deal-products";
import {
  declarationRetagPatch,
  isDeclarationDocType,
  ROSA_DEC_DEAL_ID,
  ROSA_DEC_DOCUMENT_ID,
  tagsAfterDeclarationRetag,
} from "@/lib/policy/dec-prompt";

export async function retagDocumentAsDeclaration(input: {
  documentId: string;
  dealId?: string | null;
  carrierName?: string | null;
  product?: string | null;
  prompt?: boolean;
  forcePrompt?: boolean;
}) {
  const documentId = input.documentId.trim();
  if (!documentId) return { ok: false as const, reason: "invalid" as const };
  const [doc] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.tenantId, DEFAULT_TENANT_ID), eq(documents.id, documentId)));
  if (!doc) return { ok: false as const, reason: "missing" as const };
  const dealId = input.dealId?.trim() || doc.dealId;
  const patch = declarationRetagPatch(doc.filename);
  await db
    .update(documents)
    .set({
      docType: patch.docType,
      slot: patch.slot,
      tags: tagsAfterDeclarationRetag(doc.tags),
    })
    .where(eq(documents.id, documentId));
  let prompt = null;
  if (input.prompt !== false && dealId) {
    prompt = await maybeQueueCreatePolicyPrompt({
      dealId,
      docType: "dec",
      documentId,
      storagePath: doc.storagePath,
      mimeType: doc.mimeType,
      filename: doc.filename,
      carrierName: input.carrierName,
      product: input.product,
      force: input.forcePrompt,
    });
  }
  if (dealId) revalidatePath(`/deals/${dealId}`);
  return { ok: true as const, documentId, dealId, prompt };
}

export async function retagDocumentAsDeclarationAction(formData: FormData) {
  const documentId = String(formData.get("documentId") ?? "").trim();
  const dealId = String(formData.get("dealId") ?? "").trim();
  const carrierName = String(formData.get("carrierName") ?? "").trim();
  const product = String(formData.get("product") ?? "").trim();
  return retagDocumentAsDeclaration({
    documentId,
    dealId,
    carrierName: carrierName || null,
    product: product || null,
  });
}

export async function ensureRosaDeclarationRetag() {
  const [doc] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.tenantId, DEFAULT_TENANT_ID), eq(documents.id, ROSA_DEC_DOCUMENT_ID)));
  if (!doc) return { ok: false as const, reason: "missing" as const };
  if (isDeclarationDocType(doc.docType) && doc.slot === "source_doc") {
    return { ok: true as const, changed: false as const, documentId: doc.id };
  }
  const result = await retagDocumentAsDeclaration({
    documentId: doc.id,
    dealId: doc.dealId ?? ROSA_DEC_DEAL_ID,
    prompt: true,
    forcePrompt: true,
    carrierName: "Florida Peninsula",
    product: "homeowners",
  });
  return { ...result, changed: true as const };
}

export async function receiveCarrierDeclaration(input: {
  dealId: string;
  filename: string;
  mimeType?: string | null;
  buffer: Buffer;
  carrierName?: string | null;
  product?: string | null;
}) {
  const dealId = input.dealId.trim();
  if (!dealId) return { ok: false as const, reason: "invalid" as const, promptCreatePolicy: false };
  const [risk] = await db.select().from(risks).where(eq(risks.dealId, dealId));
  const product = parseDealProduct(input.product ?? "") ?? null;
  const doc = await persistFile({
    dealId,
    riskId: risk?.id ?? null,
    filename: input.filename,
    mimeType: input.mimeType || "application/pdf",
    buffer: input.buffer,
    docType: "dec",
    slot: "source_doc",
    tags: ["dec", "mint", "source:carrier"],
  });
  if (!doc) return { ok: false as const, reason: "need_dec" as const, promptCreatePolicy: false };
  const carrierName = input.carrierName?.trim() || (await resolveDeclarationCarrierName(dealId, product));
  const prompt = await maybeQueueCreatePolicyPrompt({
    dealId,
    docType: "dec",
    documentId: doc.id,
    storagePath: doc.storagePath,
    mimeType: doc.mimeType,
    filename: doc.filename,
    carrierName,
    product,
  });
  revalidatePath(`/deals/${dealId}`);
  return {
    ok: true as const,
    documentId: doc.id,
    carrierName,
    promptCreatePolicy: Boolean(prompt),
    prompt,
  };
}

export async function notNowCreatePolicy(formData: FormData) {
  const dealId = String(formData.get("dealId") ?? "").trim();
  if (dealId) await clearCreatePolicyPrompt(dealId);
}
