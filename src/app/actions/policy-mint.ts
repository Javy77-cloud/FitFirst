"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { persistFile } from "@/app/actions/documents";
import { findMatchingContact } from "@/app/actions/crm";
import { findOrCreateLocationFromAddress } from "@/app/actions/locations";
import { currentDeskSession } from "@/lib/auth/session";
import { readStoredFile } from "@/lib/files/object-store";
import { db } from "@/lib/db";
import {
  alerts,
  contacts,
  deals,
  documents,
  extractedFields,
  leads,
  policies,
  policyAdditionalInterests,
  policyInstallments,
  quoteSheets,
  quotes,
  reviewTasks,
  risks,
  users,
} from "@/lib/db/schema";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { parseAddressParts } from "@/lib/extraction/gemini/map";
import { insuranceFamilyFromPolicy } from "@/lib/desk/policy-family";
import { dealProductDef, inferDealProducts, parseDealProduct, type DealProductId } from "@/lib/deals/deal-products";
import {
  parseProductStages,
  productStageFor,
  setProductStage,
} from "@/lib/deals/product-stages";
import { parseShopFlow } from "@/lib/deals/shop-flow";
import { persistDealShopFlow } from "@/lib/deals/shop-flow-persist";
import { moveDealToStage } from "@/app/actions/pipeline";
import { clearCreatePolicyPrompt } from "@/app/actions/declaration-prompt";
import { ensureWorkItem } from "@/lib/work-queue/service";
import {
  allProductsClosedForDealWon,
  markProductIssuedDone,
  mintAdminNotifyDue,
  MINT_ADMIN_NOTIFY_KIND,
  MINT_CONFIRM_TASK_KIND,
} from "@/lib/policy/dec-prompt";
import { extractWithGeminiPdf } from "@/lib/extraction/gemini";
import { loadGeminiApiKey } from "@/lib/extraction/gemini/key";
import { writeCrmSignalsSafe } from "@/lib/crm/signals";
import { withFlash } from "@/lib/flash";
import {
  buildMintFields,
  canPublishMint,
  confirmMintField,
  evaluateMintGate,
  findDealDeclaration,
  mintExtractUseful,
  mintFieldPolicyPatch,
  mintLooksThin,
  mintPayloadAfterReread,
  parseMintPayload,
  policyCanRereadMint,
  policyForProduct,
  policyMintUnpublished,
  type MintField,
  type MintIdentity,
  type MintPayload,
} from "@/lib/policy/mint-gate";
import { recordPolicyFieldChanges } from "@/lib/policy/record-changes";
import { contactFieldsFromSheet } from "@/lib/wire/match-party";

