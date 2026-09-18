"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, ne } from "drizzle-orm";
import { getActor } from "@/lib/auth/session";
import { periodKey, splitCommission } from "@/lib/commissions/math";
import {
  DEFAULT_COMMISSION_RATE_PCT,
  DEFAULT_PRODUCER_SPLIT_PCT,
  DEFAULT_TENANT_ID,
  LINES,
  LOB_TO_SHOP_LINE,
  SHOP_LINES,
  type QuoteSheetFieldValue,
  type ShopLine,
} from "@/lib/domain";
import { persistFile } from "@/app/actions/documents";
import { emitDeskEvent } from "@/lib/developer-hub/events";
import { flashAction } from "@/lib/flash-action";
import { recordPolicyFieldChanges } from "@/lib/policy/record-changes";
import { streetOnlyPremises } from "@/lib/policy/premises";
import { BindBlockedError, isCommercialLine } from "@/lib/crm/bind";
import { sheetProductForQuotingForm } from "@/lib/deals/deal-line";
import {
  defaultFormForShopLine,
  lobsToBindForDeal,
  pickQuoteForLine,
  unboundPolicyLines,
} from "@/lib/deals/package-lines";
import { hasCommercialProduct, inferDealProducts } from "@/lib/deals/deal-products";
import {
  forceNewShopOnSave,
  packageDraftForNewDealSave,
} from "@/lib/deals/new-deal-href";
import { NEW_DEAL_PIPELINE_STAGE, seedNewDealShopFlow } from "@/lib/deals/new-deal-write";
import { requireInsertedRisk } from "@/lib/deals/ensure-risk";
import { assertAnaUnbound } from "@/lib/crm/bind-path";
import { scheduleContactCoverageNotices } from "@/lib/coverage/schedule-notices";
import { formatPersonName } from "@/lib/crm/display";
import { isOutreachKind, outreachLabel, slugifyStage } from "@/lib/crm/lists";
import { splitTypedPartyName } from "@/lib/crm/party-typeahead";
import { formatDealTitle, splitPersonName } from "@/lib/deals/deal-title";
import { coverageLinesValueForDeal, isCommercialSheetLine } from "@/lib/quote-sheet/commercial-risk-profile";
import { isUuid } from "@/lib/ids";
import { defaultStageColor } from "@/lib/desk/status-colors";
import { db } from "@/lib/db";
import { ensurePipelineStages, refreshPartyCounts } from "@/lib/db/queries";
import {
  accounts,
  activities,
  activityLogs,
  alerts,
  clientHistory,
  commissions,
  contactAccounts,
  contactCoapplicants,
  contacts,
  deals,
  documents,
  emailSendJobs,
  emailTriggers,
  leads,
  pipelines,
  pipelineStages,
  policies,
  quoteSheets,
  quoteAttemptLogs,
  quotes,
  reviewTasks,
  risks,
} from "@/lib/db/schema";
import { blankSheetWithDefaults } from "@/lib/quote-sheet/catalog";
import { activityLogBody } from "@/lib/lifecycle/activity";
import { isSameLead, type LeadIdentity } from "@/lib/lifecycle/lead-match";
import { leadValuesFromForm } from "@/lib/crm/lead-fields";
import { CORE_FIELDS } from "@/lib/custom-fields/defaults";
import { BUSINESS_IDENTITY_FIELD_KEYS } from "@/lib/custom-fields/business-identity-fields";
import { addressVerifyValuesFromForm } from "@/lib/address/verify-state";
import { customValuesFromForm } from "@/lib/custom-fields/resolve-layout";
import { isRedirectError } from "@/lib/lifecycle/shop";
import { dealListCascadeSyncValues, mergeCascadePrefill } from "@/lib/deals/insurance-cascade";
import {
  DEAL_SELLING_AGENCY_KEY,
  defaultSellingAgencyValue,
} from "@/lib/deals/selling-agency";
import { applySystemDealValues } from "@/app/actions/custom-fields";
import {
  defaultInsuredPropertyKind,
  INSURED_PROPERTY_KIND_KEY,
  insuredPropertyKindLabel,
} from "@/lib/deals/insured-property-kind";
import { listFieldDefs, writeRecordValues } from "@/lib/custom-fields/store";
import { normalizeLeadCadence } from "@/lib/leads/queue";
import { fillBlankParty, fillSheetFromLead, leadOntoRisk } from "@/lib/desk/copy-once";
import {
  contactCustomPatchFromValues,
  contactSystemPatchFromValues,
  emptyOnlyCoApplicantContactValues,
  emptyOnlyContactValues,
  hasCoApplicantIdentity,
  incomingContactValuesFromDeal,
} from "@/lib/crm/contact-bind-transfer";
import {
  convertActivityLineLabel,
  convertActivityTitle,
  convertFieldCopy,
  pipelineSlugForLine,
  resolveConvertLine,
} from "@/lib/crm/convert";
import { loadRecordValues, writeCarriedLeadValues } from "@/lib/custom-fields/store";
import { persistDealWorkTab } from "@/lib/deals/work-tab";
import {
  documentLinesFromDocs,
  parseSelectedShopLines,
  shopLinesForConvertWithDocs,
} from "@/lib/leads/line-documents";
import { dealCreateFieldsFromPick, sheetsToPrepare } from "@/lib/quoting/forms";
import { writeCrmSignalsSafe } from "@/lib/crm/signals";
import { writeDeskComms } from "@/lib/desk/write-comms";
import { isKnownStageToken, resolveStageMove } from "@/lib/wire/pipeline";
import {
  DEAL_ARCHIVE_REMINDER_KIND,
  dealArchiveReminderBody,
  dealArchiveReminderTitle,
} from "@/lib/deals/archive-reminder";
import {
  accountFieldsFromSheet,
  contactFieldsFromSheet,
  isSameAccount,
  isSameContact,
  normalizeEin,
} from "@/lib/wire/match-party";
import { writeEin, writeSsn } from "@/lib/pii/write";
import { piiLookupHash } from "@/lib/pii/vault";
import { scheduleWonClientEmails } from "@/lib/wire/email-jobs";
import { carryLeadTagsToContact, mergeTags } from "@/lib/tags/module-tags";

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function revalidateCrm(extra: string[] = []) {
  for (const path of [
    "/",
    "/leads",
    "/deals",
    "/contacts",
    "/accounts",
    "/businesses",
    "/policies",
    "/reviews",
    "/tasks",
    "/pipeline",
    "/alerts",
    ...extra,
  ]) {
    revalidatePath(path);
  }
}

export async function findMatchingLead(input: LeadIdentity) {
  const rows = await db.select().from(leads).where(eq(leads.tenantId, DEFAULT_TENANT_ID));
  return rows.find((row) => isSameLead(row, input)) ?? null;
}

export async function findOrCreateLead(
  input: LeadIdentity & {
    source?: string | null;
    notes?: string | null;
    mailingAddress?: string | null;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
    dateOfBirth?: string | null;
    middleName?: string | null;
    insuranceTypeDesired?: string | null;
    preferredLanguage?: string | null;
    ownerId?: string | null;
    autoRoute?: boolean;
  },
) {
  const existing = await findMatchingLead(input);
  if (existing) return { lead: existing, created: false };
  const actor = await getActor();
  const route = Boolean(input.autoRoute) || input.ownerId === null;
  const ownerId = route ? null : (input.ownerId !== undefined ? input.ownerId : actor.id || null);
  const [lead] = await db
    .insert(leads)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      ownerId,
      firstName: input.firstName || "Unknown",
      middleName: input.middleName || null,
      lastName: input.lastName || "Lead",
      email: input.email || null,
      phone: input.phone || null,
      mailingAddress: input.mailingAddress || null,
      city: input.city || null,
      state: input.state || null,
      zip: input.zip || null,
      dateOfBirth: input.dateOfBirth || null,
      insuranceTypeDesired: input.insuranceTypeDesired || null,
      preferredLanguage: input.preferredLanguage || null,
      source: input.source || "manual",
      notes: input.notes || null,
      status: "in_progress",
      cadence: "new",
      temperature: "hot",
    })
    .returning();
  if (lead && !lead.ownerId && route) {
    const { applyLeadRouting } = await import("@/lib/leads/apply-routing");
    const routed = await applyLeadRouting(lead.id);
    if (routed?.ownerId) lead.ownerId = routed.ownerId;
  }
  if (lead) {
    const { fireLeadFollowUpForStatus } = await import("@/lib/leads/apply-follow-up");
    await fireLeadFollowUpForStatus(lead.id, lead.status).catch(() => null);
  }
  return { lead, created: true };
}

