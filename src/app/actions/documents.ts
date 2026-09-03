"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import { persistDealFile } from "@/lib/documents/store";
import { runFillDealSheets } from "@/app/actions/quote-sheet";
import { SHOP_LINES, type ShopLine } from "@/lib/domain";
import {
  CLEAN_DEC_FILENAME,
  CLEAN_DEC_TEXT,
  MESSY_WIND_MIT_FILENAME,
  MESSY_WIND_MIT_TEXT,
} from "@/lib/fixtures/sample-docs";

export async function uploadDocument(formData: FormData) {
  const dealId = String(formData.get("dealId") ?? "");
  const riskId = String(formData.get("riskId") ?? "");
  const docType = String(formData.get("docType") ?? "other");
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Choose a file to upload.");
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  await persistDealFile({
    dealId,
    riskId,
    filename: file.name,
    mimeType: file.type || "application/octet-stream",
    buffer,
    docType,
  });
  const lineRaw = String(formData.get("line") ?? "home");
  const line = (SHOP_LINES as readonly string[]).includes(lineRaw) ? (lineRaw as ShopLine) : "home";
  await runFillDealSheets(dealId, line);
  revalidatePath(`/deals/${dealId}`);
}

export async function uploadSampleDocument(formData: FormData) {
  const dealId = String(formData.get("dealId") ?? "");
  const riskId = String(formData.get("riskId") ?? "");
  const sample = String(formData.get("sample") ?? "clean");
  const messy = sample === "messy";
  const filename = messy ? MESSY_WIND_MIT_FILENAME : CLEAN_DEC_FILENAME;
  const text = messy ? MESSY_WIND_MIT_TEXT : CLEAN_DEC_TEXT;
  const docType = messy ? "wind_mit" : "dec";
  await persistDealFile({
    dealId,
    riskId,
    filename,
    mimeType: "text/plain",
    buffer: Buffer.from(text, "utf8"),
    docType,
  });
  revalidatePath(`/deals/${dealId}`);
}

export async function markDocumentType(formData: FormData) {
  const documentId = String(formData.get("documentId") ?? "");
  const dealId = String(formData.get("dealId") ?? "");
  const docType = String(formData.get("docType") ?? "other");
  await db.update(documents).set({ docType }).where(eq(documents.id, documentId));
  revalidatePath(`/deals/${dealId}`);
}
