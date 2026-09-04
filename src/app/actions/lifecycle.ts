"use server";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import {
  documents,
  extractedFields,
  leads,
  quoteSheets,
  quotes,
  risks,
} from "@/lib/db/schema";
import { convertLeadToDeal, findOrCreateLead } from "@/app/actions/crm";
import { currentDeskSession } from "@/lib/auth/session";
import { listCatalogItems } from "@/lib/integrations/catalog-store";
import { connectionOwnerFor, ingestSocialLead } from "@/lib/leads/offers";
import { parseLeadFromPacket } from "@/lib/lifecycle/lead-match";
import { buildQuoteResultsNote } from "@/lib/lifecycle/quote-results";
import { emptySheetValues, fillSheetBlanks } from "@/lib/lifecycle/quote-sheet";
import { MELBOURNE_HO_DEC_TEXT } from "@/lib/fixtures/sample-docs";
import { textFromUpload } from "@/lib/extraction/pdf";
import { extractFieldsFromText } from "@/lib/extraction/extract";

const uploadRoot = process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

export async function stubEmailLead() {
  const { lead } = await findOrCreateLead({
    firstName: "Jordan",
    lastName: "Lee",
    email: "jordan.lee@example.com",
    phone: "(321) 555-0160",
    source: "email_stub",
    notes:
      "Email stub: wind mit + dec attached in the real inbox. No live mail. Convert to a deal to shop.",
  });
  revalidatePath("/leads");
  redirect(`/leads/${lead.id}`);
}

export async function stubSocialLead() {
  const items = await listCatalogItems();
  const connectionOwnerUserId = connectionOwnerFor(
    "instagram",
    items.map((item) => ({ id: item.id, ownerUserId: item.ownerUserId })),
  );
  const { lead, assignment } = await ingestSocialLead({
    firstName: "Priya",
    lastName: "Shah",
    email: "priya.shah@example.com",
    phone: "(407) 555-0199",
    city: "Orlando",
    state: "FL",
    zip: "32801",
    insuranceTypeDesired: "HO",
    source: "instagram",
    platform: "instagram",
    notes: "Instagram stub: asked for an HO3 quote and said a dec is coming. No live social sync.",
    connectionOwnerUserId,
  });
  revalidatePath("/leads");
  revalidatePath("/social");
  revalidatePath("/alerts");
  revalidatePath("/");
  const session = await currentDeskSession();
  if (assignment === "unassigned" && !session.isAdmin) {
    redirect("/social?notice=unassigned-queued");
  }
  redirect(`/leads/${lead.id}`);
}

export async function dropSampleDecPacket() {
  const parsed = parseLeadFromPacket(MELBOURNE_HO_DEC_TEXT);
  const { lead } = await findOrCreateLead({
    ...parsed,
    source: "dropped_dec",
    notes: parsed.notes,
    insuranceTypeDesired: "HO",
  });
  const dealId = lead.convertedDealId ?? (await convertLeadToDeal(lead.id, "HO", "FL"));
  await attachSourceText(dealId, "sample-melbourne-ho-dec.txt", MELBOURNE_HO_DEC_TEXT);
  revalidatePath("/leads");
  revalidatePath("/deals");
  revalidatePath(`/deals/${dealId}`);
  redirect(`/deals/${dealId}`);
}

export async function dropLeadPacket(formData: FormData) {
  const file = formData.get("file");
  let text = "";
  let filename = "dropped-packet.txt";
  if (file instanceof File && file.size > 0) {
    filename = file.name;
    const buffer = Buffer.from(await file.arrayBuffer());
    text = await textFromUpload(buffer, file.type || "text/plain", file.name);
  } else {
    text = MELBOURNE_HO_DEC_TEXT;
    filename = "sample-melbourne-ho-dec.txt";
  }

  const parsed = parseLeadFromPacket(text);
  const { lead } = await findOrCreateLead({
    ...parsed,
    source: "dropped_dec",
    notes: parsed.notes,
    insuranceTypeDesired: "HO",
  });

  const dealId = lead.convertedDealId ?? (await convertLeadToDeal(lead.id, "HO", "FL"));
  await attachSourceText(dealId, filename, text);
  revalidatePath(`/leads/${lead.id}`);
  revalidatePath(`/deals/${dealId}`);
  redirect(`/deals/${dealId}`);
}