function dateOrFallback(raw: string | null | undefined, fallback: Date) {
  if (!raw) return fallback;
  const d = new Date(`${raw}T12:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? fallback : d;
}

function fieldValue(fields: MintField[], key: string) {
  return fields.find((row) => row.key === key)?.value?.trim() || "";
}

function sheetValue(
  sheet: Record<string, { value?: string | null } | undefined> | null | undefined,
  ...keys: string[]
) {
  if (!sheet) return "";
  for (const key of keys) {
    const hit = String(sheet[key]?.value ?? "").trim();
    if (hit) return hit;
  }
  return "";
}

async function applyMintBookExtras(input: {
  policyId: string;
  contactId: string | null;
  accountId: string | null;
  riskId: string | null;
  fields: MintField[];
  premium?: string | null;
}) {
  const patch = mintFieldPolicyPatch(input.fields);
  const address = patch.premisesAddress || "";
  const parts = address ? parseAddressParts(address) : { street: "" };
  if (input.contactId || input.accountId) {
    const loc = await findOrCreateLocationFromAddress({
      contactId: input.contactId,
      accountId: input.accountId,
      street: parts.street || address,
      city: parts.city,
      state: parts.state,
      zip: parts.zip,
    });
    if (loc) {
      await db
        .update(policies)
        .set({
          locationId: loc.id,
          premisesAddress: loc.street || loc.address1 || address || null,
          premisesCity: loc.city ?? parts.city ?? null,
          premisesState: loc.state ?? parts.state ?? null,
          premisesZip: loc.zip ?? parts.zip ?? null,
          updatedAt: new Date(),
        })
        .where(eq(policies.id, input.policyId));
    }
  }

  if (patch.roofYear && input.riskId) {
    await db
      .update(risks)
      .set({ roofYear: patch.roofYear, updatedAt: new Date() })
      .where(eq(risks.id, input.riskId));
  }

  if (patch.mortgagee) {
    const existing = await db
      .select({ id: policyAdditionalInterests.id })
      .from(policyAdditionalInterests)
      .where(
        and(
          eq(policyAdditionalInterests.tenantId, DEFAULT_TENANT_ID),
          eq(policyAdditionalInterests.policyId, input.policyId),
          eq(policyAdditionalInterests.kind, "mortgagee"),
        ),
      );
    if (!existing.length) {
      await db.insert(policyAdditionalInterests).values({
        tenantId: DEFAULT_TENANT_ID,
        policyId: input.policyId,
        kind: "mortgagee",
        name: patch.mortgagee,
      });
    }
  }

  if (patch.nextDue) {
    const due = dateOrFallback(patch.nextDue, new Date());
    const existingDue = await db
      .select({ id: policyInstallments.id })
      .from(policyInstallments)
      .where(
        and(
          eq(policyInstallments.tenantId, DEFAULT_TENANT_ID),
          eq(policyInstallments.policyId, input.policyId),
        ),
      );
    if (!existingDue.length) {
      await db.insert(policyInstallments).values({
        tenantId: DEFAULT_TENANT_ID,
        policyId: input.policyId,
        billType: "agency_bill",
        status: "scheduled",
        amount: patch.premium || input.premium || "0",
        dueOn: due,
        notes: patch.paymentMethod ? `Payment method: ${patch.paymentMethod}` : "From declaration",
      });
    }
  }
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
    issuedDone?: boolean;
  },
) {
  const deal = await loadDeal(dealId);
  if (!deal) return;
  const saved = parseShopFlow(deal.shopFlow);
  const stages = parseProductStages(saved.productStages);
  const next = setProductStage(stages, product, patch);
  await persistDealShopFlow(dealId, { ...saved, productStages: next });
}

function mapExtractedRows(
  rows: readonly {
    fieldKey: string;
    normalizedValue?: string | null;
    rawValue?: string | null;
    confidence?: number | string | null;
    flagged?: boolean | null;
  }[],
) {
  return rows.map((row) => ({
    fieldKey: row.fieldKey,
    normalizedValue: row.normalizedValue,
    rawValue: row.rawValue,
    confidence: Number(row.confidence ?? 0),
    flagged: row.flagged,
  }));
}

async function persistMintExtractedFields(
  documentId: string,
  riskId: string | null,
  rows: readonly {
    fieldKey: string;
    normalizedValue?: string | null;
    rawValue?: string | null;
    confidence: number;
    flagged: boolean;
  }[],
) {
  await db.delete(extractedFields).where(eq(extractedFields.documentId, documentId));
  if (!rows.length) return;
  await db.insert(extractedFields).values(
    rows.map((field) => ({
      tenantId: DEFAULT_TENANT_ID,
      documentId,
      riskId,
      fieldKey: field.fieldKey,
      rawValue: field.rawValue || field.normalizedValue || "",
      normalizedValue: field.normalizedValue || field.rawValue || "",
      confidence: field.confidence.toFixed(3),
      flagged: field.flagged,
      appliedToRisk: false,
    })),
  );
}

async function loadGeminiRows(
  docId: string,
  storagePath: string,
  mimeType: string,
  filename: string,
  opts?: { force?: boolean; riskId?: string | null },
) {
  const existing = await db
    .select()
    .from(extractedFields)
    .where(and(eq(extractedFields.tenantId, DEFAULT_TENANT_ID), eq(extractedFields.documentId, docId)));
  const cached = mapExtractedRows(existing);
  const cacheOk = mintExtractUseful(cached);
  if (!opts?.force && cacheOk) {
    return cached;
  }

  const key = await loadGeminiApiKey();
  const buffer = key ? await readStoredFile(storagePath) : null;
  if (!key || !buffer) {
    return cacheOk ? cached : [];
  }
  try {
    const gemini = await extractWithGeminiPdf(buffer, "dec", {
      apiKey: key,
      mimeType,
      filename,
    });
    if (!gemini.ok) return cacheOk ? cached : [];
    const rows = gemini.result.fields.map((field) => ({
      fieldKey: field.fieldKey,
      normalizedValue: field.normalizedValue,
      rawValue: field.rawValue,
      confidence: field.confidence,
      flagged: field.flagged,
    }));
    if (!rows.length) return cacheOk ? cached : [];
    await persistMintExtractedFields(docId, opts?.riskId ?? null, rows);
    return rows;
  } catch {
    return cacheOk ? cached : [];
  }
}

function mintIdentityFromRecords(input: {
  deal?: typeof deals.$inferSelect | null;
  risk?: {
    address1?: string | null;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
    roofYear?: number | null;
    coverageA?: number | string | null;
  } | null;
  sheet: Record<string, { value?: string | null } | undefined>;
  ownerName?: string | null;
  sessionName?: string | null;
  fallback?: {
    sellingAgency?: string | null;
    producer?: string | null;
    insuranceType?: string | null;
    formType?: string | null;
    premisesAddress?: string | null;
    billingFrequency?: string | null;
  };
}): MintIdentity {
  const propertyLine = [
    input.risk?.address1,
    [input.risk?.city, input.risk?.state, input.risk?.zip].filter(Boolean).join(", "),
  ]
    .filter(Boolean)
    .join(", ");
  return {
    namedInsured: input.deal?.primaryNamedInsured ?? null,
    mailingAddress: input.risk?.address1 ?? input.fallback?.premisesAddress ?? null,
    propertyAddress:
      input.deal?.propertyOneliner || propertyLine || input.fallback?.premisesAddress || null,
    sellingAgency: sheetValue(input.sheet, "selling_agency") || input.fallback?.sellingAgency || null,
    producer: input.ownerName || input.sessionName || input.fallback?.producer || null,
    insuranceType:
      insuranceFamilyFromPolicy({
        lineOfBusiness: input.deal?.lineOfBusiness,
        policySubType: input.deal?.policySubType,
      }) ||
      input.fallback?.insuranceType ||
      null,
    form: input.deal?.quotingForm || input.deal?.policySubType || input.fallback?.formType || null,
    roofYear: input.risk?.roofYear ?? (sheetValue(input.sheet, "roof_year", "roof_age") || null),
    mortgagee: sheetValue(input.sheet, "mortgagee_name", "mortgagee") || null,
    billingFrequency:
      sheetValue(input.sheet, "billing_frequency", "premium_frequency", "premium_mode") ||
      input.fallback?.billingFrequency ||
      null,
    paymentMethod: sheetValue(input.sheet, "payment_method", "pay_plan") || null,
    renewalDate: sheetValue(input.sheet, "renewal_date") || null,
    nextDue: sheetValue(input.sheet, "next_due", "next_payment_due") || null,
    coverageA:
      input.deal?.coverageAmount ??
      input.risk?.coverageA ??
      (sheetValue(input.sheet, "coverage_a", "dwelling") || null),
  };
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
  const existingIsBook =
    existing &&
    !policyMintUnpublished(existing) &&
    existing.status !== "unpublished" &&
    !policyCanRereadMint(existing) &&
    !mintLooksThin(parseMintPayload(existing.mintPayload));
  if (existingIsBook) {
    await db
      .update(documents)
      .set({ policyId: existing.id, dealId })
      .where(eq(documents.id, gate.dec.id));
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
        { force: true, riskId: riskRows[0]?.id ?? decRow.riskId },
      )
    : [];
  const risk = riskRows[0];
  const sheetValues = (sheet?.values ?? {}) as Record<string, { value?: string | null } | undefined>;
  const [owner] = deal.ownerId
    ? await db.select({ name: users.name }).from(users).where(eq(users.id, deal.ownerId))
    : [];
  const session = await currentDeskSession();
  const fields = buildMintFields({
    gemini: geminiRows,
    sheet: sheetValues,
    sold: {
      premium: quote.premium,
      coverageA: quote.coverageA,
      hurricaneDeductible: quote.hurricaneDeductible,
      aopDeductible: quote.aopDeductible,
    },
    identity: mintIdentityFromRecords({
      deal,
      risk,
      sheet: sheetValues,
      ownerName: owner?.name,
      sessionName: session.name,
    }),
  });

  const contactId = await ensureDealContact(deal);
  const booked = mintFieldPolicyPatch(fields);
  const effective = dateOrFallback(fieldValue(fields, "effective_date"), new Date());
  const expiration = dateOrFallback(
    fieldValue(fields, "expiration_date"),
    new Date(effective.getTime() + 365 * 24 * 60 * 60 * 1000),
  );
  const premium = booked.premium || quote.premium || null;
  const coverageA = booked.coverageA || quote.coverageA || risk?.coverageA || null;
  const policyNumber = booked.policyNumber || `FF-MINT-${Date.now().toString().slice(-8)}`;
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
    mintedAt: new Date().toISOString(),
  };

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
    formType: booked.formType || def.quotingForm,
    policySubType: def.quotingForm,
    insuranceType: booked.insuranceType || insuranceFamilyFromPolicy({
      lineOfBusiness: def.lob,
      policySubType: def.quotingForm,
    }),
    sellingAgency: booked.sellingAgency,
    producer: booked.producer,
    billingFrequency: booked.billingFrequency,
    renewalDate: booked.renewalDate ? dateOrFallback(booked.renewalDate, expiration) : null,
    premisesAddress: booked.premisesAddress || risk?.address1 || null,
    premisesCity: risk?.city ?? null,
    premisesState: risk?.state ?? null,
    premisesZip: risk?.zip ?? null,
    ownerId: deal.ownerId ?? null,
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

  await applyMintBookExtras({
    policyId,
    contactId,
    accountId: deal.accountId,
    riskId: risk?.id ?? null,
    fields,
    premium,
  });

  await db
    .update(documents)
    .set({ policyId, dealId, contactId, docType: gate.dec.docType || "dec" })
    .where(eq(documents.id, gate.dec.id));

  await markMintStatus(dealId, product, {
    stage: "policy_issued",
    policyId,
    mintStatus: "unpublished",
    selectedQuoteIds,
    issuedDone: false,
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
    title: `Confirm declaration · ${def.label} · ${deal.title}`,
    body: `${session.name || "Agent"} issued ${def.label} from the declaration. Confirm low-confidence fields before publish.`,
    entityType: "policy",
    entityId: policyId,
    dealId,
    policyId,
    taskKind: MINT_CONFIRM_TASK_KIND,
    dueInDays: 0,
    createTask: true,
  });
  await ensureWorkItem(policyId).catch(() => null);
  await clearCreatePolicyPrompt(dealId).catch(() => null);

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
  const booked = mintFieldPolicyPatch(fields);
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
  if (key === "insurance_type" && value) patch.insuranceType = value;
  if (key === "mailing_address" && value) patch.premisesAddress = value;
  if (key === "selling_agency" && value) patch.sellingAgency = value;
  if (key === "producer" && value) patch.producer = value;
  if (key === "billing_frequency" && value) patch.billingFrequency = value;
  if (key === "renewal_date" && value) patch.renewalDate = dateOrFallback(value, policy.renewalDate ?? policy.expirationDate);
  await db.update(policies).set(patch).where(eq(policies.id, policyId));
  await applyMintBookExtras({
    policyId,
    contactId: policy.contactId,
    accountId: policy.accountId,
    riskId: policy.riskId,
    fields,
    premium: booked.premium || policy.premium,
  });
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
      const deal = await loadDeal(policy.dealId);
      if (deal) {
        const saved = parseShopFlow(deal.shopFlow);
        const nextStages = markProductIssuedDone(saved.productStages, product, { policyId });
        await persistDealShopFlow(policy.dealId, { ...saved, productStages: nextStages });
        const products = inferDealProducts({
          shopProducts: deal.shopProducts,
          shopLines: deal.shopLines,
          lineOfBusiness: deal.lineOfBusiness,
          quotingLine: deal.quotingLine,
          quotingForm: deal.quotingForm,
          policySubType: deal.policySubType,
        });
        if (allProductsClosedForDealWon(products, nextStages)) {
          await moveDealToStage({
            dealId: policy.dealId,
            pipelineSlug: "won-lost",
            stageSlug: "closed_won",
            allowLate: true,
          });
        }
      } else {
        await markMintStatus(policy.dealId, product, {
          stage: "closed_won",
          policyId,
          mintStatus: "published",
        });
      }
    }
  }
  await db
    .update(reviewTasks)
    .set({ status: "done", completedAt: new Date() })
    .where(
      and(
        eq(reviewTasks.tenantId, DEFAULT_TENANT_ID),
        eq(reviewTasks.policyId, policyId),
        eq(reviewTasks.kind, MINT_CONFIRM_TASK_KIND),
      ),
    )
    .catch(() => null);
  revalidatePath(`/policies/${policyId}`);
  revalidatePath("/policies");
  if (policy.dealId) revalidatePath(`/deals/${policy.dealId}`);
  return { ok: true as const };
}

/** Stub hook — Admin ping only after 72h still unpublished. */
export async function notifyAdminUnpublishedMint(policyId: string, now = new Date()) {
  const [policy] = await db
    .select()
    .from(policies)
    .where(and(eq(policies.tenantId, DEFAULT_TENANT_ID), eq(policies.id, policyId)));
  if (!policy) return { ok: false as const, notified: false };
  const payload = parseMintPayload(policy.mintPayload);
  if (!mintAdminNotifyDue({ status: payload?.status ?? policy.status, mintedAt: payload?.mintedAt, adminNotifiedAt: payload?.adminNotifiedAt, now })) {
    return { ok: true as const, notified: false };
  }
  await db.insert(alerts).values({
    tenantId: DEFAULT_TENANT_ID,
    kind: MINT_ADMIN_NOTIFY_KIND,
    title: `Unpublished mint · ${policy.policyNumber}`,
    body: "Policy is still unpublished 72 hours after declaration mint. Agent confirm queue is outstanding.",
    severity: "warning",
    entityType: "policy",
    entityId: policyId,
  });
  if (payload) {
    await db
      .update(policies)
      .set({
        mintPayload: { ...payload, adminNotifiedAt: now.toISOString() },
        updatedAt: now,
      })
      .where(eq(policies.id, policyId));
  }
  return { ok: true as const, notified: true };
}

export async function rereadMintedDeclaration(formData: FormData) {
  const policyId = String(formData.get("policyId") ?? "").trim();
  if (!policyId) return { ok: false as const, reason: "invalid" as const };
  const [policy] = await db
    .select()
    .from(policies)
    .where(and(eq(policies.tenantId, DEFAULT_TENANT_ID), eq(policies.id, policyId)));
  if (!policy || !policyCanRereadMint(policy)) {
    return { ok: false as const, reason: "missing" as const };
  }

  const prev = parseMintPayload(policy.mintPayload);
  const deal = policy.dealId ? await loadDeal(policy.dealId) : null;
  const [docs, quoteRows, sheetRows, riskRows] = await Promise.all([
    policy.dealId
      ? db
          .select()
          .from(documents)
          .where(and(eq(documents.tenantId, DEFAULT_TENANT_ID), eq(documents.dealId, policy.dealId)))
      : policy.sourceDocumentId
        ? db
            .select()
            .from(documents)
            .where(and(eq(documents.tenantId, DEFAULT_TENANT_ID), eq(documents.id, policy.sourceDocumentId)))
        : Promise.resolve([]),
    policy.dealId
      ? db
          .select()
          .from(quotes)
          .where(and(eq(quotes.tenantId, DEFAULT_TENANT_ID), eq(quotes.dealId, policy.dealId)))
      : Promise.resolve([]),
    policy.dealId
      ? db.select().from(quoteSheets).where(eq(quoteSheets.dealId, policy.dealId))
      : Promise.resolve([]),
    policy.dealId
      ? db.select().from(risks).where(eq(risks.dealId, policy.dealId))
      : Promise.resolve([]),
  ]);

  const decId = prev?.decDocumentId || policy.sourceDocumentId || "";
  const dec =
    docs.find((row) => row.id === decId) ??
    findDealDeclaration(docs) ??
    (decId
      ? (
          await db
            .select()
            .from(documents)
            .where(and(eq(documents.tenantId, DEFAULT_TENANT_ID), eq(documents.id, decId)))
        )[0]
      : null);
  if (!dec?.storagePath) return { ok: false as const, reason: "need_dec" as const };

  const quote =
    quoteRows.find((row) => row.id === (prev?.soldBasis.quoteId || policy.sourceQuoteId)) ??
    quoteRows[0];
  const product = parseDealProduct(prev?.product || policy.sourceProduct) ?? null;
  const def = product ? dealProductDef(product) : null;
  const sheet =
    (def && sheetRows.find((row) => row.line === def.shopLine)) ??
    sheetRows.find((row) => row.line === "home") ??
    sheetRows[0];
  const risk = riskRows[0];
  const sheetValues = (sheet?.values ?? {}) as Record<string, { value?: string | null } | undefined>;
  const [owner] = deal?.ownerId
    ? await db.select({ name: users.name }).from(users).where(eq(users.id, deal.ownerId))
    : [];
  const session = await currentDeskSession();

  const geminiRows = await loadGeminiRows(
    dec.id,
    dec.storagePath,
    dec.mimeType ?? "application/pdf",
    dec.filename ?? "declaration.pdf",
    { force: true, riskId: risk?.id ?? null },
  );

  const fields = buildMintFields({
    gemini: geminiRows,
    sheet: sheetValues,
    sold: {
      premium: quote?.premium ?? prev?.soldBasis.premium,
      coverageA: quote?.coverageA ?? prev?.soldBasis.coverageA,
      hurricaneDeductible: quote?.hurricaneDeductible ?? prev?.soldBasis.hurricaneDeductible,
      aopDeductible: quote?.aopDeductible ?? prev?.soldBasis.aopDeductible,
    },
    identity: mintIdentityFromRecords({
      deal,
      risk,
      sheet: sheetValues,
      ownerName: owner?.name,
      sessionName: session.name,
      fallback: {
        sellingAgency: policy.sellingAgency,
        producer: policy.producer,
        insuranceType: policy.insuranceType,
        formType: policy.formType,
        premisesAddress: policy.premisesAddress,
        billingFrequency: policy.billingFrequency,
      },
    }),
  });

  const booked = mintFieldPolicyPatch(fields);
  const payload = mintPayloadAfterReread({
    soldBasis: {
      quoteId: quote?.id || prev?.soldBasis.quoteId || policy.sourceQuoteId || "",
      carrierId: quote?.carrierId ?? prev?.soldBasis.carrierId ?? policy.carrierId,
      premium: quote?.premium ?? prev?.soldBasis.premium ?? null,
      coverageA: quote?.coverageA ?? prev?.soldBasis.coverageA ?? null,
      hurricaneDeductible: quote?.hurricaneDeductible ?? prev?.soldBasis.hurricaneDeductible ?? null,
      aopDeductible: quote?.aopDeductible ?? prev?.soldBasis.aopDeductible ?? null,
    },
    fields,
    decDocumentId: dec.id,
    decFilename: dec.filename,
    product: product ?? prev?.product ?? policy.sourceProduct,
  });
  const premium = booked.premium || quote?.premium || policy.premium || null;
  const coverageA = booked.coverageA || quote?.coverageA || policy.coverageA || null;

  await db
    .update(policies)
    .set({
      status: "unpublished",
      publishedAt: null,
      premium,
      coverageA,
      formType: booked.formType || policy.formType,
      insuranceType: booked.insuranceType || policy.insuranceType,
      sellingAgency: booked.sellingAgency || policy.sellingAgency,
      producer: booked.producer || policy.producer,
      billingFrequency: booked.billingFrequency || policy.billingFrequency,
      renewalDate: booked.renewalDate
        ? dateOrFallback(booked.renewalDate, policy.renewalDate ?? policy.expirationDate)
        : policy.renewalDate,
      premisesAddress: booked.premisesAddress || policy.premisesAddress,
      sourceDocumentId: dec.id,
      mintPayload: payload,
      updatedAt: new Date(),
    })
    .where(eq(policies.id, policyId));

  await applyMintBookExtras({
    policyId,
    contactId: policy.contactId,
    accountId: policy.accountId,
    riskId: policy.riskId ?? risk?.id ?? null,
    fields,
    premium,
  });

  if (deal && product) {
    await markMintStatus(deal.id, product, {
      stage: "policy_issued",
      policyId,
      mintStatus: "unpublished",
      issuedDone: false,
    });
  }

  await db
    .update(reviewTasks)
    .set({ status: "open", completedAt: null })
    .where(
      and(
        eq(reviewTasks.tenantId, DEFAULT_TENANT_ID),
        eq(reviewTasks.policyId, policyId),
        eq(reviewTasks.kind, MINT_CONFIRM_TASK_KIND),
      ),
    )
    .catch(() => null);
  await writeCrmSignalsSafe({
    kind: "stage_moved",
    title: `Re-read declaration · ${policy.policyNumber}`,
    body: `${session.name || "Agent"} re-read the declaration. Confirm the proposed values before publish.`,
    entityType: "policy",
    entityId: policyId,
    dealId: policy.dealId,
    policyId,
    taskKind: MINT_CONFIRM_TASK_KIND,
    dueInDays: 0,
    createTask: true,
  });

  revalidatePath(`/policies/${policyId}`);
  revalidatePath("/policies");
  if (policy.dealId) revalidatePath(`/deals/${policy.dealId}`);
  redirect(withFlash(`/policies/${policyId}`, "declaration-reread"));
}
