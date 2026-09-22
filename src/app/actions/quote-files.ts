"use server";

import path from "node:path";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { persistFile } from "@/app/actions/documents";
import { isUploadedFile, readUploadedBytes, uploadedFileName } from "@/lib/documents/uploaded-file";
import { db } from "@/lib/db";
import { quotes } from "@/lib/db/schema";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import {
  agencyQuoteTags,
  clientUploadPathError,
  displayFilename,
  isAllowedStoredUploadUrl,
  messageFromUploadError,
  planUpload,
  storageObjectKey,
} from "@/lib/files/upload-plan";

export type QuoteFileSaveResult =
  | { ok: true }
  | { ok: false; error: string };

async function loadQuote(dealId: string, quoteId: string) {
  const [quote] = await db
    .select()
    .from(quotes)
    .where(and(eq(quotes.id, quoteId), eq(quotes.dealId, dealId), eq(quotes.tenantId, DEFAULT_TENANT_ID)));
  return quote ?? null;
}

function quoteIds(formData: FormData): { dealId: string; quoteId: string } | { error: string } {
  const dealId = String(formData.get("dealId") ?? "").trim();
  const quoteId = String(formData.get("quoteId") ?? "").trim();
  if (!dealId || !quoteId) return { error: "Deal and quote are required. Nothing was saved." };
  return { dealId, quoteId };
}

/** Agency-uploaded quote PDF, including a wind-mit supporting file. Inserts only. */
export async function uploadAgencyQuoteFileAction(formData: FormData): Promise<QuoteFileSaveResult> {
  const ids = quoteIds(formData);
  if ("error" in ids) return { ok: false, error: ids.error };
  const displayNameInput = String(formData.get("displayName") ?? "").trim();
  const file = formData.get("file");
  if (!file || !isUploadedFile(file)) {
    return { ok: false, error: "Choose a file to upload. Nothing was saved." };
  }
  const bytes = await readUploadedBytes(file);
  const filename = uploadedFileName(file);
  if (!bytes) {
    return { ok: false, error: `“${displayFilename(filename)}” had no bytes. Nothing was saved.` };
  }
  const plan = planUpload({
    filename,
    byteLength: bytes.length,
    mimeType: file.type,
    onVercel: Boolean(process.env.VERCEL),
    directBlob: false,
  });
  if (!plan.ok) return { ok: false, error: plan.error };

  const quote = await loadQuote(ids.dealId, ids.quoteId);
  if (!quote) return { ok: false, error: "Quote not found on this deal. Nothing was saved." };

  const displayName = displayNameInput || plan.displayName;
  try {
    await persistFile({
      dealId: ids.dealId,
      riskId: quote.riskId,
      filename,
      mimeType: file.type || plan.mimeType,
      buffer: bytes,
      docType: "agency_quote",
      slot: "quote_file",
      tags: agencyQuoteTags({
        quoteId: ids.quoteId,
        filename,
        displayName,
      }),
    });
  } catch (error) {
    console.error("[uploadAgencyQuoteFile]", error);
    return { ok: false, error: messageFromUploadError(error, filename) };
  }

  revalidatePath(`/deals/${ids.dealId}`);
  return { ok: true };
}

/** Safe object key for a browser upload that bypasses the 4.5MB Vercel request cap. */
export async function prepareAgencyQuoteBlob(formData: FormData): Promise<
  | { ok: true; pathname: string; mimeType: string; displayName: string }
  | { ok: false; error: string }
> {
  const ids = quoteIds(formData);
  if ("error" in ids) return { ok: false, error: ids.error };
  const filename = String(formData.get("filename") ?? "").trim();
  const byteLength = Number(formData.get("byteLength") ?? 0);
  const mimeType = String(formData.get("mimeType") ?? "");
  const plan = planUpload({
    filename,
    byteLength,
    mimeType,
    onVercel: true,
    directBlob: true,
  });
  if (!plan.ok) return { ok: false, error: plan.error };
  const quote = await loadQuote(ids.dealId, ids.quoteId);
  if (!quote) return { ok: false, error: "Quote not found on this deal. Nothing was saved." };
  const pathname = storageObjectKey(
    path.posix.join(DEFAULT_TENANT_ID, ids.dealId, `${randomUUID()}-${filename}`),
  );
  const pathError = clientUploadPathError(pathname, ids.dealId);
  if (pathError) return { ok: false, error: pathError };
  return { ok: true, pathname, mimeType: plan.mimeType, displayName: plan.displayName };
}

/** Record a blob URL already uploaded from the browser. Does not delete other files. */
export async function commitAgencyQuoteBlob(formData: FormData): Promise<QuoteFileSaveResult> {
  const ids = quoteIds(formData);
  if ("error" in ids) return { ok: false, error: ids.error };
  const filename = String(formData.get("filename") ?? "").trim();
  const displayNameInput = String(formData.get("displayName") ?? "").trim();
  const storageUrl = String(formData.get("storageUrl") ?? "").trim();
  const mimeType = String(formData.get("mimeType") ?? "");
  const byteLength = Number(formData.get("byteLength") ?? 0);
  const plan = planUpload({
    filename,
    byteLength,
    mimeType,
    onVercel: true,
    directBlob: true,
  });
  if (!plan.ok) return { ok: false, error: plan.error };
  if (!isAllowedStoredUploadUrl(storageUrl, ids.dealId)) {
    return {
      ok: false,
      error: `Could not attach “${displayFilename(filename)}”. The stored file is not on this deal. Nothing was saved.`,
    };
  }
  const quote = await loadQuote(ids.dealId, ids.quoteId);
  if (!quote) return { ok: false, error: "Quote not found on this deal. Nothing was saved." };
  const displayName = displayNameInput || plan.displayName;
  try {
    await persistFile({
      dealId: ids.dealId,
      riskId: quote.riskId,
      filename,
      mimeType: plan.mimeType,
      existingStoragePath: storageUrl,
      docType: "agency_quote",
      slot: "quote_file",
      tags: agencyQuoteTags({ quoteId: ids.quoteId, filename, displayName }),
    });
  } catch (error) {
    console.error("[commitAgencyQuoteBlob]", error);
    return { ok: false, error: messageFromUploadError(error, filename) };
  }
  revalidatePath(`/deals/${ids.dealId}`);
  return { ok: true };
}