export async function createLead(formData: FormData) {
  const values = leadValuesFromForm(formData);
  const autoRoute = str(formData, "autoRoute") === "1";
  const { lead, created } = await findOrCreateLead({
    ...values,
    ownerId: autoRoute ? null : undefined,
    autoRoute,
  });
  if (!lead) return;

  const cadence = values.cadence ? normalizeLeadCadence(values.cadence) : (lead as { cadence?: string }).cadence ?? "new";
  const temperature = values.temperature || (lead as { temperature?: string | null }).temperature || "hot";
  const status = values.status || lead.status || "in_progress";

  // Apply layout system fields that findOrCreateLead may have defaulted.
  await db
    .update(leads)
    .set({
      firstName: values.firstName || lead.firstName,
      middleName: values.middleName ?? lead.middleName,
      lastName: values.lastName || lead.lastName,
      email: values.email ?? lead.email,
      phone: values.phone ?? lead.phone,
      mailingAddress: values.mailingAddress ?? lead.mailingAddress,
      city: values.city ?? lead.city,
      state: values.state ?? lead.state,
      zip: values.zip ?? lead.zip,
      dateOfBirth: values.dateOfBirth ?? lead.dateOfBirth,
      insuranceTypeDesired: values.insuranceTypeDesired ?? lead.insuranceTypeDesired,
      preferredLanguage: values.preferredLanguage ?? lead.preferredLanguage,
      source: values.source ?? lead.source,
      notes: values.notes ?? lead.notes,
      status,
      cadence,
      temperature,
      updatedAt: new Date(),
    } as any)
    .where(eq(leads.id, lead.id));

  const linkedContactId = isUuid(str(formData, "contactId")) ? str(formData, "contactId") : "";
  const defs = await listFieldDefs("leads").catch(() => []);
  const custom = customValuesFromForm(formData, defs);
  if (!String(custom[DEAL_SELLING_AGENCY_KEY] ?? "").trim()) {
    const agency = defaultSellingAgencyValue(
      defs.find((field) => field.key === DEAL_SELLING_AGENCY_KEY)?.options,
    );
    if (agency) custom[DEAL_SELLING_AGENCY_KEY] = agency;
  }
  delete custom.cadence;
  delete custom.status;
  delete custom.temperature;
  if (linkedContactId) custom.linked_contact_id = linkedContactId;
  if (Object.keys(custom).length) {
    await writeRecordValues(lead.id, custom, "leads");
  }

  if (created || values.cadence) {
    const { fireLeadFollowUpForStatus } = await import("@/lib/leads/apply-follow-up");
    await fireLeadFollowUpForStatus(lead.id, cadence).catch(() => null);
  }

  revalidatePath("/leads");
  revalidatePath(`/leads/${lead.id}`);
  flashAction(`/leads/${lead.id}?saved=1`, "lead-saved");
}

export async function convertLeadToDeal(
  leadId: string,
  line = "HO",
  state = "FL",
  selectedLines: readonly ShopLine[] = [],
  carryFields?: readonly string[] | null,
) {
  const actor = await getActor();
  const [lead] = await db.select().from(leads).where(eq(leads.id, leadId));
  if (!lead) throw new Error("Lead not found");
  if (lead.convertedDealId) return lead.convertedDealId;

  const leadCustom = await loadRecordValues(leadId, "leads").catch(() => ({} as Record<string, string>));
  // Prefer lead Insurance subtype / Type custom fields over silent HO default.
  const { loadDeskLineSettings } = await import("@/lib/db/line-settings");
  const { isHiddenLine } = await import("@/lib/desk/line-settings");
  const lineSettings = await loadDeskLineSettings();
  const requestedLine = resolveConvertLine(line, lead.insuranceTypeDesired, leadCustom);
  const dealLine = isHiddenLine(requestedLine, lineSettings) ? "HO" : requestedLine;
  const copy = convertFieldCopy(lead, dealLine, state, carryFields, leadCustom);
  const leadDocs = await db
    .select()
    .from(documents)
    .where(
      and(
        eq(documents.tenantId, DEFAULT_TENANT_ID),
        eq(documents.leadId, leadId),
        ne(documents.status, "hidden"),
      ),
    );
  const shopLines = shopLinesForConvertWithDocs(
    dealLine,
    documentLinesFromDocs(leadDocs),
    selectedLines,
  );
  const [pipeline] = await db
    .select()
    .from(pipelines)
    .where(eq(pipelines.slug, copy.pipelineSlug));

  const partyRows = await db.select().from(contacts).where(eq(contacts.tenantId, DEFAULT_TENANT_ID));
  const matchedContact =
    partyRows.find((row) =>
      isSameContact(row, {
        firstName: lead.firstName,
        lastName: lead.lastName,
        email: lead.email,
        phone: lead.phone,
      }),
    )     ?? null;
  if (matchedContact) {
    const nextTags = mergeTags(matchedContact.tags, carryLeadTagsToContact(lead.tags));
    if (nextTags.join(",") !== (matchedContact.tags ?? []).join(",")) {
      await db
        .update(contacts)
        .set({ tags: nextTags, updatedAt: new Date() })
        .where(eq(contacts.id, matchedContact.id));
    }
  }

  const [deal] = await db
    .insert(deals)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      leadId,
      contactId: matchedContact?.id ?? null,
      ownerId: lead.ownerId ?? actor.id ?? null,
      title: copy.title,
      notes: copy.notes,
      shopLines,
      ...NEW_DEAL_PIPELINE_STAGE,
      shopFlow: seedNewDealShopFlow({
        shopLines,
        lineOfBusiness: dealLine,
        quotingForm: copy.quotingForm,
        quotingLine: copy.quotingLine,
        policySubType: copy.policySubType,
      }),
      pipelineId: pipeline?.id ?? null,
      lineOfBusiness: dealLine,
      state: copy.dealState,
      primaryNamedInsured: copy.primaryNamedInsured,
      source: copy.source,
      quotingForm: copy.quotingForm,
      quotingLine: copy.quotingLine,
      policySubType: copy.policySubType,
      tags: carryLeadTagsToContact(lead.tags),
    })
    .returning();

  const [riskRow] = await db
    .insert(risks)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      dealId: deal.id,
      riskType: dealLine === "AUTO" ? "auto" : "property",
      ...copy.risk,
    })
    .returning();
  const risk = requireInsertedRisk(riskRow, "Lead convert");

  await db.insert(quoteSheets).values({
    tenantId: DEFAULT_TENANT_ID,
    dealId: deal.id,
    line: copy.sheetLine,
    values: copy.sheetValues as typeof quoteSheets.$inferInsert.values,
  });
  await insertSheetsForDeal(deal.id, shopLines);
  await writeCarriedLeadValues(deal.id, { ...lead, id: leadId }, carryFields, leadCustom).catch(() => null);
  if (copy.quotingForm || copy.policySubType || copy.insuranceType) {
    await applySystemDealValues(deal.id, {
      ...(copy.quotingForm || copy.policySubType
        ? { quotingForm: copy.quotingForm || copy.policySubType || "" }
        : {}),
      ...(copy.primaryNamedInsured ? { primaryNamedInsured: copy.primaryNamedInsured } : {}),
      ...(copy.dealState ? { state: copy.dealState } : {}),
    }).catch(() => null);
  }
  await persistDealWorkTab(deal.id, "details").catch(() => null);

  if (risk && leadDocs.length > 0) {
    await db
      .update(documents)
      .set({ dealId: deal.id, riskId: risk.id })
      .where(
        and(
          eq(documents.tenantId, DEFAULT_TENANT_ID),
          eq(documents.leadId, leadId),
          ne(documents.status, "hidden"),
        ),
      );
  }

  await db
    .update(leads)
    .set({ status: "converted", convertedDealId: deal.id, updatedAt: new Date() })
    .where(eq(leads.id, leadId));

  const { cancelLeadFollowUps } = await import("@/lib/leads/apply-follow-up");
  await cancelLeadFollowUps(leadId).catch(() => null);

  const convertLabel = convertActivityLineLabel({
    lineOfBusiness: dealLine,
    quotingForm: copy.quotingForm,
    policySubType: copy.policySubType,
  });
  await writeDeskComms({
    kind: "task",
    title: convertActivityTitle({
      lineOfBusiness: dealLine,
      quotingForm: copy.quotingForm,
      policySubType: copy.policySubType,
    }),
    notes: copy.notes,
    eventType: "created",
    status: "completed",
    leadId,
    dealId: deal.id,
    contactId: matchedContact?.id ?? null,
    logEmailJob: false,
  }).catch(() => null);

  await writeCrmSignalsSafe({
    kind: "lead_converted",
    title: `Shop opened · ${copy.title}`,
    body: `Lead ${lead.lastName}, ${lead.firstName} converted · ${convertLabel}. Gather the sheet.`,
    entityType: "deal",
    entityId: deal.id,
    userId: lead.ownerId ?? actor.id ?? null,
    dealId: deal.id,
    contactId: matchedContact?.id ?? null,
    createTask: true,
  });

  return deal.id;
}

export async function createDealFromLead(formData: FormData) {
  const leadId = str(formData, "leadId");
  const [lead] = await db.select().from(leads).where(eq(leads.id, leadId));
  const dealId = await convertLeadToDeal(
    leadId,
    str(formData, "line") || str(formData, "insuranceTypeDesired") || lead?.insuranceTypeDesired || "HO",
    str(formData, "state") || lead?.state || "FL",
    parseSelectedShopLines(str(formData, "shopLines")),
    null,
  );
  revalidatePath("/deals");
  revalidatePath("/leads");
  redirect(`/deals/${dealId}?tab=details`);
}

