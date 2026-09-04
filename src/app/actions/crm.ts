"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
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
import { BindBlockedError } from "@/lib/crm/bind";
import { isOutreachKind, outreachLabel, slugifyStage } from "@/lib/crm/lists";
import { db } from "@/lib/db";
import { ensurePipelineStages, refreshPartyCounts } from "@/lib/db/queries";
import {
  accounts,
  activities,
  activityLogs,
  clientHistory,
  commissions,
  contactAccounts,
  contacts,
  deals,
  emailSendJobs,
  emailTriggers,
  leads,
  pipelines,
  pipelineStages,
  policies,
  quoteSheets,
  quotes,
  reviewTasks,
  risks,
} from "@/lib/db/schema";
import { emptySheetValues } from "@/lib/quote-sheet/catalog";
import { activityLogBody } from "@/lib/lifecycle/activity";
import { isSameLead, type LeadIdentity } from "@/lib/lifecycle/lead-match";
import { leadValuesFromForm, namedInsuredFromLead } from "@/lib/crm/lead-fields";
import { fillBlankParty, fillSheetFromLead, leadOntoRisk } from "@/lib/desk/copy-once";
import {
  accountFieldsFromSheet,
  contactFieldsFromSheet,
  isSameAccount,
  isSameContact,
  normalizeEin,
} from "@/lib/wire/match-party";
import { writeEin, writeSsn } from "@/lib/pii/write";
import { piiLookupHash } from "@/lib/pii/vault";
import { nextMorning } from "@/lib/wire/pipeline";
import { scheduleWonClientEmails } from "@/lib/wire/email-jobs";

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
  },
) {
  const existing = await findMatchingLead(input);
  if (existing) return { lead: existing, created: false };
  const actor = await getActor();
  const [lead] = await db
    .insert(leads)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      ownerId: actor.id || null,
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
      status: "new",
    })
    .returning();
  return { lead, created: true };
}

export async function createLead(formData: FormData) {
  const values = leadValuesFromForm(formData);
  const { lead } = await findOrCreateLead(values);
  revalidatePath("/leads");
  redirect(`/leads/${lead.id}`);
}

export async function convertLeadToDeal(leadId: string, line = "HO", state = "FL") {
  const actor = await getActor();
  const [lead] = await db.select().from(leads).where(eq(leads.id, leadId));
  if (!lead) throw new Error("Lead not found");
  if (lead.convertedDealId) return lead.convertedDealId;

  const dealLine =
    (LINES.includes(line as (typeof LINES)[number]) ? line : null) ||
    (lead.insuranceTypeDesired && LINES.includes(lead.insuranceTypeDesired as (typeof LINES)[number])
      ? lead.insuranceTypeDesired
      : "HO");
  const pipelineSlug =
    dealLine === "HEALTH" ? "health" : dealLine === "LIFE" ? "life" : dealLine === "FLOOD" ? "flood" : "p-c";
  const [pipeline] = await db
    .select()
    .from(pipelines)
    .where(eq(pipelines.slug, pipelineSlug));
  const dealState = state || lead.state || "FL";
  const riskCopy = leadOntoRisk(lead, dealState);

  const shopLines = shopLinesFromLine(dealLine);
  const [deal] = await db
    .insert(deals)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      leadId,
      ownerId: lead.ownerId ?? actor.id ?? null,
      title: `${lead.lastName} · ${dealLine} shop`,
      pipelineStage: "shopping",
      pipelineId: pipeline?.id ?? null,
      pipelineStageSlug: "gather",
      lineOfBusiness: dealLine,
      state: dealState,
      primaryNamedInsured: namedInsuredFromLead(lead),
    })
    .returning();

  await db.insert(risks).values({
    tenantId: DEFAULT_TENANT_ID,
    dealId: deal.id,
    riskType: dealLine === "AUTO" ? "auto" : "property",
    ...riskCopy,
  });

  const sheetValues = fillSheetFromLead(lead);
  if (lead.email && !sheetValues.notes?.value) {
    sheetValues.notes = { value: `Lead ${lead.email}`, status: "confirmed", source: "agent" };
  }

  await db.insert(quoteSheets).values({
    tenantId: DEFAULT_TENANT_ID,
    dealId: deal.id,
    line: dealLine === "AUTO" ? "auto" : "home",
    values: sheetValues,
  });
  await insertSheetsForDeal(deal.id, shopLines);

  await db
    .update(leads)
    .set({ status: "converted", convertedDealId: deal.id, updatedAt: new Date() })
    .where(eq(leads.id, leadId));

  return deal.id;
}

