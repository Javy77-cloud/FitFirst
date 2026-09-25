"use server";

import path from "node:path";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { persistFile } from "@/app/actions/documents";
import { dismissIdCardsPrompt } from "@/app/actions/policy-mint";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { activities, documents, policies, reviewTasks } from "@/lib/db/schema";
import { isUploadedFile, readUploadedBytes, uploadedFileName } from "@/lib/documents/uploaded-file";
import {
  clientUploadPathError,
  displayFilename,
  isAllowedStoredUploadUrl,
  messageFromUploadError,
  planUpload,
  storageObjectKey,
} from "@/lib/files/upload-plan";
import { blobStoreReady } from "@/lib/files/object-store";
import {
  DOMENIC_IORI_DEC_DOCUMENT_ID,
  DOMENIC_IORI_POLICY_ID,
} from "@/lib/policy/dec-prompt";
import {
  arrivingDeclarationBecomesCurrent,
  promoteArrivingCurrentDec,
} from "@/lib/policy/promote-current-dec";
import { SERVICING_TASK_KINDS } from "@/lib/domain-ams";

export type PolicyAttachResult = {
  ok: boolean;
  count: number;
  message?: string;
};

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function extensionOf(name: string): string {
  const idx = name.lastIndexOf(".");
  return idx >= 0 ? name.slice(idx) : "";
}

function withExtension(display: string, original: string): string {
  const trimmed = displayFilename(display).trim();
  if (!trimmed) return displayFilename(original);
  if (extensionOf(trimmed)) return trimmed;
  const ext = extensionOf(original);
  return ext ? `${trimmed}${ext}` : trimmed;
}

async function loadPolicyForAttach(policyId: string) {
  const [policy] = await db
    .select()
    .from(policies)
    .where(and(eq(policies.tenantId, DEFAULT_TENANT_ID), eq(policies.id, policyId)));
  return policy ?? null;
}

function policyStorageScope(policy: { id: string; dealId: string | null }, dealId?: string | null) {
  return (dealId || policy.dealId || policy.id).trim();
}