export async function createDeal(formData: FormData) {
  const actor = await getActor();
  const sourceDealId = isUuid(str(formData, "sourceDealId")) ? str(formData, "sourceDealId") : "";
  const [sourceDeal] = sourceDealId
    ? await db
        .select()
        .from(deals)
        .where(and(eq(deals.tenantId, DEFAULT_TENANT_ID), eq(deals.id, sourceDealId)))
    : [];
  const contactId = isUuid(str(formData, "contactId"))
    ? str(formData, "contactId")
    : sourceDeal?.contactId && isUuid(sourceDeal.contactId)
      ? sourceDeal.contactId
      : "";
  const accountId = isUuid(str(formData, "accountId"))
    ? str(formData, "accountId")
    : sourceDeal?.accountId && isUuid(sourceDeal.accountId)
      ? sourceDeal.accountId
      : "";
  const dealName = str(formData, "dealName");
  const forceNewShop = forceNewShopOnSave(formData);
  const packageDraft = packageDraftForNewDealSave(formData);
  const [pickedContact] = contactId
    ? await db.select().from(contacts).where(eq(contacts.id, contactId))
    : [];
  const [pickedAccount] = accountId
    ? await db.select().from(accounts).where(eq(accounts.id, accountId))
    : [];
  const typed = splitTypedPartyName(dealName);
  const businessName = str(formData, "field_business_name") || str(formData, "field_legal_name");
  const ownerParts = splitPersonName(str(formData, "field_owner_name"));
  const firstName =
    str(formData, "firstName") ||
    str(formData, "field_first_name") ||
    ownerParts.firstName ||
    pickedContact?.firstName ||
    typed.firstName ||
    (businessName || pickedAccount ? "" : "New");
  const lastName =
    str(formData, "lastName") ||
    str(formData, "field_last_name") ||
    ownerParts.lastName ||
    pickedContact?.lastName ||
    typed.lastName ||
    businessName ||
    pickedAccount?.name ||
    "Shop";
  const email =
    str(formData, "email") ||
    str(formData, "field_email") ||
    str(formData, "field_owner_email") ||
    pickedContact?.email ||
    pickedAccount?.email ||
    null;
  const phone =
    str(formData, "phone") ||
    str(formData, "field_phone") ||
    str(formData, "field_owner_phone") ||
    pickedContact?.phone ||
    pickedAccount?.phone ||
    null;
  const mailingAddress =
    str(formData, "address1") ||
    str(formData, "mailingAddress") ||
    str(formData, "field_mailing_address") ||
    pickedContact?.mailingAddress ||
    pickedAccount?.mailingAddress ||
    null;
  const city =
    str(formData, "city") ||
    str(formData, "field_city") ||
    pickedContact?.city ||
    pickedAccount?.city ||
    null;
  const state =
    str(formData, "state") ||
    str(formData, "field_state") ||
    pickedContact?.state ||
    pickedAccount?.state ||
    null;
  const zip =
    str(formData, "zip") ||
    str(formData, "field_zip") ||
    pickedContact?.zip ||
    pickedAccount?.zip ||
    null;
  const source =
    str(formData, "source") ||
    str(formData, "field_source") ||
    "manual";
  const { lead } = await findOrCreateLead({
    firstName,
    lastName,
    email,
    phone,
    mailingAddress,
    city,
    state,
    zip,
    source,
  });
  if (lead.convertedDealId && !forceNewShop) {
    revalidatePath("/deals");
    flashAction(`/deals/${lead.convertedDealId}?saved=1`, "deal-saved");
  }

  const formRaw =
    str(formData, "quotingForm") ||
    str(formData, "field_insurance_subtype") ||
    str(formData, "field_quoting_form") ||
    str(formData, "field_insurance_type") ||
    str(formData, "policySubType") ||
    str(formData, "line") ||
    packageDraft?.quotingForm ||
    "HO3";
  const pickedRaw = dealCreateFieldsFromPick(formRaw);
  const { loadDeskLineSettings } = await import("@/lib/db/line-settings");
  const { isHiddenLine } = await import("@/lib/desk/line-settings");
  const createSettings = await loadDeskLineSettings();
  const picked = isHiddenLine(pickedRaw.lineOfBusiness, createSettings)
    ? dealCreateFieldsFromPick("HO3")
    : pickedRaw;
  const line =
    packageDraft && !str(formData, "line") && !str(formData, "field_insurance_subtype")
      ? packageDraft.lineOfBusiness
      : picked.lineOfBusiness;
  const policySubType =
    line === "LIFE"
      ? str(formData, "lifeSubType") || str(formData, "policySubType") || picked.policySubType
      : line === "HEALTH"
        ? str(formData, "healthSubType") || str(formData, "policySubType") || picked.policySubType
        : picked.policySubType;
  const quotingForm =
    line === "LIFE" || line === "HEALTH"
      ? policySubType || picked.quotingForm
      : packageDraft && !str(formData, "field_insurance_subtype") && !str(formData, "quotingForm")
        ? packageDraft.quotingForm
        : picked.quotingForm;
  const quotingLine =
    line === "LIFE"
      ? "life"
      : line === "HEALTH"
        ? "health"
        : packageDraft && !str(formData, "field_insurance_subtype") && !str(formData, "quotingForm")
          ? packageDraft.quotingLine
          : picked.quotingLine;
  const shopLines = packageDraft
    ? [...packageDraft.shopLines]
    : Array.from(
        new Set([...sheetsToPrepare(quotingForm), ...shopLinesFromForm(formData, line)]),
      );
  const shopProducts = packageDraft?.products ?? [];
  const pipelineSlug = packageDraft?.pipelineSlug ?? pipelineSlugForLine(line);
  const [pipeline] = await db.select().from(pipelines).where(eq(pipelines.slug, pipelineSlug));
  const namedFromLayout = str(formData, "field_named_insured") || businessName;
  const primaryNamedInsured =
    namedFromLayout ||
    (pickedContact ? formatPersonName(pickedContact) : null) ||
    pickedAccount?.name ||
    [firstName, lastName].filter(Boolean).join(" ").trim() ||
    null;
  const [deal] = await db
    .insert(deals)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      leadId: sourceDeal?.leadId || lead.id,
      contactId: pickedContact?.id ?? sourceDeal?.contactId ?? null,
      accountId: pickedAccount?.id ?? sourceDeal?.accountId ?? null,
      title: formatDealTitle({
        firstName,
        lastName: pickedAccount && !pickedContact && !businessName ? "" : lastName,
        accountName: businessName || (pickedAccount && !pickedContact ? pickedAccount.name : null),
        primaryNamedInsured,
        line,
        quotingForm,
        policySubType,
      }),
      ...NEW_DEAL_PIPELINE_STAGE,
      shopFlow: seedNewDealShopFlow({
        shopProducts: shopProducts.length ? shopProducts : null,
        shopLines,
        lineOfBusiness: line,
        quotingLine,
        quotingForm,
        policySubType,
      }),
      pipelineId: sourceDeal?.pipelineId ?? pipeline?.id ?? null,
      lineOfBusiness: line,
      quotingForm,
      quotingLine,
      source: lead.source ?? source,
      policySubType,
      state: state || sourceDeal?.state || "FL",
      ownerId: actor.id,
      accountKind:
        packageDraft?.accountKind ??
        (pickedAccount && !pickedContact ? "commercial" : "personal"),
      bindTarget:
        packageDraft?.bindTarget ??
        (pickedAccount && !pickedContact ? "account" : "contact"),
      primaryNamedInsured,
      notes: str(formData, "notes") || str(formData, "field_notes") || sourceDeal?.notes || null,
      shopLines,
      shopProducts: shopProducts.length ? shopProducts : null,
      tags: sourceDeal?.tags ?? [],
      propertyOneliner: sourceDeal?.propertyOneliner ?? null,
      currentCarrier: sourceDeal?.currentCarrier ?? null,
      coverageAmount: sourceDeal?.coverageAmount ?? null,
    })
    .returning();

  try {
    await persistNewDealLayoutValues(deal.id, formData, {
      quotingForm,
      policySubType,
      products: shopProducts,
      lineOfBusiness: line,
    });
    await persistDealWorkTab(deal.id, "details").catch(() => null);

    if (!lead.convertedDealId) {
      await db
        .update(leads)
        .set({ status: "converted", convertedDealId: deal.id, updatedAt: new Date() })
        .where(eq(leads.id, lead.id));

      const { cancelLeadFollowUps } = await import("@/lib/leads/apply-follow-up");
      await cancelLeadFollowUps(lead.id).catch(() => null);
    }

    const fromLead = leadOntoRisk(lead, deal.state);
    const [sourceRisk] = sourceDealId
      ? await db.select().from(risks).where(eq(risks.dealId, sourceDealId)).then((rows) => rows.slice(0, 1))
      : [];
    const [createdRisk] = await db.insert(risks).values({
      tenantId: DEFAULT_TENANT_ID,
      dealId: deal.id,
      contactId: sourceRisk?.contactId ?? pickedContact?.id ?? null,
      riskType:
        packageDraft?.riskType ??
        (deal.lineOfBusiness === "AUTO" || deal.quotingLine === "auto"
          ? "auto"
          : sourceRisk?.riskType ?? "property"),
      address1: mailingAddress || sourceRisk?.address1 || fromLead.address1,
      city: city || sourceRisk?.city || fromLead.city,
      county: str(formData, "county") || str(formData, "field_county") || sourceRisk?.county || null,
      state: state || sourceRisk?.state || fromLead.state,
      zip: zip || sourceRisk?.zip || fromLead.zip,
      yearBuilt: sourceRisk?.yearBuilt ?? null,
      construction: sourceRisk?.construction ?? null,
      occupancy: sourceRisk?.occupancy ?? null,
      stories: sourceRisk?.stories ?? null,
      squareFeet: sourceRisk?.squareFeet ?? null,
      coverageA: sourceRisk?.coverageA ?? null,
      roofYear: sourceRisk?.roofYear ?? null,
      roofCovering: sourceRisk?.roofCovering ?? null,
      openingProtection: sourceRisk?.openingProtection ?? null,
      pool: sourceRisk?.pool ?? null,
      protectionClass: sourceRisk?.protectionClass ?? null,
      milesToCoast: sourceRisk?.milesToCoast ?? null,
      mobileHome: sourceRisk?.mobileHome ?? false,
      replacementCostEstimate: sourceRisk?.replacementCostEstimate ?? null,
      vin: sourceRisk?.vin ?? null,
      vehicleYear: sourceRisk?.vehicleYear ?? null,
      vehicleMake: sourceRisk?.vehicleMake ?? null,
      vehicleModel: sourceRisk?.vehicleModel ?? null,
      vehicleUsage: sourceRisk?.vehicleUsage ?? null,
      garagingZip: sourceRisk?.garagingZip ?? null,
    }).returning();
    requireInsertedRisk(createdRisk);

    await db.insert(quoteSheets).values({
      tenantId: DEFAULT_TENANT_ID,
      dealId: deal.id,
      line: quotingLine,
      values: {
        ...seededSheetValues(quotingLine, shopProducts),
        ...(fillSheetFromLead(lead) as typeof quoteSheets.$inferInsert.values),
      },
    });
    await insertSheetsForDeal(deal.id, shopLines, shopProducts);
  } catch (error) {
    if (isRedirectError(error)) throw error;
    console.error(error);
  }

  revalidatePath("/");
  revalidatePath("/deals");
  revalidatePath(`/deals/${deal.id}`);
  scheduleContactCoverageNotices(deal.contactId);
  flashAction(`/deals/${deal.id}?saved=1&tab=details&line=${quotingLine}`, "deal-saved");
}

