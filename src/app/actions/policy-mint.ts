"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { persistFile } from "@/app/actions/documents";
import { findMatchingContact } from "@/app/actions/crm";
import { findOrCreateLocationFromAddress } from "@/app/actions/locations";
import { currentDeskSession } from "@/lib/auth/session";
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
import { insuranceFamilyFromPolicy } from "@/lib/desk/policy-family";
import { parsePropertyYear } from "@/lib/policy/dwelling-facts";
import { splitPremisesAddress, streetOnlyPremises } from "@/lib/policy/premises";
import { dealProductDef, inferDealProducts, parseDealProduct, type DealProductId } from "@/lib/deals/deal-products";
import {
  parseProductStages,
  productStageFor,
  setProductStage,
} from "@/lib/deals/product-stages";
import { parseShopFlow } from "@/lib/deals/shop-flow";
import { persistDealShopFlow } from "@/lib/deals/shop-flow-persist";
import { maybeArchiveDealWhenAllProductsTerminal } from "@/lib/deals/archive-when-terminal";
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
import { readStoredFile } from "@/lib/files/object-store";
import { writeCrmSignalsSafe } from "@/lib/crm/signals";
import { loadGeminiRows, type GeminiMintRow } from "@/lib/policy/load-gemini-rows";
import {
  buildMintFields,
  canPublishMint,
  confirmMintField,
  evaluateMintExtract,
  evaluateMintGate,
  mintFieldPolicyPatch,
  parseMintPayload,
  policyForProduct,
  policyMintUnpublished,
  type MintField,
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
  dealId?: string | null;
  riskId: string | null;
  fields: MintField[];
  premium?: string | null;
  yearBuilt?: number | null;
  roofYear?: number | null;
  construction?: string | null;
  knownCity?: string | null;
  knownState?: string | null;
  knownZip?: string | null;
}) {
  const patch = mintFieldPolicyPatch(input.fields);
  const parts = splitPremisesAddress(patch.premisesAddress, {
    city: patch.premisesCity || input.knownCity,
    state: patch.premisesState || input.knownState,
    zip: patch.premisesZip || input.knownZip,
  });
  const street = parts.street || null;
  const city = parts.city || input.knownCity || null;
  const state = parts.state || input.knownState || null;
  const zip = parts.zip || input.knownZip || null;

  let locationId: string | null = null;
  if ((input.contactId || input.accountId) && street && city && zip) {
    const loc = await findOrCreateLocationFromAddress({
      contactId: input.contactId,
      accountId: input.accountId,
      street,
      city,
      state,
      zip,
    });
    locationId = loc?.id ?? null;
  }

  await db
    .update(policies)
    .set({
      ...(locationId ? { locationId } : {}),
      premisesAddress: street,
      premisesCity: city,
      premisesState: state,
      premisesZip: zip,
      updatedAt: new Date(),
    })
    .where(eq(policies.id, input.policyId));

  const roofYear = input.roofYear ?? patch.roofYear;
  const yearBuilt = input.yearBuilt ?? null;
  const riskPatch: {
    roofYear?: number | null;
    yearBuilt?: number | null;
    construction?: string | null;
    address1?: string | null;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
    updatedAt: Date;
  } = { updatedAt: new Date() };
  if (roofYear) riskPatch.roofYear = roofYear;
  if (yearBuilt) riskPatch.yearBuilt = yearBuilt;
  if (input.construction) riskPatch.construction = input.construction;
  if (street) riskPatch.address1 = street;
  if (city) riskPatch.city = city;
  if (state) riskPatch.state = state;
  if (zip) riskPatch.zip = zip;

  const hasDwelling =
    riskPatch.roofYear != null ||
    riskPatch.yearBuilt != null ||
    Boolean(riskPatch.construction) ||
    Boolean(street);

  if (input.riskId && hasDwelling) {
    await db.update(risks).set(riskPatch).where(eq(risks.id, input.riskId));
  } else if (!input.riskId && input.dealId && hasDwelling) {
    const [created] = await db
      .insert(risks)
      .values({
        tenantId: DEFAULT_TENANT_ID,
        dealId: input.dealId,
        contactId: input.contactId,
        address1: street,
        city,
        state,
        zip,
        yearBuilt: yearBuilt ?? null,
        roofYear: roofYear ?? null,
        construction: input.construction ?? null,
      })
      .returning({ id: risks.id });
    if (created) {
      await db
        .update(policies)
        .set({ riskId: created.id, updatedAt: new Date() })
        .where(eq(policies.id, input.policyId));
    }
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
  },
) {
  const deal = await loadDeal(dealId);
  if (!deal) return;
  const saved = parseShopFlow(deal.shopFlow);
  const stages = parseProductStages(saved.productStages);
  const next = setProductStage(stages, product, patch);
  await persistDealShopFlow(dealId, { ...saved, productStages: next });
}

