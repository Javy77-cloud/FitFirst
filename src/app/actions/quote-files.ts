"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { persistFile } from "@/app/actions/documents";
import { db } from "@/lib/db";
import { quotes } from "@/lib/db/schema";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { flashAction } from "@/lib/flash-action";

/** Agency-uploaded quote PDF/file, tagged onto the deal documents list for this quote. */
export async function uploadAgencyQuoteFileAction(formData: FormData) {
  const dealId = String(formData.get("dealId") ?? "").trim();
  const quoteId = String(formData.get("quoteId") ?? "").trim();
  const displayName = String(formData.get("displayName") ?? "").trim();
  const file = formData.get("file");

  if (!dealId || !quoteId) throw new Error("Deal and quote are required.");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Choose a file to upload.");
  }

  const [quote] = await db
    .select()
    .from(quotes)
    .where(
      and(
        eq(quotes.id, quoteId),
        eq(quotes.dealId, dealId),
        eq(quotes.tenantId, DEFAULT_TENANT_ID),
      ),
    );
  if (!quote) throw new Error("Quote not found on this deal.");

  const label = displayName || file.name;
  const tags = [`quote:${quoteId}`, "source:agency", `label:${label}`];

  await persistFile({
    dealId,
    riskId: quote.riskId,
    filename: file.name,
    mimeType: file.type || "application/octet-stream",
    buffer: Buffer.from(await file.arrayBuffer()),
    docType: "agency_quote",
    slot: "quote_file",
    tags,
  });

  revalidatePath(`/deals/${dealId}`);
  flashAction(`/deals/${dealId}?tab=quotes`, "Agency quote file uploaded");
}