export async function createDealFromDecDrop(formData: FormData) {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Drop a declarations PDF or text file to open a shop.");
  }
  const firstName = str(formData, "firstName") || "Dec";
  const lastName = str(formData, "lastName") || "Drop";
  const lineRaw = LINES.includes(str(formData, "line") as (typeof LINES)[number])
    ? str(formData, "line")
    : "HO";
  const { loadDeskLineSettings } = await import("@/lib/db/line-settings");
  const { isHiddenLine } = await import("@/lib/desk/line-settings");
  const decSettings = await loadDeskLineSettings();
  const line = isHiddenLine(lineRaw, decSettings) ? "HO" : lineRaw;

  const [lead] = await db
    .insert(leads)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      firstName,
      lastName,
      email: str(formData, "email") || null,
      phone: str(formData, "phone") || null,
      insuranceTypeDesired: line,
      source: "dec_drop",
      status: "converted",
      notes: str(formData, "notes") || `Dec drop: ${file.name}`,
      ownerId: (await getActor()).id || null,
    })
    .returning();

  const pipelineSlug = pipelineSlugForLine(line);
  const [pipeline] = await db.select().from(pipelines).where(eq(pipelines.slug, pipelineSlug));
  const [deal] = await db
    .insert(deals)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      leadId: lead.id,
      ownerId: lead.ownerId,
      title: formatDealTitle({ firstName, lastName, line }),
      ...NEW_DEAL_PIPELINE_STAGE,
      shopFlow: seedNewDealShopFlow({
        shopLines: shopLinesFromLine(line),
        lineOfBusiness: line,
      }),
      pipelineId: pipeline?.id ?? null,
      shopLines: shopLinesFromLine(line),
      lineOfBusiness: line,
      source: "dec_drop",
      state: str(formData, "state") || "FL",
      primaryNamedInsured: `${firstName} ${lastName}`.trim(),
    })
    .returning();

  await db
    .update(leads)
    .set({ convertedDealId: deal.id, updatedAt: new Date() })
    .where(eq(leads.id, lead.id));

  const [riskRow] = await db
    .insert(risks)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      dealId: deal.id,
      riskType: line === "AUTO" ? "auto" : "property",
      state: deal.state,
    })
    .returning();
  const risk = requireInsertedRisk(riskRow, "Dec-drop deal");

  const buffer = Buffer.from(await file.arrayBuffer());
  await persistFile({
    dealId: deal.id,
    riskId: risk.id,
    filename: file.name,
    mimeType: file.type || "application/octet-stream",
    buffer,
    docType: "dec",
  });

  revalidateCrm([`/deals/${deal.id}`, `/leads/${lead.id}`]);
  redirect(`/deals/${deal.id}`);
}

export async function updateDealStage(formData: FormData) {
  const dealId = str(formData, "dealId");
  const stage = str(formData, "stage");
  const resolved = resolveStageMove(stage);
  const stages = await ensurePipelineStages();
  const known =
    isKnownStageToken(stage) ||
    stages.some((row) => row.slug === stage || row.name === stage || row.slug === resolved.pipelineStageSlug);
  if (stages.length > 0 && !known) {
    throw new Error("Unknown pipeline stage");
  }
  if (stage === "bound" || resolved.pipelineStage === "bound") {
    throw new BindBlockedError("Use Bind to move a deal to bound. That is the only path that creates a policy.");
  }

  const [deal] = await db.select().from(deals).where(eq(deals.id, dealId));
  if (!deal) throw new Error("Deal not found");
  if (deal.pipelineStage === "bound") {
    throw new BindBlockedError("A bound deal stays bound. Bind already created the contact and policy.");
  }

  await db
    .update(deals)
    .set({
      pipelineStage: resolved.pipelineStage,
      pipelineStageSlug: resolved.pipelineStageSlug,
      updatedAt: new Date(),
    })
    .where(eq(deals.id, dealId));
  await emitDeskEvent("deal.stage_changed", {
    entityType: "deal",
    entityId: dealId,
    from: deal.pipelineStage,
    to: stage,
  });
  await writeCrmSignalsSafe({
    kind: "stage_moved",
    title: `Stage · ${resolved.pipelineStageSlug} · ${deal.title}`,
    body: `Deal moved to ${resolved.pipelineStageSlug}.`,
    entityType: "deal",
    entityId: dealId,
    dealId,
    contactId: deal.contactId,
    accountId: deal.accountId,
    createTask: false,
  });
  revalidateCrm([`/deals/${dealId}`]);
  scheduleContactCoverageNotices(deal.contactId);
}

export async function createPipelineStage(formData: FormData) {
  const label = str(formData, "label") || str(formData, "name");
  if (!label) throw new Error("Stage label is required");
  const slug = slugifyStage(label);
  const stages = await ensurePipelineStages();
  if (slug === "bound" || stages.some((row) => row.slug === slug)) {
    throw new Error("That stage already exists");
  }
  const [pipeline] = await db
    .select()
    .from(pipelines)
    .where(eq(pipelines.tenantId, DEFAULT_TENANT_ID));
  if (!pipeline) throw new Error("No pipeline seeded yet.");
  const sortOrder = stages.reduce((max, row) => Math.max(max, row.sortOrder), 0) + 1;
  await db.insert(pipelineStages).values({
    tenantId: DEFAULT_TENANT_ID,
    pipelineId: pipeline.id,
    slug,
    name: label,
    sortOrder,
    color: defaultStageColor(sortOrder, slug),
    seeded: false,
  });
  revalidateCrm();
}

export async function relabelPipelineStage(formData: FormData) {
  const stageId = str(formData, "stageId");
  const label = str(formData, "label") || str(formData, "name");
  if (!label) throw new Error("Stage label is required");
  await db.update(pipelineStages).set({ name: label }).where(eq(pipelineStages.id, stageId));
  revalidateCrm();
}