export async function createDealFromLead(formData: FormData) {
  const leadId = str(formData, "leadId");
  const [lead] = await db.select().from(leads).where(eq(leads.id, leadId));
  const dealId = await convertLeadToDeal(
    leadId,
    str(formData, "line") || lead?.insuranceTypeDesired || "HO",
    str(formData, "state") || lead?.state || "FL",
  );
  revalidatePath("/deals");
  revalidatePath("/leads");
  redirect(`/deals/${dealId}`);
}

export async function createDeal(formData: FormData) {
  const actor = await getActor();
  const firstName = str(formData, "firstName") || "New";
  const lastName = str(formData, "lastName") || "Shop";
  const { lead } = await findOrCreateLead({
    firstName,
    lastName,
    email: str(formData, "email") || null,
    phone: str(formData, "phone") || null,
    mailingAddress: str(formData, "address1") || str(formData, "mailingAddress") || null,
    city: str(formData, "city") || null,
    state: str(formData, "state") || null,
    zip: str(formData, "zip") || null,
    source: "manual",
  });
  if (lead.convertedDealId) {
    revalidatePath("/deals");
    redirect(`/deals/${lead.convertedDealId}`);
  }

  const line = LINES.includes(str(formData, "line") as (typeof LINES)[number])
    ? str(formData, "line")
    : "HO";
  const shopLines = shopLinesFromForm(formData, line);
  const policySubType =
    line === "LIFE"
      ? str(formData, "lifeSubType") || str(formData, "policySubType") || null
      : line === "HEALTH"
        ? str(formData, "healthSubType") || str(formData, "policySubType") || null
        : str(formData, "policySubType") || null;
  const pipelineSlug = line === "HEALTH" ? "health" : line === "LIFE" ? "life" : line === "FLOOD" ? "flood" : "p-c";
  const [pipeline] = await db.select().from(pipelines).where(eq(pipelines.slug, pipelineSlug));
  const [deal] = await db
    .insert(deals)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      leadId: lead.id,
      title: `${lastName} · ${line} shop`,
      pipelineStage: "shopping",
      pipelineId: pipeline?.id ?? null,
      pipelineStageSlug: "gather",
      lineOfBusiness: line,
      policySubType,
      state: str(formData, "state") || "FL",
      ownerId: actor.id,
    })
    .returning();

  await db
    .update(leads)
    .set({ status: "converted", convertedDealId: deal.id, updatedAt: new Date() })
    .where(eq(leads.id, lead.id));

  const fromLead = leadOntoRisk(lead, deal.state);
  await db.insert(risks).values({
    tenantId: DEFAULT_TENANT_ID,
    dealId: deal.id,
    riskType: deal.lineOfBusiness === "AUTO" ? "auto" : "property",
    address1: str(formData, "address1") || fromLead.address1,
    city: str(formData, "city") || fromLead.city,
    county: str(formData, "county") || null,
    state: str(formData, "state") || fromLead.state,
    zip: str(formData, "zip") || fromLead.zip,
  });

  await db.insert(quoteSheets).values({
    tenantId: DEFAULT_TENANT_ID,
    dealId: deal.id,
    line: deal.lineOfBusiness === "AUTO" ? "auto" : "home",
    values: fillSheetFromLead(lead),
  });
  await insertSheetsForDeal(deal.id, shopLines);

  revalidatePath("/");
  revalidatePath("/deals");
  redirect(`/deals/${deal.id}`);
}

