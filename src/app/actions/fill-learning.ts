"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { currentDeskSession } from "@/lib/auth/session";
import { DEFAULT_TENANT_ID, SHOP_LINES, type ShopLine } from "@/lib/domain";
import { db } from "@/lib/db";
import { deals, fillLearningLogs, quoteSheets } from "@/lib/db/schema";
import { isFillLearningDocType } from "@/lib/fill-learning/doc-types";
import { DEAL_ID } from "@/lib/fixtures/ids";
import { isUuid } from "@/lib/ids";
import { emptySheetValues } from "@/lib/quote-sheet/catalog";
import { flashAction } from "@/lib/flash-action";

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function isShopLine(value: string): value is ShopLine {
  return (SHOP_LINES as readonly string[]).includes(value);
}

export async function saveFillLearningCorrection(formData: FormData) {
  const dealId = str(formData, "dealId");
  const fieldKey = str(formData, "fieldKey");
  const docType = str(formData, "docType");
  const extractedValue = str(formData, "extractedValue");
  const correctedValue = str(formData, "correctedValue");
  const note = str(formData, "note");
  const carrierId = str(formData, "carrierId");
  const lineRaw = str(formData, "line") || "home";

  if (!isUuid(dealId)) throw new Error("Deal is required.");
  if (!fieldKey) throw new Error("Field is required.");
  if (!isFillLearningDocType(docType)) throw new Error("Pick the source document type.");
  if (!correctedValue) throw new Error("Enter the corrected value.");
  if (!isShopLine(lineRaw)) throw new Error("Unknown line");

  if (dealId === DEAL_ID && fieldKey === "coverage_a") {
    throw new Error("Ana Dib Coverage A stays $321,000. Do not remap it.");
  }

  const [deal] = await db
    .select()
    .from(deals)
    .where(and(eq(deals.tenantId, DEFAULT_TENANT_ID), eq(deals.id, dealId)));
  if (!deal) throw new Error("Deal not found");

  const session = await currentDeskSession();
  const correctedBy = session.name?.trim() || session.email || "Desk";

  const [sheet] = await db
    .select()
    .from(quoteSheets)
    .where(
      and(
        eq(quoteSheets.tenantId, DEFAULT_TENANT_ID),
        eq(quoteSheets.dealId, dealId),
        eq(quoteSheets.line, lineRaw),
      ),
    );

  const values = { ...(sheet?.values ?? emptySheetValues(lineRaw)) };
  const current = values[fieldKey];
  if (fieldKey === "coverage_a" && current?.source === "javy") {
    throw new Error("Javy-tested Coverage A is locked.");
  }

  await db.insert(fillLearningLogs).values({
    tenantId: DEFAULT_TENANT_ID,
    dealId,
    docType,
    fieldKey,
    extractedValue,
    correctedValue,
    correctedBy,
    correctedByUserId: session.userId,
    note: note || null,
    carrierId: isUuid(carrierId) ? carrierId : null,
    shopLine: lineRaw,
  });

  values[fieldKey] = {
    value: correctedValue,
    status: "confirmed",
    source: "agent",
    sourceLabel: `Fill learning · ${docType}`,
  };

  if (sheet) {
    await db
      .update(quoteSheets)
      .set({ values, updatedAt: new Date() })
      .where(eq(quoteSheets.id, sheet.id));
  } else {
    await db.insert(quoteSheets).values({
      tenantId: DEFAULT_TENANT_ID,
      dealId,
      line: lineRaw,
      values,
    });
  }

  revalidatePath(`/deals/${dealId}`);
  revalidatePath("/logs/fill-learning");
  revalidatePath("/logs");
  flashAction(`/deals/${dealId}`, "Correction saved");
}
