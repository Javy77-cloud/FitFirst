"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { carriers, deals, extractedFields, quotes } from "@/lib/db/schema";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { inferDealProducts, parseDealProduct } from "@/lib/deals/deal-products";
import { parseProductStages, productStageFor } from "@/lib/deals/product-stages";
import { parseShopFlow } from "@/lib/deals/shop-flow";
import { persistDealShopFlow } from "@/lib/deals/shop-flow-persist";
import { extractWithGeminiPdf } from "@/lib/extraction/gemini";
import { loadGeminiApiKey } from "@/lib/extraction/gemini/key";
import { readStoredFile } from "@/lib/files/object-store";
import {
  allowCreatePolicyPrompt,
  documentKindFromGeminiJson,
  looksLikeDeclarationFromGemini,
  shouldPromptCreatePolicy,
  type PendingDecPrompt,
} from "@/lib/policy/dec-prompt";
import { parseGeminiResponseText } from "@/lib/extraction/gemini/client";
import { readDecPdfBytes } from "@/lib/policy/load-gemini-rows";

export async function queueCreatePolicyPrompt(input: {
  dealId: string;
  documentId: string;
  carrierName?: string | null;
  product?: string | null;
}) {
  const deal = await loadDeal(input.dealId);
  if (!deal) return null;
  const saved = parseShopFlow(deal.shopFlow);
  const prompt: PendingDecPrompt = {
    documentId: input.documentId,
    carrierName: (input.carrierName ?? "").trim() || "the carrier",
    product: input.product ?? null,
    createdAt: new Date().toISOString(),
  };
  await persistDealShopFlow(input.dealId, { ...saved, pendingDecPrompt: prompt });
  return prompt;
}

export async function clearCreatePolicyPrompt(dealId: string) {
  const deal = await loadDeal(dealId);
  if (!deal) return;
  const saved = parseShopFlow(deal.shopFlow);
  if (!saved.pendingDecPrompt) return;
  await persistDealShopFlow(dealId, { ...saved, pendingDecPrompt: null });
}

export async function dismissCreatePolicyPrompt(formData: FormData) {
  const dealId = String(formData.get("dealId") ?? "").trim();
  if (dealId) await clearCreatePolicyPrompt(dealId);
}

async function loadDeal(dealId: string) {
  const [deal] = await db
    .select()
    .from(deals)
    .where(and(eq(deals.id, dealId), eq(deals.tenantId, DEFAULT_TENANT_ID)));
  return deal ?? null;
}

export async function resolveDeclarationCarrierName(dealId: string, product?: string | null) {
  const deal = await loadDeal(dealId);
  if (!deal) return "the carrier";
  const saved = parseShopFlow(deal.shopFlow);
  const products = inferDealProducts({
    shopProducts: deal.shopProducts,
    shopLines: deal.shopLines,
    lineOfBusiness: deal.lineOfBusiness,
    quotingLine: deal.quotingLine,
    quotingForm: deal.quotingForm,
    policySubType: deal.policySubType,
  });
  const active = parseDealProduct(product ?? "") ?? products[0] ?? null;
  const state = active
    ? productStageFor(parseProductStages(saved.productStages), active, deal.pipelineStage)
    : null;
  const selected = state?.selectedQuoteIds?.[0];
  const quoteRows = await db
    .select({ id: quotes.id, carrierId: quotes.carrierId, stub: quotes.stub })
    .from(quotes)
    .where(and(eq(quotes.tenantId, DEFAULT_TENANT_ID), eq(quotes.dealId, dealId)));
  const quote =
    quoteRows.find((row) => row.id === selected && row.stub !== true) ??
    quoteRows.find((row) => row.stub !== true);
  if (!quote?.carrierId) return "the carrier";
  const [carrier] = await db
    .select({ name: carriers.name })
    .from(carriers)
    .where(and(eq(carriers.tenantId, DEFAULT_TENANT_ID), eq(carriers.id, quote.carrierId)));
  return carrier?.name?.trim() || "the carrier";
}

export async function classifyDeclarationLook(input: {
  documentId: string;
  storagePath?: string | null;
  mimeType?: string | null;
  filename?: string | null;
}): Promise<boolean | "unknown"> {
  const existing = await db
    .select({
      fieldKey: extractedFields.fieldKey,
      normalizedValue: extractedFields.normalizedValue,
      rawValue: extractedFields.rawValue,
    })
    .from(extractedFields)
    .where(
      and(eq(extractedFields.tenantId, DEFAULT_TENANT_ID), eq(extractedFields.documentId, input.documentId)),
    );
  if (existing.length) {
    return looksLikeDeclarationFromGemini({
      ran: true,
      fields: existing,
    });
  }
  const key = await loadGeminiApiKey();
  if (!key) {
    console.error("dec classify: missing Gemini API key", { documentId: input.documentId });
    return "unknown";
  }
  const bytes = await readDecPdfBytes(input.storagePath, readStoredFile);
  if (!bytes.ok) return "unknown";
  try {
    const gemini = await extractWithGeminiPdf(bytes.buffer, "dec", {
      apiKey: key,
      mimeType: input.mimeType ?? "application/pdf",
      filename: input.filename ?? "declaration.pdf",
    });
    const json = gemini.rawText ? parseGeminiResponseText(gemini.rawText) : null;
    return looksLikeDeclarationFromGemini({
      ran: gemini.ok,
      documentKind: documentKindFromGeminiJson(json),
      fields: gemini.result.fields,
      notes: gemini.result.qualityNotes,
      rawText: gemini.rawText,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    console.error("dec classify: Gemini threw", { documentId: input.documentId, message });
    return "unknown";
  }
}

/** Bound / Policy issued only. Open-shop current-policy uploads stay on the risk profile. */
export async function dealAllowsCreatePolicyPrompt(dealId: string, product?: string | null) {
  const deal = await loadDeal(dealId);
  if (!deal) return false;
  const saved = parseShopFlow(deal.shopFlow);
  const id = parseDealProduct(product ?? "");
  const stage = id
    ? productStageFor(parseProductStages(saved.productStages), id, deal.pipelineStage).stage
    : deal.pipelineStage;
  return allowCreatePolicyPrompt({ stage });
}

export async function maybeQueueCreatePolicyPrompt(input: {
  dealId: string;
  docType: string;
  documentId: string;
  storagePath?: string | null;
  mimeType?: string | null;
  filename?: string | null;
  carrierName?: string | null;
  product?: string | null;
  /** Known dec (Rosa forcing case) — skip Gemini reject. */
  force?: boolean;
  /** Bound → Policy issued. Shopping uploads must pass false and are ignored. */
  binding?: boolean;
}): Promise<PendingDecPrompt | null> {
  if (!input.force && input.binding !== true) return null;
  if (!shouldPromptCreatePolicy({ docType: input.docType, looksLikeDec: "unknown" })) {
    return null;
  }
  if (!input.force) {
    const look = await classifyDeclarationLook({
      documentId: input.documentId,
      storagePath: input.storagePath,
      mimeType: input.mimeType,
      filename: input.filename,
    });
    if (!shouldPromptCreatePolicy({ docType: input.docType, looksLikeDec: look })) {
      return null;
    }
  }
  const carrierName = input.carrierName?.trim() || (await resolveDeclarationCarrierName(input.dealId, input.product));
  return queueCreatePolicyPrompt({
    dealId: input.dealId,
    documentId: input.documentId,
    carrierName,
    product: input.product,
  });
}
