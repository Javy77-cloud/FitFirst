"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { textFromUpload } from "@/lib/extraction/pdf";
import { classifyIngest } from "@/lib/extraction/ocr";
import {
  inferAccountKind,
  inferDocType,
  inferShopLine,
  isQuoteAttachment,
  parseNamedInsured,
  type ParsedInsured,
} from "@/lib/ingest/identity";
import {
  attachSourceDocs,
  ensureShoppingDealForLead,
  findOrCreateLead,
  type IngestFile,
} from "@/lib/ingest/lead-deal";
import { runFillQuoteSheet } from "@/app/actions/quote-sheet";
import type { ShopLine } from "@/lib/domain";

export async function ingestDroppedDocuments(formData: FormData) {
  const files: IngestFile[] = [];
  const rawFiles = formData.getAll("files").filter((value): value is File => value instanceof File);
  const single = formData.get("file");
  if (single instanceof File && single.size > 0) rawFiles.push(single);

  for (const file of rawFiles) {
    if (file.size === 0) continue;
    files.push({
      filename: file.name,
      mimeType: file.type || "application/octet-stream",
      buffer: Buffer.from(await file.arrayBuffer()),
      docType: inferDocType(file.name, String(formData.get("docType") || "")),
    });
  }

  if (files.length === 0) {
    throw new Error("Drop a dec, wind mit, 4-point, or inspection.");
  }

  let combinedText = "";
  let identity: ParsedInsured | null = null;
  let line: ShopLine = "home";

  for (const file of files) {
    if (isQuoteAttachment(file.docType, file.filename)) continue;
    const plan = classifyIngest(file.mimeType, file.filename);
    if (!plan.implemented) continue;
    try {
      const text = await textFromUpload(file.buffer, file.mimeType, file.filename);
      combinedText += `\n${text}`;
      identity = identity ?? parseNamedInsured(text);
      const inferred = inferShopLine(text, file.filename, file.docType);
      if (line === "home") line = inferred;
    } catch {
      // Photos and unreadable files still attach. They do not block Lead→Deal.
    }
  }

  if (line === "home") {
    line = inferShopLine(combinedText, files[0].filename, files[0].docType);
  }

  const named = identity
    ? `${identity.firstName} ${identity.lastName}`.trim()
    : null;

  const { lead } = await findOrCreateLead(
    identity,
    `Dropped ${files.map((f) => f.filename).join(", ")}. Source docs only — no policy from this ingest.`,
  );

  const { deal } = await ensureShoppingDealForLead({
    leadId: lead.id,
    firstName: lead.firstName,
    lastName: lead.lastName,
    line,
    namedInsured: named,
    secondaryNamedInsured: identity?.secondary ?? null,
    accountKind: inferAccountKind(line),
  });

  await attachSourceDocs(deal.id, files);

  const sourceFiles = files.filter((file) => !isQuoteAttachment(file.docType, file.filename));
  if (sourceFiles.length > 0) {
    await runFillQuoteSheet(deal.id, line);
  }

  revalidatePath("/");
  revalidatePath("/leads");
  revalidatePath("/deals");
  revalidatePath(`/deals/${deal.id}`);
  redirect(`/deals/${deal.id}`);
}
