"use server";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { persistFile } from "@/app/actions/documents";
import { findMatchingContact } from "@/app/actions/crm";
import { currentDeskSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import {
  contacts,
  deals,
  documents,
  extractedFields,
  leads,
  policies,
  quoteSheets,
  quotes,
  risks,
} from "@/lib/db/schema";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { dealProductDef, parseDealProduct, type DealProductId } from "@/lib/deals/deal-products";
import {
  parseProductStages,
  productStageFor,
  setProductStage,
} from "@/lib/deals/product-stages";
import { parseShopFlow } from "@/lib/deals/shop-flow";
import { persistDealShopFlow } from "@/lib/deals/shop-flow-persist";
import { extractWithGeminiPdf } from "@/lib/extraction/gemini";
import { loadGeminiApiKey } from "@/lib/extraction/gemini/key";
import { writeCrmSignalsSafe } from "@/lib/crm/signals";
import {
  buildMintFields,
  canPublishMint,
  confirmMintField,
  evaluateMintGate,
  findDealDeclaration,
  parseMintPayload,
  policyForProduct,
  policyMintUnpublished,
  type MintField,
  type MintPayload,
} from "@/lib/policy/mint-gate";
import { recordPolicyFieldChanges } from "@/lib/policy/record-changes";
import { contactFieldsFromSheet } from "@/lib/wire/match-party";

const uploadRoot = process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");

function dateOrFallback(raw: string | null | undefined, fallback: Date) {
  if (!raw) return fallback;
  const d = new Date(`${raw}T12:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? fallback : d;
}

function fieldValue(fields: MintField[], key: string) {
  return fields.find((row) => row.key === key)?.value?.trim() || "";
}

async function loadDeal(dealId: string) {
  const [deal] = await db
    .select()
    .from(deals)
    .where(and(eq(deals.id, dealId), eq(deals.tenantId, DEFAULT_TENANT_ID)));
  return deal ?? null;
}

async function markMintStatus(
  dealId: string,
  product: DealProductId,
  patch: {
    stage?: string;
    policyId?: string | null;
    mintStatus?: "creating" | "unpublished" | "published" | null;
    selectedQuoteIds?: string[];
  },
) {
  const deal = await loadDeal(dealId);
  if (!deal) return;
  const saved = parseShopFlow(deal.shopFlow);
  const stages = parseProductStages(saved.productStages);
  const next = setProductStage(stages, product, patch);
  await persistDealShopFlow(dealId, { ...saved, productStages: next });
}

async function loadGeminiRows(docId: string, storagePath: string, mimeType: string, filename: string) {
  const existing = await db
    .select()
    .from(extractedFields)
    .where(and(eq(extractedFields.tenantId, DEFAULT_TENANT_ID), eq(extractedFields.documentId, docId)));
  if (existing.length) {
    return existing.map((row) => ({
      fieldKey: row.fieldKey,
      normalizedValue: row.normalizedValue,
      rawValue: row.rawValue,
      confidence: Number(row.confidence ?? 0),
      flagged: row.flagged,
    }));
  }

  const key = await loadGeminiApiKey();
  if (!key) return [];
  let buffer: Buffer;
  try {
    buffer = await readFile(path.join(uploadRoot, storagePath));
  } catch {
    return [];
  }
  try {
    const gemini = await extractWithGeminiPdf(buffer, "dec", {
      apiKey: key,
      mimeType,
      filename,
    });
    if (!gemini.ok) return [];
    return gemini.result.fields.map((field) => ({
      fieldKey: field.fieldKey,
      normalizedValue: field.normalizedValue,
      rawValue: field.rawValue,
      confidence: field.confidence,
      flagged: field.flagged,
    }));
  } catch {
    return [];
  }
}

async function ensureDealContact(deal: typeof deals.$inferSelect) {
  if (deal.contactId) return deal.contactId;
  const [lead] = deal.leadId
    ? await db.select().from(leads).where(eq(leads.id, deal.leadId))
    : [];
  const [risk] = await db.select().from(risks).where(eq(risks.dealId, deal.id));
  const [sheet] = await db.select().from(quoteSheets).where(eq(quoteSheets.dealId, deal.id));
  const values = sheet?.values ?? {};
  const named = (deal.primaryNamedInsured || `${lead?.firstName ?? ""} ${lead?.lastName ?? ""}`).trim();
  const parts = named.split(/\s+/).filter(Boolean);
  const identity = {
    firstName: lead?.firstName || parts[0] || "Bound",
    lastName: lead?.lastName || parts.slice(1).join(" ") || "Client",
    email: lead?.email,
    phone: lead?.phone,
  };
  const existing = await findMatchingContact(identity);
  if (existing) {
    await db.update(deals).set({ contactId: existing.id, updatedAt: new Date() }).where(eq(deals.id, deal.id));
    return existing.id;
  }
  const copied = contactFieldsFromSheet(values, {
    ...identity,
    mailingAddress: risk?.address1 || lead?.mailingAddress,
    city: risk?.city || lead?.city,
    state: risk?.state || lead?.state || "FL",
    zip: risk?.zip || lead?.zip,
    dateOfBirth: lead?.dateOfBirth ? String(lead.dateOfBirth) : null,
  });
  const [contact] = await db
    .insert(contacts)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      ...copied,
      source: deal.source || lead?.source || null,
      tenureStart: new Date(),
    })
    .returning();
  await db.update(deals).set({ contactId: contact.id, updatedAt: new Date() }).where(eq(deals.id, deal.id));
  return contact.id;
}

export async function issuePolicyFromDeclaration(input: {
  dealId: string;
  product: string;
  pipelineSlug?: string;
  selectedQuoteIds?: string[];
  surface?: "quotes" | "header" | "chip";
  documentId?: string;
}) {
  const dealId = input.dealId.trim();
  const product = parseDealProduct(input.product);
  if (!dealId || !product) return { ok: false as const, reason: "invalid" as const };
  const deal = await loadDeal(dealId);
  if (!deal) return { ok: false as const, reason: "missing" as const };

  const saved = parseShopFlow(deal.shopFlow);
  const stages = parseProductStages(saved.productStages);
  const current = productStageFor(stages, product, deal.pipelineStageSlug ?? deal.pipelineStage);
  const selectedQuoteIds = (input.selectedQuoteIds?.length
    ? input.selectedQuoteIds
    : current.selectedQuoteIds
  ).filter(Boolean);

  const [docs, quoteRows, sheetRows, dealPolicies, riskRows] = await Promise.all([
    db
      .select()
      .from(documents)
      .where(and(eq(documents.tenantId, DEFAULT_TENANT_ID), eq(documents.dealId, dealId))),
    db
      .select()
      .from(quotes)
      .where(and(eq(quotes.tenantId, DEFAULT_TENANT_ID), eq(quotes.dealId, dealId))),
    db.select().from(quoteSheets).where(eq(quoteSheets.dealId, dealId)),
    db
      .select()
      .from(policies)
      .where(and(eq(policies.tenantId, DEFAULT_TENANT_ID), eq(policies.dealId, dealId))),
    db.select().from(risks).where(eq(risks.dealId, dealId)),
  ]);

  const liveQuoteIds = quoteRows.filter((row) => row.stub !== true).map((row) => row.id);
  const pickedDoc = input.documentId ? docs.find((row) => row.id === input.documentId) : null;
  const gate = evaluateMintGate({
    currentStage: current.stage,
    selectedQuoteIds,
    liveQuoteIds,
    docs: pickedDoc ? [pickedDoc, ...docs] : docs,
    surface: input.surface ?? "quotes",
    mintStatus: current.mintStatus,
  });
  if (!gate.ok) return gate;

  const quote =
    quoteRows.find((row) => selectedQuoteIds.includes(row.id) && row.stub !== true) ??
    quoteRows.find((row) => row.id === selectedQuoteIds[0]);
  if (!quote) return { ok: false as const, reason: "need_quote" as const };

  const def = dealProductDef(product);
  const existing = policyForProduct(dealPolicies, product, def.lob);
  if (existing && !policyMintUnpublished(existing) && existing.publishedAt) {
    await markMintStatus(dealId, product, {
      stage: "policy_issued",
      policyId: existing.id,
      mintStatus: "published",
      selectedQuoteIds,
    });
    return { ok: true as const, policyId: existing.id, alreadyPublished: true };
  }

  await markMintStatus(dealId, product, {
    mintStatus: "creating",
    selectedQuoteIds,
    policyId: existing?.id ?? current.policyId ?? null,
  });

  try {
  const sheet =
    sheetRows.find((row) => row.line === def.shopLine) ??
    sheetRows.find((row) => row.line === "home") ??
    sheetRows[0];
  const decRow = docs.find((row) => row.id === gate.dec.id);
  const geminiRows = decRow?.storagePath
    ? await loadGeminiRows(
        decRow.id,
        decRow.storagePath,
        decRow.mimeType ?? "application/pdf",
        decRow.filename,
      )
    : [];
  const risk = riskRows[0];
  const fields = buildMintFields({
    gemini: geminiRows,
    sheet: sheet?.values ?? {},
    sold: {
      premium: quote.premium,
      coverageA: quote.coverageA,
      hurricaneDeductible: quote.hurricaneDeductible,
      aopDeductible: quote.aopDeductible,
    },
    identity: {
      namedInsured: deal.primaryNamedInsured,
      mailingAddress: risk?.address1 ?? null,
    },
  });

  const contactId = await ensureDealContact(deal);
  const effective = dateOrFallback(fieldValue(fields, "effective_date"), new Date());
  const expiration = dateOrFallback(
    fieldValue(fields, "expiration_date"),
    new Date(effective.getTime() + 365 * 24 * 60 * 60 * 1000),
  );
  const premium = fieldValue(fields, "premium") || quote.premium || null;
  const coverageA = Number(fieldValue(fields, "coverage_a") || quote.coverageA || risk?.coverageA || 0) || null;
  const policyNumber =
    fieldValue(fields, "policy_number") || `FF-MINT-${Date.now().toString().slice(-8)}`;
  const payload: MintPayload = {
    status: "unpublished",
    soldBasis: {
      quoteId: quote.id,
      carrierId: quote.carrierId,
      premium: quote.premium,
      coverageA: quote.coverageA,
      hurricaneDeductible: quote.hurricaneDeductible,
      aopDeductible: quote.aopDeductible,
    },
    fields,
    decDocumentId: gate.dec.id,
    decFilename: gate.dec.filename,
    product,
  };

  const session = await currentDeskSession();
  const values = {
    contactId,
    accountId: deal.accountId,
    dealId,
    riskId: risk?.id ?? null,
    carrierId: quote.carrierId,
    policyNumber,
    lineOfBusiness: def.lob,
    status: "unpublished" as const,
    effectiveDate: effective,
    expirationDate: expiration,
    premium,
    coverageA,
    formType: fieldValue(fields, "form") || def.quotingForm,
    policySubType: def.quotingForm,
    premisesAddress: fieldValue(fields, "mailing_address") || risk?.address1 || null,
    premisesCity: risk?.city ?? null,
    premisesState: risk?.state ?? null,
    premisesZip: risk?.zip ?? null,
    sourceQuoteId: quote.id,
    sourceDocumentId: gate.dec.id,
    sourceProduct: product,
    publishedAt: null as Date | null,
    mintPayload: payload,
    updatedAt: new Date(),
  };

  let policyId = existing?.id ?? current.policyId ?? null;
  if (policyId) {
    await db.update(policies).set(values).where(eq(policies.id, policyId));
  } else {
    const [created] = await db
      .insert(policies)
      .values({
        tenantId: DEFAULT_TENANT_ID,
        ...values,
      })
      .returning();
    policyId = created.id;
    await recordPolicyFieldChanges({
      policyId,
      before: { status: null, policyNumber: null, premium: null },
      after: { status: "unpublished", policyNumber, premium },
      source: "mint",
      actor: { id: session.userId || null, name: session.name || "Desk" },
    });
  }

  await db
    .update(documents)
    .set({ policyId, dealId, contactId, docType: gate.dec.docType || "dec" })
    .where(eq(documents.id, gate.dec.id));

  await markMintStatus(dealId, product, {
    stage: "policy_issued",
    policyId,
    mintStatus: "unpublished",
    selectedQuoteIds,
  });

  if (!deal.boundAt) {
    await db
      .update(deals)
      .set({
        boundAt: deal.boundAt ?? new Date(),
        pipelineStage: "policy_issued",
        pipelineStageSlug: "policy_issued",
        updatedAt: new Date(),
      })
      .where(eq(deals.id, dealId));
  } else {
    await db
      .update(deals)
      .set({
        pipelineStage: "policy_issued",
        pipelineStageSlug: "policy_issued",
        updatedAt: new Date(),
      })
      .where(eq(deals.id, dealId));
  }

  await writeCrmSignalsSafe({
    kind: "stage_moved",
    title: `Policy minted · ${def.label} · ${deal.title}`,
    body: `${session.name || "Agent"} issued ${def.label} from the declaration. Confirm low-confidence fields before publish.`,
    entityType: "policy",
    entityId: policyId,
    dealId,
    policyId,
    createTask: false,
  });

  revalidatePath(`/deals/${dealId}`);
  revalidatePath(`/policies/${policyId}`);
  revalidatePath("/policies");
  revalidatePath("/deals");
  return { ok: true as const, policyId };
  } catch (error) {
    await markMintStatus(dealId, product, { mintStatus: null, selectedQuoteIds });
    throw error;
  }
}

export async function uploadDeclarationAndMint(formData: FormData) {
  const dealId = String(formData.get("dealId") ?? "").trim();
  const product = String(formData.get("product") ?? "").trim();
  const file = formData.get("file");
  if (!dealId || !product) return { ok: false as const, reason: "invalid" as const };
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false as const, reason: "need_dec" as const };
  }
  const [risk] = await db.select().from(risks).where(eq(risks.dealId, dealId));
  const doc = await persistFile({
    dealId,
    riskId: risk?.id ?? null,
    filename: file.name,
    mimeType: file.type || "application/pdf",
    buffer: Buffer.from(await file.arrayBuffer()),
    docType: "dec",
    slot: "source_doc",
    tags: ["dec", "mint"],
  });
  if (!doc) return { ok: false as const, reason: "need_dec" as const };
  return issuePolicyFromDeclaration({
    dealId,
    product,
    selectedQuoteIds: formData
      .getAll("quoteId")
      .map((value) => String(value ?? "").trim())
      .filter(Boolean),
    surface: "quotes",
    documentId: doc.id,
  });
}

export async function confirmMintedPolicyField(formData: FormData) {
  const policyId = String(formData.get("policyId") ?? "").trim();
  const key = String(formData.get("key") ?? "").trim();
  const value = String(formData.get("value") ?? "").trim();
  if (!policyId || !key) return { ok: false as const, reason: "invalid" as const };
  const [policy] = await db
    .select()
    .from(policies)
    .where(and(eq(policies.tenantId, DEFAULT_TENANT_ID), eq(policies.id, policyId)));
  if (!policy) return { ok: false as const, reason: "missing" as const };
  const payload = parseMintPayload(policy.mintPayload);
  if (!payload) return { ok: false as const, reason: "invalid" as const };
  const fields = confirmMintField(payload.fields, key, value);
  const next: MintPayload = { ...payload, fields };
  const patch: Record<string, unknown> = {
    mintPayload: next,
    updatedAt: new Date(),
  };
  if (key === "policy_number" && value) patch.policyNumber = value;
  if (key === "premium" && value) patch.premium = value;
  if (key === "coverage_a" && value) patch.coverageA = Number(value.replace(/[$,]/g, "")) || policy.coverageA;
  if (key === "effective_date" && value) patch.effectiveDate = dateOrFallback(value, policy.effectiveDate);
  if (key === "expiration_date" && value) patch.expirationDate = dateOrFallback(value, policy.expirationDate);
  if (key === "form" && value) patch.formType = value;
  if (key === "mailing_address" && value) patch.premisesAddress = value;
  await db.update(policies).set(patch).where(eq(policies.id, policyId));
  revalidatePath(`/policies/${policyId}`);
  return { ok: true as const, remaining: fields.filter((row) => !row.confirmed).length };
}

export async function publishMintedPolicy(formData: FormData) {
  const policyId = String(formData.get("policyId") ?? "").trim();
  if (!policyId) return { ok: false as const, reason: "invalid" as const };
  const [policy] = await db
    .select()
    .from(policies)
    .where(and(eq(policies.tenantId, DEFAULT_TENANT_ID), eq(policies.id, policyId)));
  if (!policy) return { ok: false as const, reason: "missing" as const };
  const payload = parseMintPayload(policy.mintPayload);
  if (!canPublishMint(payload)) return { ok: false as const, reason: "need_confirm" as const };
  const published: MintPayload = { ...payload!, status: "published" };
  await db
    .update(policies)
    .set({
      status: "active",
      publishedAt: new Date(),
      mintPayload: published,
      updatedAt: new Date(),
    })
    .where(eq(policies.id, policyId));
  if (policy.dealId && policy.sourceProduct) {
    const product = parseDealProduct(policy.sourceProduct);
    if (product) {
      await markMintStatus(policy.dealId, product, {
        stage: "policy_issued",
        policyId,
        mintStatus: "published",
      });
    }
  }
  revalidatePath(`/policies/${policyId}`);
  revalidatePath("/policies");
  if (policy.dealId) revalidatePath(`/deals/${policy.dealId}`);
  return { ok: true as const };
}