export async function deletePipelineStage(formData: FormData) {
  const stageId = str(formData, "stageId");
  const [stage] = await db.select().from(pipelineStages).where(eq(pipelineStages.id, stageId));
  if (!stage) throw new Error("Stage not found");
  if (stage.seeded || stage.slug === "bound" || stage.slug === "closed_won") {
    throw new Error("Bound is reserved for bind and cannot be deleted");
  }
  await db
    .update(deals)
    .set({ pipelineStage: "shopping", updatedAt: new Date() })
    .where(and(eq(deals.tenantId, DEFAULT_TENANT_ID), eq(deals.pipelineStage, stage.slug)));
  await db.delete(pipelineStages).where(eq(pipelineStages.id, stageId));
  revalidateCrm();
}

export async function createDealOutreach(formData: FormData) {
  const dealId = str(formData, "dealId");
  const kind = str(formData, "kind");
  if (!isOutreachKind(kind)) throw new Error("Unknown outreach kind");
  const note = str(formData, "note");
  const dueRaw = str(formData, "dueDate");
  const dueDate = dueRaw ? new Date(`${dueRaw}T16:00:00.000Z`) : new Date();

  const [deal] = await db.select().from(deals).where(eq(deals.id, dealId));
  if (!deal) throw new Error("Deal not found");

  const title = note
    ? `${outreachLabel(kind)} · ${deal.title}: ${note}`
    : `${outreachLabel(kind)} · ${deal.title}`;

  await db.insert(reviewTasks).values({
    tenantId: DEFAULT_TENANT_ID,
    dealId: deal.id,
    contactId: deal.contactId,
    kind,
    title,
    dueDate,
    status: "open",
  });

  if (deal.contactId) {
    await db.insert(clientHistory).values({
      tenantId: DEFAULT_TENANT_ID,
      contactId: deal.contactId,
      dealId: deal.id,
      eventType: kind,
      body: note || `${outreachLabel(kind)} logged from the deals list. Nothing was sent outside the desk.`,
    });
  }

  revalidateCrm([`/deals/${deal.id}`, "/tasks"]);
  const referer = (await headers()).get("referer");
  if (referer) {
    try {
      redirect(new URL(referer).pathname + new URL(referer).search);
    } catch (error) {
      if (typeof error === "object" && error && "digest" in error) throw error;
    }
  }
  redirect("/deals");
}

export async function updateDealCrmNotes(formData: FormData) {
  const dealId = str(formData, "dealId");
  await db
    .update(deals)
    .set({
      notes: str(formData, "notes") || null,
      primaryNamedInsured: str(formData, "primaryNamedInsured") || null,
      updatedAt: new Date(),
    })
    .where(eq(deals.id, dealId));
  revalidateCrm([`/deals/${dealId}`]);
  flashAction(`/deals/${dealId}`, "notes-saved");
}

export async function updateRisk(formData: FormData) {
  const id = str(formData, "riskId");
  const num = (key: string) => {
    const v = str(formData, key);
    if (!v) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const bool = (key: string) => str(formData, key) === "on" || str(formData, key) === "true";

  await db
    .update(risks)
    .set({
      address1: str(formData, "address1") || null,
      city: str(formData, "city") || null,
      county: str(formData, "county") || null,
      state: str(formData, "state") || "FL",
      zip: str(formData, "zip") || null,
      yearBuilt: num("yearBuilt"),
      construction: str(formData, "construction") || null,
      occupancy: str(formData, "occupancy") || null,
      stories: num("stories"),
      squareFeet: num("squareFeet"),
      coverageA: num("coverageA"),
      roofYear: num("roofYear"),
      roofCovering: str(formData, "roofCovering") || null,
      openingProtection: str(formData, "openingProtection") || null,
      pool: bool("pool"),
      protectionClass: str(formData, "protectionClass") || null,
      milesToCoast: num("milesToCoast"),
      mobileHome: bool("mobileHome"),
      replacementCostEstimate: num("replacementCostEstimate"),
      vin: str(formData, "vin") || null,
      vehicleYear: num("vehicleYear"),
      vehicleMake: str(formData, "vehicleMake") || null,
      vehicleModel: str(formData, "vehicleModel") || null,
      vehicleUsage: str(formData, "vehicleUsage") || null,
      garagingZip: str(formData, "garagingZip") || null,
      updatedAt: new Date(),
    })
    .where(eq(risks.id, id));

  const dealId = str(formData, "dealId");
  revalidatePath(`/deals/${dealId}`);
  revalidatePath("/settings/master-risk");
  flashAction(`/deals/${dealId}`, "worksheet-saved");
}

export async function findMatchingContact(input: {
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  middleName?: string | null;
}) {
  const { findExistingContactMatch } = await import("@/lib/crm/existing-contact-match");
  const rows = await db.select().from(contacts).where(eq(contacts.tenantId, DEFAULT_TENANT_ID));
  const hit = findExistingContactMatch(rows, input);
  return hit?.contact ?? null;
}

export async function findMatchingAccount(input: { name: string; ein?: string | null }) {
  const rows = await db.select().from(accounts).where(eq(accounts.tenantId, DEFAULT_TENANT_ID));
  const incomingNorm = normalizeEin(input.ein);
  const incomingHash = incomingNorm ? piiLookupHash(incomingNorm) : null;
  return (
    rows.find((row) => {
      if (incomingHash && row.einLookup && incomingHash === row.einLookup) return true;
      return isSameAccount({ name: row.name, ein: row.ein }, input);
    }) ?? null
  );
}

export async function createContact(formData: FormData) {
  const firstName =
    str(formData, "firstName") || str(formData, "field_first_name") || "Unknown";
  const lastName =
    str(formData, "lastName") || str(formData, "field_last_name") || "Client";
  const email =
    str(formData, "email") || str(formData, "field_email") || null;
  const phone =
    str(formData, "phone") || str(formData, "field_phone") || null;
  const mailingAddress =
    str(formData, "mailingAddress") ||
    str(formData, "field_mailing_address") ||
    null;
  const city = str(formData, "city") || str(formData, "field_city") || null;
  const state = str(formData, "state") || str(formData, "field_state") || "FL";
  const zip = str(formData, "zip") || str(formData, "field_zip") || null;
  const forceCreate = str(formData, "forceCreate") === "1";

  if (!forceCreate) {
    const { findExistingContactMatch } = await import("@/lib/crm/existing-contact-match");
    const rows = await db.select().from(contacts).where(eq(contacts.tenantId, DEFAULT_TENANT_ID));
    const hit = findExistingContactMatch(rows, { firstName, lastName, email, phone });
    if (hit) {
      revalidatePath("/contacts");
      flashAction(`/contacts/${hit.contact.id}?saved=1`, "contact-exists");
    }
  }

  const [row] = await db
    .insert(contacts)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      firstName,
      lastName,
      email,
      phone,
      mailingAddress,
      city,
      state,
      zip,
      dateOfBirth: str(formData, "dateOfBirth") || str(formData, "field_date_of_birth") || null,
      lifeNotes: str(formData, "lifeNotes") || str(formData, "field_life_notes") || null,
      healthNotes: str(formData, "healthNotes") || str(formData, "field_health_notes") || null,
      notes: str(formData, "notes") || str(formData, "field_notes") || null,
      source: str(formData, "source") || str(formData, "field_source") || "manual",
      ...writeSsn(str(formData, "ssn") || str(formData, "field_ssn") || null),
    })
    .returning();

  const defs = await listFieldDefs("contacts").catch(() => []);
  const custom = customValuesFromForm(formData, defs);
  if (Object.keys(custom).length) {
    await writeRecordValues(row.id, custom, "contacts");
  }

  await emitDeskEvent("record.created", {
    entityType: "contact",
    entityId: row.id,
    name: `${row.firstName} ${row.lastName}`.trim(),
  });
  revalidatePath("/contacts");
  revalidatePath(`/contacts/${row.id}`);
  flashAction(`/contacts/${row.id}?saved=1`, "contact-saved");
}

async function sheetValuesForDeal(dealId: string): Promise<Record<string, QuoteSheetFieldValue>> {
  const sheets = await db
    .select()
    .from(quoteSheets)
    .where(and(eq(quoteSheets.tenantId, DEFAULT_TENANT_ID), eq(quoteSheets.dealId, dealId)));
  const home = sheets.find((s) => s.line === "home");
  return (home ?? sheets[0])?.values ?? {};
}


