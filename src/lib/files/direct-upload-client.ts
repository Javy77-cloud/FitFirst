"use client";

import { upload } from "@vercel/blob/client";
import { VERCEL_INCOMING_BODY_MAX_BYTES } from "@/lib/files/upload-plan";

/** Send file bytes to Blob without putting them through a Server Action body. */
export async function uploadBytesToBlob(input: {
  pathname: string;
  file: File;
  contentType: string;
  dealId: string;
}): Promise<{ url: string }> {
  const blob = await upload(input.pathname, input.file, {
    access: "private",
    handleUploadUrl: "/api/files/client-upload",
    contentType: input.contentType,
    clientPayload: input.dealId,
    multipart: input.file.size > VERCEL_INCOMING_BODY_MAX_BYTES,
  });
  if (!blob?.url) {
    throw new Error(`“${input.file.name}” uploaded but Blob did not return a URL. Nothing was saved on the quote.`);
  }
  // Prefer downloadUrl when present so View/probe hit the same shape as server put read-back.
  return { url: blob.downloadUrl || blob.url };
}