export async function createDealFromDecDrop(formData: FormData) {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Drop a declarations PDF or text file to open a shop.");
  }
  const firstName = str(formData, "firstName") || "Dec";
  const lastName = str(formData, "lastName") || "Drop";
  const line = LINES.includes(str(formData, "line") as (typeof LINES)[number])
    ? str(formData, "line")
    : "HO";

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

  const [deal] = await db
    .insert(deals)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      leadId: lead.id,
      ownerId: lead.ownerId,
      title: `${lastName} · ${line} shop`,
      pipelineStage: "shopping",
      lineOfBusiness: line,
      state: str(formData, "state") || "FL",
      primaryNamedInsured: `${firstName} ${lastName}`.trim(),
    })
    .returning();

  await db
    .update(leads)
    .set({ convertedDealId: deal.id, updatedAt: new Date() })
    .where(eq(leads.id, lead.id));

  const [risk] = await db
    .insert(risks)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      dealId: deal.id,
      riskType: line === "AUTO" ? "auto" : "property",
      state: deal.state,
    })
    .returning();

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
  const stages = await ensurePipelineStages();
  if (stages.length > 0 && !stages.some((row) => row.slug === stage || row.name === stage)) {
    throw new Error("Unknown pipeline stage");
  }
  if (stage === "bound") {
    throw new BindBlockedError("Use Bind to move a deal to bound. That is the only path that creates a policy.");
  }

  const [deal] = await db.select().from(deals).where(eq(deals.id, dealId));
  if (!deal) throw new Error("Deal not found");
  if (deal.pipelineStage === "bound") {
    throw new BindBlockedError("A bound deal stays bound. Bind already created the contact and policy.");
  }

  await db
    .update(deals)
    .set({ pipelineStage: stage, updatedAt: new Date() })
    .where(eq(deals.id, dealId));
  revalidateCrm([`/deals/${dealId}`]);
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
}

export async function findMatchingContact(input: {
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
}) {
  const rows = await db.select().from(contacts).where(eq(contacts.tenantId, DEFAULT_TENANT_ID));
  return rows.find((row) => isSameContact(row, input)) ?? null;
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
  const [row] = await db
    .insert(contacts)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      firstName: str(formData, "firstName") || "Unknown",
      lastName: str(formData, "lastName") || "Client",
      email: str(formData, "email") || null,
      phone: str(formData, "phone") || null,
      mailingAddress: str(formData, "mailingAddress") || null,
      city: str(formData, "city") || null,
      state: str(formData, "state") || "FL",
      zip: str(formData, "zip") || null,
      lifeNotes: str(formData, "lifeNotes") || null,
      healthNotes: str(formData, "healthNotes") || null,
      notes: str(formData, "notes") || null,
      ...writeSsn(str(formData, "ssn") || null),
    })
    .returning();
  revalidatePath("/contacts");
  redirect(`/contacts/${row.id}`);
}

async function sheetValuesForDeal(dealId: string): Promise<Record<string, QuoteSheetFieldValue>> {
  const sheets = await db
    .select()
    .from(quoteSheets)
    .where(and(eq(quoteSheets.tenantId, DEFAULT_TENANT_ID), eq(quoteSheets.dealId, dealId)));
  const home = sheets.find((s) => s.line === "home");
  return (home ?? sheets[0])?.values ?? {};
}