async function loadCachedGeminiRows(docId: string): Promise<GeminiMintRow[]> {
  const existing = await db
    .select()
    .from(extractedFields)
    .where(and(eq(extractedFields.tenantId, DEFAULT_TENANT_ID), eq(extractedFields.documentId, docId)));
  return existing.map((row) => ({
    fieldKey: row.fieldKey,
    normalizedValue: row.normalizedValue,
    rawValue: row.rawValue,
    confidence: Number(row.confidence ?? 0),
    flagged: row.flagged,
  }));
}

async function persistMintExtractRows(docId: string, rows: GeminiMintRow[]) {
  const [doc] = await db
    .select({ riskId: documents.riskId })
    .from(documents)
    .where(and(eq(documents.tenantId, DEFAULT_TENANT_ID), eq(documents.id, docId)));
  await db
    .delete(extractedFields)
    .where(and(eq(extractedFields.tenantId, DEFAULT_TENANT_ID), eq(extractedFields.documentId, docId)));
  for (const field of rows) {
    const normalized = field.normalizedValue?.trim() || "";
    const raw = field.rawValue?.trim() || normalized;
    if (!normalized && !raw) continue;
    await db.insert(extractedFields).values({
      tenantId: DEFAULT_TENANT_ID,
      documentId: docId,
      riskId: doc?.riskId ?? null,
      fieldKey: field.fieldKey,
      rawValue: raw,
      normalizedValue: normalized || raw,
      confidence: field.confidence.toFixed(3),
      flagged: field.flagged,
      appliedToRisk: false,
    });
  }
}