async function applyEmptyOnlyContactBind(opts: {
  contactId: string;
  dealId: string;
  leadId?: string | null;
  sheetValues: Record<string, QuoteSheetFieldValue>;
  lead?: {
    firstName?: string | null;
    lastName?: string | null;
    middleName?: string | null;
    email?: string | null;
    phone?: string | null;
    mailingAddress?: string | null;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
    dateOfBirth?: string | null;
    source?: string | null;
    preferredLanguage?: string | null;
    lifeNotes?: string | null;
    healthNotes?: string | null;
    notes?: string | null;
    tags?: string[] | null;
  } | null;
  dealSource?: string | null;
  risk?: { address1?: string | null; city?: string | null; state?: string | null; zip?: string | null } | null;
}) {
  const [existing] = await db.select().from(contacts).where(eq(contacts.id, opts.contactId));
  if (!existing) return;

  const dealCustom = await loadRecordValues(opts.dealId, "deals").catch(() => ({} as Record<string, string>));
  const leadCustom = opts.leadId
    ? await loadRecordValues(opts.leadId, "leads").catch(() => ({} as Record<string, string>))
    : {};
  const contactCustom = await loadRecordValues(opts.contactId, "contacts").catch(
    () => ({} as Record<string, string>),
  );

  const [dealRow] = await db.select().from(deals).where(eq(deals.id, opts.dealId));
  const { incoming, propertyKind } = incomingContactValuesFromDeal({
    dealCustom,
    leadCustom,
    lead: opts.lead,
    sheetValues: opts.sheetValues,
    risk: opts.risk,
    dealSource: opts.dealSource,
    product: dealRow?.quotingForm ?? dealRow?.lineOfBusiness ?? null,
    quotingForm: dealRow?.quotingForm ?? null,
  });

  const existingValues: Record<string, string> = {
    ...contactCustom,
    first_name: existing.firstName ?? "",
    last_name: existing.lastName ?? "",
    email: existing.email ?? "",
    phone: existing.phone ?? "",
    date_of_birth: existing.dateOfBirth ?? "",
    mailing_address: existing.mailingAddress ?? "",
    city: existing.city ?? "",
    state: existing.state ?? "",
    zip: existing.zip ?? "",
    marital_status: existing.maritalStatus ?? "",
    preferred_language: existing.preferredLanguage ?? "",
    life_notes: existing.lifeNotes ?? "",
    health_notes: existing.healthNotes ?? "",
    notes: existing.notes ?? "",
    source: existing.source ?? "",
  };

  const patch = emptyOnlyContactValues(existingValues, incoming, { propertyKind });
  const systemPatch = contactSystemPatchFromValues(patch);
  const customPatch = contactCustomPatchFromValues(patch);

  if (Object.keys(systemPatch).length) {
    await db
      .update(contacts)
      .set({
        ...systemPatch,
        source: existing.source || opts.dealSource || opts.lead?.source || null,
        tags: mergeTags(existing.tags, carryLeadTagsToContact(opts.lead?.tags)),
        updatedAt: new Date(),
      })
      .where(eq(contacts.id, opts.contactId));
  } else if (opts.lead?.tags?.length) {
    await db
      .update(contacts)
      .set({
        tags: mergeTags(existing.tags, carryLeadTagsToContact(opts.lead?.tags)),
        source: existing.source || opts.dealSource || opts.lead?.source || null,
        updatedAt: new Date(),
      })
      .where(eq(contacts.id, opts.contactId));
  }

  if (Object.keys(customPatch).length) {
    await writeRecordValues(opts.contactId, customPatch, "contacts");
  }

  // Co-applicant → separate contact + M2M (never dump into primary)
  if (hasCoApplicantIdentity(incoming)) {
    const coIdentity = {
      firstName: String(incoming.co_applicant_first_name ?? "").trim() || "Co",
      lastName: String(incoming.co_applicant_last_name ?? "").trim() || "Applicant",
      email: String(incoming.co_applicant_email ?? "").trim() || null,
      phone: String(incoming.co_applicant_phone ?? "").trim() || null,
    };
    let coId: string | null = null;
    const matchedCo = await findMatchingContact(coIdentity);
    if (matchedCo) {
      coId = matchedCo.id;
    } else {
      const [created] = await db
        .insert(contacts)
        .values({
          tenantId: DEFAULT_TENANT_ID,
          firstName: coIdentity.firstName,
          lastName: coIdentity.lastName,
          email: coIdentity.email,
          phone: coIdentity.phone,
          dateOfBirth: String(incoming.co_applicant_dob ?? "").trim() || null,
          maritalStatus: String(incoming.co_applicant_marital_status ?? "").trim() || null,
          source: opts.dealSource || opts.lead?.source || null,
          tenureStart: new Date(),
        })
        .returning();
      coId = created.id;
    }
    const [co] = await db.select().from(contacts).where(eq(contacts.id, coId));
    if (!co) return;
    const coCustom = await loadRecordValues(co.id, "contacts").catch(() => ({} as Record<string, string>));
    const coExisting: Record<string, string> = {
      ...coCustom,
      first_name: co.firstName ?? "",
      last_name: co.lastName ?? "",
      email: co.email ?? "",
      phone: co.phone ?? "",
      date_of_birth: co.dateOfBirth ?? "",
      marital_status: co.maritalStatus ?? "",
    };
    const coPatch = emptyOnlyCoApplicantContactValues(coExisting, incoming);
    const coSystem = contactSystemPatchFromValues(coPatch);
    const coCustomPatch = contactCustomPatchFromValues(coPatch);
    if (Object.keys(coSystem).length) {
      await db
        .update(contacts)
        .set({ ...coSystem, updatedAt: new Date() })
        .where(eq(contacts.id, co.id));
    }
    if (Object.keys(coCustomPatch).length) {
      await writeRecordValues(co.id, coCustomPatch, "contacts");
    }
    const linkRows = await db
      .select()
      .from(contactCoapplicants)
      .where(
        and(
          eq(contactCoapplicants.tenantId, DEFAULT_TENANT_ID),
          eq(contactCoapplicants.contactId, opts.contactId),
          eq(contactCoapplicants.linkedContactId, co.id),
        ),
      );
    const reverse = await db
      .select()
      .from(contactCoapplicants)
      .where(
        and(
          eq(contactCoapplicants.tenantId, DEFAULT_TENANT_ID),
          eq(contactCoapplicants.contactId, co.id),
          eq(contactCoapplicants.linkedContactId, opts.contactId),
        ),
      );
    if (linkRows.length === 0 && reverse.length === 0 && co.id !== opts.contactId) {
      await db.insert(contactCoapplicants).values({
        tenantId: DEFAULT_TENANT_ID,
        contactId: opts.contactId,
        linkedContactId: co.id,
      });
    }
  }
}