async function attachSourceText(dealId: string, filename: string, text: string) {
  const [risk] = await db.select().from(risks).where(eq(risks.dealId, dealId));
  const id = randomUUID();
  const storagePath = path.join(DEFAULT_TENANT_ID, dealId, `${id}-${filename}`);
  const abs = path.join(uploadRoot, storagePath);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, text, "utf8");
  await db.insert(documents).values({
    id,
    tenantId: DEFAULT_TENANT_ID,
    riskId: risk?.id,
    dealId,
    filename,
    mimeType: "text/plain",
    storagePath,
    docType: "dec",
    slot: "source_doc",
    status: "uploaded",
  });
}

export async function uploadDealSlot(formData: FormData) {
  const dealId = str(formData, "dealId");
  const riskId = str(formData, "riskId") || null;
  const policyId = str(formData, "policyId") || null;
  const docType = str(formData, "docType") || (str(formData, "slot") === "quote_pdf" ? "quote_pdf" : "other");
  const slot =
    str(formData, "slot") ||
    (docType === "signed_app" ? "signed_app" : docType === "quote_pdf" || docType === "quote" ? "quote_pdf" : "source_doc");
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return;
  const id = randomUUID();
  const storagePath = path.join(DEFAULT_TENANT_ID, dealId || "policy", `${id}-${file.name}`);
  const abs = path.join(uploadRoot, storagePath);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, Buffer.from(await file.arrayBuffer()));
  await db.insert(documents).values({
    id,
    tenantId: DEFAULT_TENANT_ID,
    riskId,
    dealId: dealId || null,
    policyId,
    filename: file.name,
    mimeType: file.type || "application/octet-stream",
    storagePath,
    docType,
    slot,
    status: "uploaded",
  });
  if (dealId) revalidatePath(`/deals/${dealId}`);
  if (policyId) revalidatePath(`/policies/${policyId}`);
}

export async function finalizeQuoteResults(formData: FormData) {
  const dealId = str(formData, "dealId");
  const rows = await db
    .select()
    .from(quotes)
    .where(eq(quotes.dealId, dealId));
  const { carriers } = await import("@/lib/db/schema");
  const named = await Promise.all(
    rows.map(async (quote) => {
      const [carrier] = await db.select().from(carriers).where(eq(carriers.id, quote.carrierId));
      return {
        carrierName: carrier?.name ?? "Carrier",
        premium: quote.premium,
        bindable: quote.bindable,
      };
    }),
  );
  const { deals } = await import("@/lib/db/schema");
  await db
    .update(deals)
    .set({
      quoteResultsNote: buildQuoteResultsNote(named),
      pipelineStage: "comparing",
      updatedAt: new Date(),
    })
    .where(eq(deals.id, dealId));
  revalidatePath(`/deals/${dealId}`);
}

export async function fillQuoteSheetBlanks(formData: FormData) {
  const dealId = str(formData, "dealId");
  const [risk] = await db.select().from(risks).where(eq(risks.dealId, dealId));
  const fields = risk
    ? await db.select().from(extractedFields).where(eq(extractedFields.riskId, risk.id))
    : [];
  const line = str(formData, "line") || "home";
  const [sheet] =
    (
      await db
        .select()
        .from(quoteSheets)
        .where(
          and(
            eq(quoteSheets.tenantId, DEFAULT_TENANT_ID),
            eq(quoteSheets.dealId, dealId),
            eq(quoteSheets.line, line),
          ),
        )
    ) ?? [];
  const current = sheet?.values ?? emptySheetValues();
  const filled = fillSheetBlanks(
    current,
    fields.map((field) => ({
      fieldKey: field.fieldKey,
      normalizedValue: field.normalizedValue,
      confidence: Number(field.confidence),
      flagged: field.flagged,
    })),
  );
  if (sheet) {
    await db
      .update(quoteSheets)
      .set({ values: filled.values, updatedAt: new Date() })
      .where(eq(quoteSheets.id, sheet.id));
  } else {
    await db.insert(quoteSheets).values({
      tenantId: DEFAULT_TENANT_ID,
      dealId,
      line,
      values: filled.values,
    });
  }
  revalidatePath(`/deals/${dealId}`);
}

export async function ensureLeadNotes(leadId: string, extra: string) {
  const [lead] = await db.select().from(leads).where(eq(leads.id, leadId));
  if (!lead) return;
  if (lead.notes?.includes(extra)) return;
  await db
    .update(leads)
    .set({ notes: [lead.notes, extra].filter(Boolean).join("\n"), updatedAt: new Date() })
    .where(eq(leads.id, leadId));
}