async function loadMintGeminiRows(input: {
  docId: string;
  storagePath?: string | null;
  mimeType?: string | null;
  filename?: string | null;
  force?: boolean;
}) {
  return loadGeminiRows(input, {
    readStoredFile,
    loadCachedRows: loadCachedGeminiRows,
    loadGeminiApiKey,
    extractWithGeminiPdf,
    persistRows: persistMintExtractRows,
  });
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
  force?: boolean;
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
    existing.status !== "unpublished";
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
    await maybeArchiveDealWhenAllProductsTerminal(dealId);
    return { ok: true as const, policyId: existing.id, alreadyPublished: true };
  }

  const previousMint =
    current.mintStatus === "unpublished" || current.mintStatus === "published"
      ? current.mintStatus
      : null;
  const remintUnpublished = Boolean(existing && policyMintUnpublished(existing));
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
  const extracted = await loadMintGeminiRows({
    docId: gate.dec.id,
    storagePath: decRow?.storagePath ?? gate.dec.storagePath,
    mimeType: decRow?.mimeType ?? "application/pdf",
    filename: decRow?.filename ?? gate.dec.filename,
    force: Boolean(input.force) || remintUnpublished,
  });
  if (!extracted.ok) {
    await markMintStatus(dealId, product, { mintStatus: previousMint, selectedQuoteIds });
    return extracted;
  }
  const extractGate = evaluateMintExtract(extracted.rows);
  if (!extractGate.ok) {
    console.error("dec extract: refusing hollow mint — Gemini missing required fields", {
      documentId: gate.dec.id,
      dealId,
      reason: extractGate.reason,
      fieldKeys: extracted.rows.map((row) => row.fieldKey),
    });
    await markMintStatus(dealId, product, { mintStatus: previousMint, selectedQuoteIds });
    return extractGate;
  }
  const geminiRows = extracted.rows;
  const risk = riskRows[0];
  const sheetValues = (sheet?.values ?? {}) as Record<string, { value?: string | null } | undefined>;
  const [owner] = deal.ownerId
    ? await db.select({ name: users.name }).from(users).where(eq(users.id, deal.ownerId))
    : [];
  const session = await currentDeskSession();
  const propertyStreet = streetOnlyPremises(risk?.address1 || deal.propertyOneliner, {
    city: risk?.city,
    state: risk?.state,
    zip: risk?.zip,
  });
  const yearBuilt =
    parsePropertyYear(sheetValue(sheetValues, "year_built", "yearBuilt", "yr_built")) ??
    parsePropertyYear(geminiRows.find((row) => /year_built|yr_built/i.test(row.fieldKey))?.normalizedValue) ??
    risk?.yearBuilt ??
    null;
  const roofYear =
    parsePropertyYear(sheetValue(sheetValues, "roof_year", "roofYear", "roof_age", "year_roof")) ??
    risk?.roofYear ??
    null;
  const construction =
    sheetValue(sheetValues, "construction", "construction_type") || risk?.construction || null;
  const fields = buildMintFields({
    gemini: geminiRows,
    sheet: sheetValues,
    product,
    sold: {
      premium: quote.premium,
      coverageA: quote.coverageA,
      hurricaneDeductible: quote.hurricaneDeductible,
      aopDeductible: quote.aopDeductible,
    },
    identity: {
      namedInsured: deal.primaryNamedInsured,
      mailingAddress: propertyStreet || risk?.address1 || null,
      propertyAddress: propertyStreet || null,
      sellingAgency: sheetValue(sheetValues, "selling_agency"),
      producer: owner?.name || session.name || null,
      insuranceType: insuranceFamilyFromPolicy({
        lineOfBusiness: deal.lineOfBusiness,
        policySubType: deal.policySubType,
      }),
      form: deal.quotingForm || deal.policySubType || null,
      roofYear: roofYear ?? risk?.roofYear ?? null,
      mortgagee: sheetValue(sheetValues, "mortgagee_name", "mortgagee"),
      billingFrequency: sheetValue(sheetValues, "billing_frequency", "premium_frequency", "premium_mode"),
      paymentMethod: sheetValue(sheetValues, "payment_method", "pay_plan"),
    },
  });

  const contactId = await ensureDealContact(deal);
  const booked = mintFieldPolicyPatch(fields);
  const effective = dateOrFallback(extractGate.effectiveDate || fieldValue(fields, "effective_date"), new Date());
  const expiration = dateOrFallback(
    fieldValue(fields, "expiration_date"),
    new Date(effective.getTime() + 365 * 24 * 60 * 60 * 1000),
  );
  const premium = extractGate.premium;
  const coverageA = booked.coverageA || quote.coverageA || risk?.coverageA || null;
  const policyNumber = extractGate.policyNumber;
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
    premisesAddress:
      streetOnlyPremises(booked.premisesAddress || risk?.address1, {
        city: booked.premisesCity || risk?.city,
        state: booked.premisesState || risk?.state,
        zip: booked.premisesZip || risk?.zip,
      }) || null,
    premisesCity: booked.premisesCity || risk?.city || null,
    premisesState: booked.premisesState || risk?.state || null,
    premisesZip: booked.premisesZip || risk?.zip || null,
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
    dealId,
    riskId: risk?.id ?? null,
    fields,
    premium,
    yearBuilt,
    roofYear: booked.roofYear ?? roofYear,
    construction,
    knownCity: booked.premisesCity || risk?.city,
    knownState: booked.premisesState || risk?.state,
    knownZip: booked.premisesZip || risk?.zip,
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
    createTask: false,
  });
  await ensureWorkItem(policyId).catch(() => null);
  await clearCreatePolicyPrompt(dealId).catch(() => null);
  await maybeArchiveDealWhenAllProductsTerminal(dealId);

  revalidatePath(`/deals/${dealId}`);
  revalidatePath(`/policies/${policyId}`);
  revalidatePath("/policies");
  revalidatePath("/deals");
  return { ok: true as const, policyId };
  } catch (error) {
    await markMintStatus(dealId, product, { mintStatus: previousMint, selectedQuoteIds });
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
  const stored = fields.find((row) => row.key === key)?.value || value;
  const next: MintPayload = { ...payload, fields };
  const booked = mintFieldPolicyPatch(fields);
  const patch: Record<string, unknown> = {
    mintPayload: next,
    updatedAt: new Date(),
  };
  if (key === "policy_number" && stored) patch.policyNumber = stored;
  if (key === "premium" && stored) patch.premium = stored;
  if (key === "coverage_a" && stored) patch.coverageA = Number(stored.replace(/[$,]/g, "")) || policy.coverageA;
  if (key === "effective_date" && stored) patch.effectiveDate = dateOrFallback(stored, policy.effectiveDate);
  if (key === "expiration_date" && stored) patch.expirationDate = dateOrFallback(stored, policy.expirationDate);
  if (key === "form" && stored) patch.formType = stored;
  if (key === "insurance_type" && stored) patch.insuranceType = stored;
  if (key === "mailing_address" && stored) {
    const parts = splitPremisesAddress(stored, {
      city: policy.premisesCity,
      state: policy.premisesState,
      zip: policy.premisesZip,
    });
    patch.premisesAddress = parts.street || null;
    if (parts.city) patch.premisesCity = parts.city;
    if (parts.state) patch.premisesState = parts.state;
    if (parts.zip) patch.premisesZip = parts.zip;
  }
  if (key === "selling_agency" && stored) patch.sellingAgency = stored;
  if (key === "producer" && stored) patch.producer = stored;
  if (key === "billing_frequency" && stored) patch.billingFrequency = stored;
  if (key === "renewal_date" && stored) patch.renewalDate = dateOrFallback(stored, policy.renewalDate ?? policy.expirationDate);
  await db.update(policies).set(patch).where(eq(policies.id, policyId));
  await applyMintBookExtras({
    policyId,
    contactId: policy.contactId,
    accountId: policy.accountId,
    dealId: policy.dealId,
    riskId: policy.riskId,
    fields,
    premium: booked.premium || policy.premium,
    knownCity: booked.premisesCity || policy.premisesCity,
    knownState: booked.premisesState || policy.premisesState,
    knownZip: booked.premisesZip || policy.premisesZip,
  });
  revalidatePath(`/policies/${policyId}`);
  return {
    ok: true as const,
    remaining: fields.filter((row) => !row.confirmed).length,
    fields,
  };
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
        await maybeArchiveDealWhenAllProductsTerminal(policy.dealId);
      } else {
        await markMintStatus(policy.dealId, product, {
          stage: "closed_won",
          policyId,
          mintStatus: "published",
        });
        await maybeArchiveDealWhenAllProductsTerminal(policy.dealId);
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