export async function bindDeal(formData: FormData) {
  const actor = await getActor();
  const dealId = str(formData, "dealId");
  assertAnaUnbound(dealId);
  const [deal] = await db.select().from(deals).where(eq(deals.id, dealId));
  if (!deal) throw new Error("Deal not found");
  const [risk] = await db.select().from(risks).where(eq(risks.dealId, dealId));
  const [lead] = deal.leadId
    ? await db.select().from(leads).where(eq(leads.id, deal.leadId))
    : [];

  const dealProducts = inferDealProducts({
    shopProducts: deal.shopProducts,
    shopLines: deal.shopLines,
    lineOfBusiness: deal.lineOfBusiness,
    quotingLine: deal.quotingLine,
    quotingForm: deal.quotingForm,
    policySubType: deal.policySubType,
  });
  const commercialMix = hasCommercialProduct(dealProducts);
  const bindTarget =
    str(formData, "bindTarget") ||
    deal.bindTarget ||
    (commercialMix && dealProducts.every((id) => hasCommercialProduct([id])) ? "account" : "contact");
  let contactId = deal.contactId;
  let accountId = deal.accountId;
  const allSheets = await db.select().from(quoteSheets).where(eq(quoteSheets.dealId, dealId));
  const homeSheet = allSheets.find((row) => row.line === "home");
  const sheet = homeSheet ?? allSheets[0];
  const sheetValues = sheet?.values ?? {};

  if (bindTarget === "account") {
    const identity = {
      name:
        str(formData, "businessName") ||
        `${lead?.lastName ?? "Bound"} ${deal.lineOfBusiness}`.trim(),
      ein: str(formData, "ein") || null,
    };
    const copied = accountFieldsFromSheet(sheetValues, {
      ...identity,
      email: lead?.email,
      phone: lead?.phone,
      mailingAddress: risk?.address1 || lead?.mailingAddress,
      city: risk?.city || lead?.city,
      state: risk?.state || lead?.state || "FL",
      zip: risk?.zip || lead?.zip,
    });
    const existing = accountId
      ? (await db.select().from(accounts).where(eq(accounts.id, accountId)))[0]
      : await findMatchingAccount(identity);
    if (existing) {
      accountId = existing.id;
      const filled = fillBlankParty(existing, copied);
      await db
        .update(accounts)
        .set({
          mailingAddress: filled.mailingAddress,
          city: filled.city,
          state: filled.state,
          zip: filled.zip,
          phone: filled.phone,
          email: filled.email,
          updatedAt: new Date(),
        })
        .where(eq(accounts.id, existing.id));
    } else {
      const [account] = await db
        .insert(accounts)
        .values({
          tenantId: DEFAULT_TENANT_ID,
          name: copied.name,
          ...writeEin(copied.ein),
          email: copied.email,
          phone: copied.phone,
          mailingAddress: copied.mailingAddress,
          city: copied.city,
          state: copied.state,
          zip: copied.zip,
          employeeCount: copied.employeeCount,
          annualSales: copied.annualSales,
          payrollW2: copied.payrollW2,
          payroll1099: copied.payroll1099,
          payrollTotal: copied.payrollTotal,
          tenureStart: new Date(),
        })
        .returning();
      accountId = account.id;
    }
    if (!contactId && lead) {
      const matched = await findMatchingContact(lead);
      if (matched) contactId = matched.id;
    }
  }
  if (!contactId) {
    const identity = {
      firstName: lead?.firstName ?? "Bound",
      lastName: lead?.lastName ?? "Client",
      email: lead?.email,
      phone: lead?.phone,
    };
    const existing = await findMatchingContact(identity);
    const dealCustom = await loadRecordValues(dealId, "deals").catch(() => ({} as Record<string, string>));
    const { incoming: bindIncoming } = incomingContactValuesFromDeal({
      dealCustom,
      lead,
      sheetValues,
      risk,
      dealSource: deal.source,
      product: deal.quotingForm ?? deal.lineOfBusiness,
      quotingForm: deal.quotingForm,
    });
    const copied = contactFieldsFromSheet(sheetValues, {
      ...identity,
      mailingAddress: bindIncoming.mailing_address || lead?.mailingAddress,
      city: bindIncoming.city || lead?.city,
      state: bindIncoming.state || lead?.state || "FL",
      zip: bindIncoming.zip || lead?.zip,
      dateOfBirth: bindIncoming.date_of_birth || lead?.dateOfBirth,
    });
    if (existing) {
      contactId = existing.id;
    } else {
      const [contact] = await db
        .insert(contacts)
        .values({
          tenantId: DEFAULT_TENANT_ID,
          ...copied,
          source: deal.source || lead?.source || null,
          tags: carryLeadTagsToContact(lead?.tags),
          tenureStart: new Date(),
        })
        .returning();
      contactId = contact.id;
    }
  }

  if (contactId) {
    await applyEmptyOnlyContactBind({
      contactId,
      dealId,
      leadId: deal.leadId,
      sheetValues,
      lead,
      dealSource: deal.source,
      risk,
    });
  }

  if (commercialMix && !accountId) {
    const identity = {
      name:
        str(formData, "businessName") ||
        `${lead?.lastName ?? deal.primaryNamedInsured ?? "Bound"} ${deal.lineOfBusiness}`.trim(),
      ein: str(formData, "ein") || null,
    };
    const copied = accountFieldsFromSheet(sheetValues, {
      ...identity,
      email: lead?.email,
      phone: lead?.phone,
      mailingAddress: risk?.address1 || lead?.mailingAddress,
      city: risk?.city || lead?.city,
      state: risk?.state || lead?.state || "FL",
      zip: risk?.zip || lead?.zip,
    });
    const existing = await findMatchingAccount(identity);
    if (existing) {
      accountId = existing.id;
    } else {
      const [account] = await db
        .insert(accounts)
        .values({
          tenantId: DEFAULT_TENANT_ID,
          name: copied.name,
          ...writeEin(copied.ein),
          email: copied.email,
          phone: copied.phone,
          mailingAddress: copied.mailingAddress,
          city: copied.city,
          state: copied.state,
          zip: copied.zip,
          employeeCount: copied.employeeCount,
          annualSales: copied.annualSales,
          payrollW2: copied.payrollW2,
          payroll1099: copied.payroll1099,
          payrollTotal: copied.payrollTotal,
          tenureStart: new Date(),
        })
        .returning();
      accountId = account.id;
    }
  }

  if (contactId && accountId) {
    const existingLink = await db
      .select()
      .from(contactAccounts)
      .where(eq(contactAccounts.contactId, contactId));
    if (!existingLink.some((row) => row.accountId === accountId)) {
      await db.insert(contactAccounts).values({
        tenantId: DEFAULT_TENANT_ID,
        contactId,
        accountId,
        role: "principal",
      });
    }
  }

  const existingPolicies = await db.select().from(policies).where(eq(policies.dealId, dealId));
  const wantedLobs = lobsToBindForDeal({
    shopProducts: deal.shopProducts,
    shopLines: deal.shopLines,
    lineOfBusiness: deal.lineOfBusiness,
  });
  const linesToBind = unboundPolicyLines(wantedLobs, existingPolicies);
  const alreadyBound = existingPolicies.find((row) => wantedLobs.includes(row.lineOfBusiness));
  if (linesToBind.length === 0 && alreadyBound) {
    revalidatePath(`/deals/${dealId}`);
    redirect(`/policies/${alreadyBound.id}`);
  }

  const dealQuotes = await db.select().from(quotes).where(eq(quotes.dealId, dealId));
  const bindLogs = await db
    .select({ id: quoteAttemptLogs.id, lineOfBusiness: quoteAttemptLogs.lineOfBusiness })
    .from(quoteAttemptLogs)
    .where(eq(quoteAttemptLogs.dealId, dealId));
  const primaryLob = wantedLobs[0] ?? deal.lineOfBusiness;
  const effective = new Date();
  const expiration = new Date(effective);
  expiration.setFullYear(expiration.getFullYear() + 1);
  const wonAt = new Date();
  const formPremium = str(formData, "premium");
  const formPolicyNumber = str(formData, "policyNumber");

  const boundPolicies: (typeof policies.$inferSelect)[] = [];
  for (const [index, lob] of (linesToBind.length ? linesToBind : [deal.lineOfBusiness]).entries()) {
    const copiedQuote = pickQuoteForLine(dealQuotes, bindLogs, lob, { primaryLob });
    const premiumRaw = (index === 0 ? formPremium : "") || copiedQuote?.premium || null;
    const premiumNum = Number(index === 0 ? formPremium : "") || 0;
    const [policy] = await db
      .insert(policies)
      .values({
        tenantId: DEFAULT_TENANT_ID,
        contactId,
        accountId: isCommercialLine(lob) || commercialMix ? accountId : null,
        dealId,
        riskId: risk?.id,
        carrierId: copiedQuote?.carrierId ?? null,
        policyNumber:
          (index === 0 ? formPolicyNumber : "") ||
          `FF-${Date.now().toString().slice(-8)}${index > 0 ? String(index) : ""}`,
        lineOfBusiness: lob,
        status: "bound",
        effectiveDate: effective,
        expirationDate: expiration,
        premium: premiumRaw,
        coverageA: risk?.coverageA ?? copiedQuote?.coverageA ?? null,
        premisesAddress: streetOnlyPremises(risk?.address1 || lead?.mailingAddress, {
          city: risk?.city || lead?.city,
          state: risk?.state || lead?.state,
          zip: risk?.zip || lead?.zip,
        }) || null,
        premisesCity: risk?.city || lead?.city || null,
        premisesState: risk?.state || lead?.state || null,
        premisesZip: risk?.zip || lead?.zip || null,
      })
      .returning();
    boundPolicies.push(policy);

    if (premiumNum > 0) {
      const due = new Date(effective);
      due.setUTCDate(due.getUTCDate() + 30);
      const split = splitCommission(
        premiumNum,
        DEFAULT_COMMISSION_RATE_PCT,
        DEFAULT_PRODUCER_SPLIT_PCT,
      );
      await db.insert(commissions).values({
        tenantId: DEFAULT_TENANT_ID,
        agentId: actor.id,
        policyId: policy.id,
        carrierId: policy.carrierId,
        lineOfBusiness: lob,
        premium: premiumNum.toFixed(2),
        ratePct: DEFAULT_COMMISSION_RATE_PCT.toFixed(2),
        amount: split.producerAmount.toFixed(2),
        status: "pending",
        dueDate: due,
        period: periodKey(effective),
      });
    }
  }
  const policy = boundPolicies[0];
  if (!policy) throw new Error("Bind did not create a policy.");

  await db
    .update(deals)
    .set({
      contactId,
      accountId,
      bindTarget,
      pipelineStage: "bound",
      pipelineStageSlug: "closed_won",
      boundAt: wonAt,
      wonAt,
      updatedAt: new Date(),
      ownerId: deal.ownerId ?? actor.id,
    })
    .where(eq(deals.id, dealId));

  // sep7fx: explicit archive choice via due-now in-app reminder (no silent auto-schedule)
  await db.insert(alerts).values({
    tenantId: DEFAULT_TENANT_ID,
    kind: DEAL_ARCHIVE_REMINDER_KIND,
    title: dealArchiveReminderTitle(deal.title || "Deal"),
    body: dealArchiveReminderBody(deal.title || "Deal"),
    severity: "info",
    entityType: "deal",
    entityId: dealId,
    createdAt: wonAt,
  });

  if (risk && contactId) {
    await db.update(risks).set({ contactId, updatedAt: new Date() }).where(eq(risks.id, risk.id));
  }

  await db.insert(clientHistory).values({
    tenantId: DEFAULT_TENANT_ID,
    contactId: contactId ?? null,
    accountId: accountId ?? null,
    dealId,
    policyId: policy.id,
    eventType: "bind",
    body: `Bound ${boundPolicies.map((row) => `${row.lineOfBusiness} ${row.policyNumber}`).join(", ")}. One contact, one policy per line — quotes stayed on the deal.`,
  });

  await recordPolicyFieldChanges({
    policyId: policy.id,
    before: { status: null, policyNumber: null, premium: null },
    after: {
      status: policy.status,
      policyNumber: policy.policyNumber,
      premium: policy.premium,
    },
    source: "bind",
    actor: { id: actor.id || null, name: actor.name || "Desk" },
  });

  const followUpTitle = `30-day review · ${policy.policyNumber}`;
  const [followUp] = await db
    .insert(activities)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      kind: "task",
      title: followUpTitle,
      notes: "Created at bind. Assigned to the new Contact/Business and Policy.",
      status: "open",
      dueAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      contactId: contactId ?? null,
      accountId: bindTarget === "account" ? accountId : null,
      policyId: policy.id,
      dealId,
    })
    .returning();
  await db.insert(activityLogs).values({
    tenantId: DEFAULT_TENANT_ID,
    activityId: followUp.id,
    kind: "task",
    eventType: "created",
    body: activityLogBody("task", "created", followUpTitle),
    contactId: contactId ?? null,
    accountId: bindTarget === "account" ? accountId : null,
    policyId: policy.id,
    dealId,
  });

  for (const [kind, days] of [
    ["30_day", 30],
    ["60_day", 60],
    ["90_day", 90],
    ["expiration", 350],
  ] as const) {
    const due = new Date();
    due.setDate(due.getDate() + days);
    await db.insert(reviewTasks).values({
      tenantId: DEFAULT_TENANT_ID,
      contactId,
      accountId: bindTarget === "account" ? accountId : null,
      policyId: policy.id,
      dealId,
      kind,
      title: `${kind.replace("_", "-")} review · ${policy.policyNumber}`,
      dueDate: due,
    });
  }

  await refreshPartyCounts({ contactId, accountId });

  const triggers = await db
    .select()
    .from(emailTriggers)
    .where(eq(emailTriggers.tenantId, DEFAULT_TENANT_ID));
  const drafts = scheduleWonClientEmails(wonAt);
  for (const draft of drafts) {
    const trigger = triggers.find((row) => row.kind === draft.kind);
    await db.insert(emailSendJobs).values({
      tenantId: DEFAULT_TENANT_ID,
      triggerId: trigger?.id ?? null,
      templateId: trigger?.templateId ?? null,
      contactId: contactId ?? null,
      accountId: bindTarget === "account" ? accountId : null,
      dealId,
      policyId: policy.id,
      anchorKind: draft.hangOff,
      anchorAt: wonAt,
      scheduledFor: draft.scheduledFor,
      status: "queued",
    });
  }

  await emitDeskEvent("policy.bound", {
    entityType: "policy",
    entityId: policy.id,
    dealId,
    policyNumber: policy.policyNumber,
    lineOfBusiness: policy.lineOfBusiness,
  });

  revalidatePath("/");
  revalidatePath("/policies");
  revalidatePath("/contacts");
  revalidatePath("/accounts");
  revalidatePath(`/deals/${dealId}`);
  scheduleContactCoverageNotices(contactId);
  redirect(`/policies/${policy.id}`);
}

