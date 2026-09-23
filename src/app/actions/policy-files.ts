"use server";

import { revalidatePath } from "next/cache";
import { flashAction } from "@/lib/flash-action";
import { and, eq } from "drizzle-orm";
import { persistFile } from "@/app/actions/documents";
import { dismissIdCardsPrompt } from "@/app/actions/policy-mint";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { activities, documents, policies, reviewTasks } from "@/lib/db/schema";
import { isUploadedFile, readUploadedBytes, uploadedFileName } from "@/lib/documents/uploaded-file";
import { displayFilename } from "@/lib/files/upload-plan";
import {
  DOMENIC_IORI_DEC_DOCUMENT_ID,
  DOMENIC_IORI_POLICY_ID,
} from "@/lib/policy/dec-prompt";
import { SERVICING_TASK_KINDS } from "@/lib/domain-ams";

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

/** Multi-file attach on a Policy. Durable via Vercel Blob when configured. */
export async function attachPolicyFiles(formData: FormData) {
  const policyId = str(formData, "policyId");
  const dealId = str(formData, "dealId") || null;
  if (!policyId) return;

  const [policy] = await db
    .select()
    .from(policies)
    .where(and(eq(policies.tenantId, DEFAULT_TENANT_ID), eq(policies.id, policyId)));
  if (!policy) return;

  const files = formData.getAll("file");
  const categories = formData.getAll("category").map((value) => String(value ?? "").trim() || "other");
  const expiresRaw = formData.getAll("expiresAt").map((value) => String(value ?? "").trim());

  let count = 0;
  let index = 0;
  let lastError: string | null = null;
  for (const file of files) {
    if (!isUploadedFile(file)) {
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
        filename: uploadedFileName(file),
        mimeType: file.type || "application/octet-stream",
        buffer: bytes,
        docType,
        slot: "policy_file",
      });
      if (expiresAt) {
        const parsed = new Date(`${expiresAt}T12:00:00`);
        if (!Number.isNaN(parsed.getTime())) {
          await db
            .update(documents)
            .set({ expiresAt: parsed })
            .where(eq(documents.id, doc.id));
        }
      }
      count += 1;
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Could not store the document.";
      console.error("[attachPolicyFiles]", lastError);
    }
    index += 1;
  }

  revalidatePath(`/policies/${policyId}`);
  if (dealId || policy.dealId) revalidatePath(`/deals/${dealId || policy.dealId}`);
  if (count === 0 && lastError) {
    flashAction(`/policies/${policyId}?tab=documents`, lastError, "error");
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