async function applyPolicyExpiresAt(documentId: string, expiresAt: string) {
  if (!expiresAt) return;
  const parsed = new Date(`${expiresAt}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return;
  await db.update(documents).set({ expiresAt: parsed }).where(eq(documents.id, documentId));
}

function revalidatePolicyAttach(policyId: string, dealId: string | null) {
  revalidatePath(`/policies/${policyId}`);
  if (dealId) revalidatePath(`/deals/${dealId}`);
}

/**
 * Multi-file attach on a Policy via Server Action body.
 * On Vercel, keep each file under ~4.5MB — larger PDFs must use preparePolicyBlobUpload
 * + savePolicyDocumentFromBlob (browser → Blob) so the platform does not reject the request.
 */
export async function attachPolicyFiles(formData: FormData): Promise<PolicyAttachResult> {
  const policyId = str(formData, "policyId");
  const dealId = str(formData, "dealId") || null;
  if (!policyId) {
    return { ok: false, count: 0, message: "This policy is missing, so the file was not saved." };
  }

  const policy = await loadPolicyForAttach(policyId);
  if (!policy) {
    return { ok: false, count: 0, message: "This policy is missing, so the file was not saved." };
  }

  const files = formData.getAll("file");
  const categories = formData.getAll("category").map((value) => String(value ?? "").trim() || "other");
  const expiresRaw = formData.getAll("expiresAt").map((value) => String(value ?? "").trim());
  const onVercel = Boolean(process.env.VERCEL);
  const directBlob = onVercel && blobStoreReady();

  let count = 0;
  let index = 0;
  let lastError: string | null = null;
  for (const file of files) {
    if (!isUploadedFile(file)) {
      index += 1;
      continue;
    }
    const filename = uploadedFileName(file);
    const plan = planUpload({
      filename,
      byteLength: file.size || 0,
      mimeType: file.type,
      onVercel,
      directBlob,
    });
    if (!plan.ok) {
      lastError = plan.error;
      index += 1;
      continue;
    }
    if (plan.via === "blob-client") {
      lastError =
        `“${displayFilename(filename)}” is too large for a direct attach on this server. ` +
        `Use the Policy Documents uploader (it sends large inspection PDFs straight to storage). Nothing was saved.`;
      index += 1;
      continue;
    }
    const bytes = await readUploadedBytes(file);
    if (!bytes) {
      index += 1;
      continue;
    }
    const docType = categories[index] || str(formData, "docType") || "other";
    const expiresAt = expiresRaw[index] || str(formData, "expiresAt") || "";
    try {
      const doc = await persistFile({
        policyId,
        dealId: dealId || policy.dealId,
        contactId: policy.contactId,
        riskId: policy.riskId,
        filename,
        mimeType: plan.mimeType,
        buffer: bytes,
        docType,
        slot: "policy_file",
      });
      await applyPolicyExpiresAt(doc.id, expiresAt);
      if (arrivingDeclarationBecomesCurrent(docType)) {
        await promoteArrivingCurrentDec({
          policyId,
          documentId: doc.id,
          advanceTerm: false,
        });
      }
      count += 1;
    } catch (error) {
      lastError = messageFromUploadError(error, filename);
      console.error("[attachPolicyFiles]", lastError);
    }
    index += 1;
  }

  revalidatePolicyAttach(policyId, dealId || policy.dealId);
  if (count === 0) {
    return {
      ok: false,
      count: 0,
      message: lastError ?? "Choose a file to attach. Nothing was saved.",
    };
  }
  return { ok: true, count, message: lastError || undefined };
}

/** Browser → Blob prep for inspection PDFs larger than Vercel's ~4.5MB request body. */
export async function preparePolicyBlobUpload(formData: FormData): Promise<
  | { ok: true; pathname: string; mimeType: string; displayName: string; scopeId: string }
  | { ok: false; error: string }
> {
  const policyId = str(formData, "policyId");
  const dealId = str(formData, "dealId") || null;
  const filename = str(formData, "filename");
  const byteLength = Number(formData.get("byteLength") ?? 0);
  const mimeType = str(formData, "mimeType");
  if (!policyId) return { ok: false, error: "This policy is missing, so the file was not saved." };
  const policy = await loadPolicyForAttach(policyId);
  if (!policy) return { ok: false, error: "This policy is missing, so the file was not saved." };
  const plan = planUpload({
    filename,
    byteLength,
    mimeType,
    onVercel: true,
    directBlob: true,
  });
  if (!plan.ok) return { ok: false, error: plan.error };
  const scopeId = policyStorageScope(policy, dealId);
  const pathname = storageObjectKey(
    path.posix.join(DEFAULT_TENANT_ID, scopeId, `${randomUUID()}-${filename}`),
  );
  const pathError = clientUploadPathError(pathname, scopeId);
  if (pathError) return { ok: false, error: pathError };
  return { ok: true, pathname, mimeType: plan.mimeType, displayName: plan.displayName, scopeId };
}

/** Attach a browser Blob upload onto the policy. Inserts one row. Does not delete other files. */
export async function savePolicyDocumentFromBlob(formData: FormData): Promise<PolicyAttachResult> {
  const policyId = str(formData, "policyId");
  const dealId = str(formData, "dealId") || null;
  const filename = str(formData, "filename");
  const storageUrl = str(formData, "storageUrl");
  const mimeType = str(formData, "mimeType");
  const byteLength = Number(formData.get("byteLength") ?? 0);
  const docType = str(formData, "docType") || str(formData, "category") || "other";
  const expiresAt = str(formData, "expiresAt");
  if (!policyId) {
    return { ok: false, count: 0, message: "This policy is missing, so the file was not saved." };
  }
  const policy = await loadPolicyForAttach(policyId);
  if (!policy) {
    return { ok: false, count: 0, message: "This policy is missing, so the file was not saved." };
  }
  const plan = planUpload({
    filename,
    byteLength,
    mimeType,
    onVercel: true,
    directBlob: true,
  });
  if (!plan.ok) {
    return { ok: false, count: 0, message: plan.error };
  }
  const scopeId = policyStorageScope(policy, dealId);
  if (!isAllowedStoredUploadUrl(storageUrl, scopeId)) {
    return {
      ok: false,
      count: 0,
      message: `Could not attach “${displayFilename(filename)}”. The stored file is not on this policy. Nothing was saved.`,
    };
  }
  try {
    const doc = await persistFile({
      policyId,
      dealId: dealId || policy.dealId,
      contactId: policy.contactId,
      riskId: policy.riskId,
      filename,
      mimeType: plan.mimeType,
      existingStoragePath: storageUrl,
      docType,
      slot: "policy_file",
    });
    await applyPolicyExpiresAt(doc.id, expiresAt);
    if (arrivingDeclarationBecomesCurrent(docType)) {
      await promoteArrivingCurrentDec({
        policyId,
        documentId: doc.id,
        advanceTerm: false,
      });
    }
    revalidatePolicyAttach(policyId, dealId || policy.dealId);
    return { ok: true, count: 1 };
  } catch (error) {
    return {
      ok: false,
      count: 0,
      message: messageFromUploadError(error, filename),
    };
  }
}

/**
 * Durable ID-card upload (modal step 2 + quiet Documents control).
 * Accepts file_0..N + displayName_0..N. Multi-file OK.
 */
export async function uploadPolicyIdCards(formData: FormData) {
  const policyId = str(formData, "policyId");
  const dealId = str(formData, "dealId") || null;
  const dismiss = str(formData, "dismiss") === "1" || formData.get("dismiss") === "on";
  if (!policyId) return { ok: false as const, reason: "invalid" as const, count: 0 };

  const [policy] = await db
    .select()
    .from(policies)
    .where(and(eq(policies.tenantId, DEFAULT_TENANT_ID), eq(policies.id, policyId)));
  if (!policy) return { ok: false as const, reason: "missing" as const, count: 0 };

  const rowCount = Number(formData.get("rowCount") ?? 0);
  const indexes =
    Number.isFinite(rowCount) && rowCount > 0
      ? Array.from({ length: rowCount }, (_, i) => i)
      : [0];

  let count = 0;
  for (const i of indexes) {
    const raw = formData.get(`file_${i}`) ?? (i === 0 ? formData.get("file") : null);
    if (raw == null || !isUploadedFile(raw)) continue;
    const file = raw;
    const bytes = await readUploadedBytes(file);
    if (!bytes) continue;
    const original = uploadedFileName(file);
    const display = withExtension(
      str(formData, `displayName_${i}`) || str(formData, "displayName"),
      original,
    );
    await persistFile({
      policyId,
      dealId: dealId || policy.dealId,
      contactId: policy.contactId,
      riskId: policy.riskId,
      filename: display,
      mimeType: file.type || "application/octet-stream",
      buffer: bytes,
      docType: "policy_id",
      slot: "policy_file",
    });
    count += 1;
  }

  if (count === 0) {
    return { ok: false as const, reason: "choose-file" as const, count: 0 };
  }

  if (dismiss) {
    const data = new FormData();
    data.set("policyId", policyId);
    await dismissIdCardsPrompt(data);
  }

  revalidatePath(`/policies/${policyId}`);
  if (dealId || policy.dealId) revalidatePath(`/deals/${dealId || policy.dealId}`);
  return { ok: true as const, count };
}

/**
 * One-shot: retag Domenic Iori Travelers mint DEC onto policy_dec / policy_file.
 * Does not invent bytes — only fixes doc_type so Dec-on-file counts.
 */
export async function ensureDomenicMintDecRetag() {
  const [doc] = await db
    .select()
    .from(documents)
    .where(
      and(eq(documents.tenantId, DEFAULT_TENANT_ID), eq(documents.id, DOMENIC_IORI_DEC_DOCUMENT_ID)),
    );
  if (!doc) return { ok: false as const, reason: "missing" as const };

  const type = (doc.docType ?? "").toLowerCase();
  const already =
    type === "policy_dec" &&
    doc.slot === "policy_file" &&
    doc.policyId === DOMENIC_IORI_POLICY_ID;
  if (already) {
    return { ok: true as const, changed: false as const, documentId: doc.id, docType: doc.docType };
  }

  await db
    .update(documents)
    .set({
      docType: "policy_dec",
      slot: "policy_file",
      policyId: doc.policyId || DOMENIC_IORI_POLICY_ID,
    })
    .where(eq(documents.id, doc.id));

  const policyId = doc.policyId || DOMENIC_IORI_POLICY_ID;
  revalidatePath(`/policies/${policyId}`);
  if (doc.dealId) revalidatePath(`/deals/${doc.dealId}`);
  return {
    ok: true as const,
    changed: true as const,
    documentId: doc.id,
    docType: "policy_dec",
    previousDocType: doc.docType,
  };
}


/**
 * One-shot: close leftover Collect AOR packet tasks on Domenic Iori Travelers.
 * AOR is optional for Auto completion — open servicing_aor tasks must not linger
 * as a desk blocker. Does not invent or delete document bytes.
 */
export async function ensureDomenicOptionalAorCleared() {
  const open = await db
    .select()
    .from(reviewTasks)
    .where(
      and(
        eq(reviewTasks.tenantId, DEFAULT_TENANT_ID),
        eq(reviewTasks.policyId, DOMENIC_IORI_POLICY_ID),
        eq(reviewTasks.kind, SERVICING_TASK_KINDS.aor),
        eq(reviewTasks.status, "open"),
      ),
    );
  if (open.length === 0) {
    return { ok: true as const, changed: false as const, closed: 0 };
  }
  const now = new Date();
  for (const task of open) {
    await db
      .update(reviewTasks)
      .set({ status: "completed" })
      .where(eq(reviewTasks.id, task.id));
    if (task.title) {
      await db
        .update(activities)
        .set({ status: "completed", updatedAt: now })
        .where(
          and(
            eq(activities.tenantId, DEFAULT_TENANT_ID),
            eq(activities.policyId, DOMENIC_IORI_POLICY_ID),
            eq(activities.kind, "task"),
            eq(activities.status, "open"),
            eq(activities.title, task.title),
          ),
        );
    }
  }
  revalidatePath(`/policies/${DOMENIC_IORI_POLICY_ID}`);
  revalidatePath("/tasks");
  revalidatePath("/suspense");
  revalidatePath("/book-health");
  return { ok: true as const, changed: true as const, closed: open.length };
}