/** Sets archived_at only. Client email jobs hang off won / policy dates and stay queued. */
export async function archiveDeal(formData: FormData) {
  const dealId = str(formData, "dealId");
  const [deal] = await db.select().from(deals).where(eq(deals.id, dealId));
  if (!deal) throw new Error("Deal not found");

  await db
    .update(deals)
    .set({ archivedAt: new Date(), updatedAt: new Date() })
    .where(eq(deals.id, dealId));

  const stillQueued = await db
    .select({ id: emailSendJobs.id })
    .from(emailSendJobs)
    .where(eq(emailSendJobs.dealId, dealId));

  if (deal.contactId) {
    await db.insert(clientHistory).values({
      tenantId: DEFAULT_TENANT_ID,
      contactId: deal.contactId,
      dealId,
      eventType: "deal_archived",
      body: `Deal archived. ${stillQueued.length} client email job(s) remain on the won / policy dates.`,
    });
  }

  revalidatePath("/");
  revalidatePath("/deals");
  revalidatePath(`/deals/${dealId}`);
  if (deal.contactId) revalidatePath(`/contacts/${deal.contactId}`);
}

/** Write Details fields before risk/sheet inserts so a later failure does not drop identity. */
async function persistNewDealLayoutValues(
  dealId: string,
  formData: FormData,
  line: {
    quotingForm: string;
    policySubType: string;
    products?: readonly string[] | null;
    lineOfBusiness?: string | null;
  },
) {
  const defs = await listFieldDefs("deals").catch(() => []);
  const catalog = defs.length ? defs : CORE_FIELDS;
  const custom = mergeCascadePrefill(
    {
      ...customValuesFromForm(formData, catalog),
      ...addressVerifyValuesFromForm(formData),
    },
    {
      shopProducts: line.products,
      quotingForm: line.quotingForm,
      policySubType: line.policySubType,
      lineOfBusiness: line.lineOfBusiness,
    },
  );
  for (const key of BUSINESS_IDENTITY_FIELD_KEYS) {
    const posted = str(formData, `field_${key}`);
    if (posted && !String(custom[key] ?? "").trim()) custom[key] = posted;
  }
  const fein = str(formData, "field_ein") || str(formData, "field_fein");
  if (fein && !String(custom.ein ?? "").trim()) custom.ein = fein;
  if (!String(custom[DEAL_SELLING_AGENCY_KEY] ?? "").trim()) {
    const agency = defaultSellingAgencyValue(
      catalog.find((field) => field.key === DEAL_SELLING_AGENCY_KEY)?.options,
    );
    if (agency) custom[DEAL_SELLING_AGENCY_KEY] = agency;
  }
  if (!String(custom[INSURED_PROPERTY_KIND_KEY] ?? "").trim()) {
    const inferred = defaultInsuredPropertyKind({
      product: custom.insurance_subtype || line.quotingForm || line.policySubType || line.lineOfBusiness,
      quotingForm: custom.insurance_subtype || line.quotingForm,
    });
    if (inferred) custom[INSURED_PROPERTY_KIND_KEY] = insuredPropertyKindLabel(inferred);
  }
  Object.assign(
    custom,
    dealListCascadeSyncValues({
      insuranceType: custom.insurance_type,
      insuranceCategory: custom.insurance_category,
      insuranceSubtype: custom.insurance_subtype,
      quotingForm: line.quotingForm,
      policySubType: line.policySubType,
    }),
  );
  if (Object.keys(custom).length) {
    await writeRecordValues(dealId, custom, "deals");
  }
  const system: Record<string, string> = {};
  for (const field of catalog) {
    if (!field.systemKey) continue;
    if (custom[field.key] != null && custom[field.key] !== "") {
      system[field.systemKey] = custom[field.key];
    }
  }
  if (Object.keys(system).length) {
    await applySystemDealValues(dealId, system);
  }
}

function seededSheetValues(line: ShopLine, products: readonly string[] = []) {
  const values = blankSheetWithDefaults(line);
  const form = defaultFormForShopLine(line);
  if (form) {
    values.quoting_form = { value: form, status: "confirmed", source: "agent" };
    const product = sheetProductForQuotingForm(form);
    if (product) {
      values.sheet_product = { value: product, status: "confirmed", source: "agent" };
    }
  }
  if (isCommercialSheetLine(line)) {
    const coverage = coverageLinesValueForDeal({ line, products });
    if (coverage) {
      values.coverage_lines = { value: coverage, status: "confirmed", source: "agent" };
    }
    if (!String(values.premises_same_as_business?.value ?? "").trim()) {
      values.premises_same_as_business = { value: "Yes", status: "confirmed", source: "agent" };
    }
  }
  return values;
}

function shopLinesFromLine(primaryLine: string): ShopLine[] {
  const fromLob = LOB_TO_SHOP_LINE[primaryLine];
  return fromLob ? [fromLob] : ["home"];
}

function shopLinesFromForm(formData: FormData, primaryLine: string): ShopLine[] {
  const checked = formData
    .getAll("shopLines")
    .map((v) => String(v))
    .filter((v): v is ShopLine => (SHOP_LINES as readonly string[]).includes(v));
  const fromLob = LOB_TO_SHOP_LINE[primaryLine];
  const next = new Set<ShopLine>(checked);
  if (fromLob) next.add(fromLob);
  if (next.size === 0) {
    next.add("home");
    next.add("auto");
  }
  return Array.from(next);
}

async function insertSheetsForDeal(
  dealId: string,
  lines: ShopLine[],
  products: readonly string[] = [],
) {
  if (lines.length === 0) return;
  const existing = await db
    .select({ line: quoteSheets.line })
    .from(quoteSheets)
    .where(eq(quoteSheets.dealId, dealId));
  const have = new Set(existing.map((row) => row.line));
  const missing = lines.filter((line) => !have.has(line));
  if (missing.length === 0) return;
  await db.insert(quoteSheets).values(
    missing.map((line) => ({
      tenantId: DEFAULT_TENANT_ID,
      dealId,
      line,
      values: seededSheetValues(line, products),
    })),
  );
}