export async function bindDeal(formData: FormData) {
  const actor = await getActor();
  const dealId = str(formData, "dealId");
  const [deal] = await db.select().from(deals).where(eq(deals.id, dealId));
  if (!deal) throw new Error("Deal not found");
  const [risk] = await db.select().from(risks).where(eq(risks.dealId, dealId));
  const [lead] = deal.leadId
    ? await db.select().from(leads).where(eq(leads.id, deal.leadId))
    : [];

  const bindTarget = str(formData, "bindTarget") || deal.bindTarget || "contact";
  let contactId = deal.contactId;
  let accountId = deal.accountId;
  const [sheet] = await db
    .select()
    .from(quoteSheets)
    .where(eq(quoteSheets.dealId, dealId));
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
  } else if (!contactId) {
    const identity = {
      firstName: lead?.firstName ?? "Bound",
      lastName: lead?.lastName ?? "Client",
      email: lead?.email,
      phone: lead?.phone,
    };
    const existing = await findMatchingContact(identity);
    const copied = contactFieldsFromSheet(sheetValues, {
      ...identity,
      mailingAddress: risk?.address1 || lead?.mailingAddress,
      city: risk?.city || lead?.city,
      state: risk?.state || lead?.state || "FL",
      zip: risk?.zip || lead?.zip,
      dateOfBirth: lead?.dateOfBirth,
    });
    if (existing) {
      contactId = existing.id;
      const filled = fillBlankParty(existing, copied);
      await db
        .update(contacts)
        .set({
          mailingAddress: filled.mailingAddress,
          city: filled.city,
          state: filled.state,
          zip: filled.zip,
          phone: filled.phone,
          email: filled.email,
          dateOfBirth: filled.dateOfBirth,
          updatedAt: new Date(),
        })
        .where(eq(contacts.id, existing.id));
    } else {
      const [contact] = await db
        .insert(contacts)
        .values({
          tenantId: DEFAULT_TENANT_ID,
          ...copied,
          tenureStart: new Date(),
        })
        .returning();
      contactId = contact.id;
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
  const alreadyBound = existingPolicies.find((row) => row.lineOfBusiness === deal.lineOfBusiness);
  if (alreadyBound) {
    revalidatePath(`/deals/${dealId}`);
    redirect(`/policies/${alreadyBound.id}`);
  }

  const dealQuotes = await db.select().from(quotes).where(eq(quotes.dealId, dealId));
  const copiedQuote = dealQuotes.find((row) => row.bindable) ?? dealQuotes[0];
  const effective = new Date();
  const expiration = new Date(effective);
  expiration.setFullYear(expiration.getFullYear() + 1);
  const premiumRaw = str(formData, "premium") || copiedQuote?.premium || null;
  const wonAt = new Date();

  const premiumNum = Number(str(formData, "premium") || 0) || 0;
  const [policy] = await db
    .insert(policies)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      contactId: bindTarget === "account" ? null : contactId,
      accountId: bindTarget === "account" ? accountId : null,
      dealId,
      riskId: risk?.id,
      carrierId: copiedQuote?.carrierId ?? null,
      policyNumber: str(formData, "policyNumber") || `FF-${Date.now().toString().slice(-8)}`,
      lineOfBusiness: deal.lineOfBusiness,
      status: "bound",
      effectiveDate: effective,
      expirationDate: expiration,
      premium: premiumRaw,
      coverageA: risk?.coverageA ?? copiedQuote?.coverageA ?? null,
      premisesAddress: risk?.address1 || lead?.mailingAddress || null,
      premisesCity: risk?.city || lead?.city || null,
      premisesState: risk?.state || lead?.state || null,
      premisesZip: risk?.zip || lead?.zip || null,
    })
    .returning();

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
      lineOfBusiness: deal.lineOfBusiness,
      premium: premiumNum.toFixed(2),
      ratePct: DEFAULT_COMMISSION_RATE_PCT.toFixed(2),
      amount: split.producerAmount.toFixed(2),
      status: "pending",
      dueDate: due,
      period: periodKey(effective),
    });
  }

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
      archiveScheduledAt: nextMorning(wonAt),
      updatedAt: new Date(),
      ownerId: deal.ownerId ?? actor.id,
    })
    .where(eq(deals.id, dealId));

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
    body: `Bound ${deal.lineOfBusiness} ${policy.policyNumber}. Policy created only after bind — quotes stayed on the deal.`,
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

  revalidatePath("/");
  revalidatePath("/policies");
  revalidatePath("/contacts");
  revalidatePath("/accounts");
  revalidatePath(`/deals/${dealId}`);
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

async function insertSheetsForDeal(dealId: string, lines: ShopLine[]) {
  if (lines.length === 0) return;
  await db.insert(quoteSheets).values(
    lines.map((line) => ({
      tenantId: DEFAULT_TENANT_ID,
      dealId,
      line,
      values: emptySheetValues(line),
    })),
  );
}
