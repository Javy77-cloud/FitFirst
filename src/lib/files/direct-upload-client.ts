"use client";

import { upload } from "@vercel/blob/client";
import { VERCEL_INCOMING_BODY_MAX_BYTES } from "@/lib/files/upload-plan";

/** Send file bytes to Blob without putting them through a Server Action body. */
export async function uploadBytesToBlob(input: {
  pathname: string;
  file: File;
  contentType: string;
  /** Deal or policy id — must match the folder segment in pathname. */
  scopeId?: string;
  /** Alias for scopeId (deal uploads). */
  dealId?: string;
}): Promise<{ url: string }> {
  const scopeId = (input.scopeId || input.dealId || "").trim();
  if (!scopeId) {
    throw new Error(`“${input.file.name}” is not tied to a deal or policy. Nothing was saved.`);
  }
  const blob = await upload(input.pathname, input.file, {
    access: "private",
    handleUploadUrl: "/api/files/client-upload",
    contentType: input.contentType,
    clientPayload: scopeId,
    multipart: input.file.size > VERCEL_INCOMING_BODY_MAX_BYTES,
  });
  if (!blob?.url) {
    throw new Error(`“${input.file.name}” uploaded but Blob did not return a URL. Nothing was saved on the quote.`);
  }
  // Prefer downloadUrl when present so View/probe hit the same shape as server put read-back.
  return { url: blob.downloadUrl || blob.url };
}
