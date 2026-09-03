"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { refreshPartyCounts } from "@/lib/db/queries";
import {
  accounts,
  activities,
  activityLogs,
  clientHistory,
  contactAccounts,
  contacts,
  deals,
  emailSendJobs,
  emailTriggers,
  leads,
  pipelines,
  policies,
  quoteSheets,
  reviewTasks,
  risks,
} from "@/lib/db/schema";
import { activityLogBody } from "@/lib/lifecycle/activity";
import { emptySheetValues } from "@/lib/lifecycle/quote-sheet";
import { isSameLead, type LeadIdentity } from "@/lib/lifecycle/lead-match";
import {
  accountFieldsFromSheet,
  contactFieldsFromSheet,
  isSameAccount,
  isSameContact,
} from "@/lib/wire/match-party";
import { nextMorning } from "@/lib/wire/pipeline";
import { scheduleWonClientEmails } from "@/lib/wire/email-jobs";

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

export async function findMatchingLead(input: LeadIdentity) {
  const rows = await db.select().from(leads).where(eq(leads.tenantId, DEFAULT_TENANT_ID));
  return rows.find((row) => isSameLead(row, input)) ?? null;
}

export async function findOrCreateLead(
  input: LeadIdentity & { source?: string | null; notes?: string | null },
) {
  const existing = await findMatchingLead(input);
  if (existing) return { lead: existing, created: false };
  const [lead] = await db
    .insert(leads)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      firstName: input.firstName || "Unknown",
      lastName: input.lastName || "Lead",
      email: input.email || null,
      phone: input.phone || null,
      source: input.source || "manual",
      notes: input.notes || null,
      status: "new",
    })
    .returning();
  return { lead, created: true };
}

export async function createLead(formData: FormData) {
  const identity = {
    firstName: str(formData, "firstName") || "Unknown",
    lastName: str(formData, "lastName") || "Lead",
    email: str(formData, "email") || null,
    phone: str(formData, "phone") || null,
  };
  const { lead } = await findOrCreateLead({
    ...identity,
    source: str(formData, "source") || "manual",
    notes: str(formData, "notes") || null,
  });
  revalidatePath("/leads");
  redirect(`/leads/${lead.id}`);
}

export async function convertLeadToDeal(leadId: string, line = "HO", state = "FL") {
  const [lead] = await db.select().from(leads).where(eq(leads.id, leadId));
  if (!lead) throw new Error("Lead not found");
  if (lead.convertedDealId) return lead.convertedDealId;

  const pipelineSlug = line === "HEALTH" ? "health" : line === "LIFE" ? "life" : line === "FLOOD" ? "flood" : "p-c";
  const [pipeline] = await db
    .select()
    .from(pipelines)
    .where(eq(pipelines.slug, pipelineSlug));

  const [deal] = await db
    .insert(deals)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      leadId,
      title: `${lead.lastName} · ${line} shop`,
      pipelineStage: "shopping",
      pipelineId: pipeline?.id ?? null,
      pipelineStageSlug: "gather",
      lineOfBusiness: line,
      state,
      primaryNamedInsured: `${lead.firstName} ${lead.lastName}`.trim(),
    })
    .returning();

  await db.insert(risks).values({
    tenantId: DEFAULT_TENANT_ID,
    dealId: deal.id,
    riskType: deal.lineOfBusiness === "AUTO" ? "auto" : "property",
    state: deal.state,
  });

  const sheetValues = emptySheetValues();
  if (lead.email) sheetValues.notes = { value: `Lead ${lead.email}`, status: "confirmed", source: "agent" };

  await db.insert(quoteSheets).values({
    tenantId: DEFAULT_TENANT_ID,
    dealId: deal.id,
    line: deal.lineOfBusiness === "AUTO" ? "auto" : "home",
    values: sheetValues,
  });

  await db
    .update(leads)
    .set({ status: "converted", convertedDealId: deal.id, updatedAt: new Date() })
    .where(eq(leads.id, leadId));

  return deal.id;
}

export async function createDealFromLead(formData: FormData) {
  const dealId = await convertLeadToDeal(
    str(formData, "leadId"),
    str(formData, "line") || "HO",
    str(formData, "state") || "FL",
  );
  revalidatePath("/deals");
  revalidatePath("/leads");
  redirect(`/deals/${dealId}`);
}

export async function createDeal(formData: FormData) {
  const firstName = str(formData, "firstName") || "New";
  const lastName = str(formData, "lastName") || "Shop";
  const { lead } = await findOrCreateLead({
    firstName,
    lastName,
    email: str(formData, "email") || null,
    phone: str(formData, "phone") || null,
    source: "manual",
  });
  if (lead.convertedDealId) {
    revalidatePath("/deals");
    redirect(`/deals/${lead.convertedDealId}`);
  }

  const [deal] = await db
    .insert(deals)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      leadId: lead.id,
      title: `${lastName} · ${str(formData, "line") || "HO"} shop`,
      pipelineStage: "shopping",
      lineOfBusiness: str(formData, "line") || "HO",
      state: str(formData, "state") || "FL",
    })
    .returning();

  await db
    .update(leads)
    .set({ status: "converted", convertedDealId: deal.id, updatedAt: new Date() })
    .where(eq(leads.id, lead.id));

  await db.insert(risks).values({
    tenantId: DEFAULT_TENANT_ID,
    dealId: deal.id,
    riskType: deal.lineOfBusiness === "AUTO" ? "auto" : "property",
    state: deal.state,
    city: str(formData, "city") || null,
    county: str(formData, "county") || null,
  });

  await db.insert(quoteSheets).values({
    tenantId: DEFAULT_TENANT_ID,
    dealId: deal.id,
    line: deal.lineOfBusiness === "AUTO" ? "auto" : "home",
    values: emptySheetValues(),
  });

  revalidatePath("/");
  revalidatePath("/deals");
  redirect(`/deals/${deal.id}`);
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
  return rows.find((row) => isSameAccount(row, input)) ?? null;
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
    })
    .returning();
  revalidatePath("/contacts");
  redirect(`/contacts/${row.id}`);
}

export async function bindDeal(formData: FormData) {
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
      mailingAddress: risk?.address1,
      city: risk?.city,
      state: risk?.state ?? "FL",
      zip: risk?.zip,
    });
    const existing = accountId
      ? (await db.select().from(accounts).where(eq(accounts.id, accountId)))[0]
      : await findMatchingAccount(identity);
    if (existing) {
      accountId = existing.id;
    } else {
      const [account] = await db
        .insert(accounts)
        .values({
          tenantId: DEFAULT_TENANT_ID,
          name: copied.name,
          ein: copied.ein,
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
    if (existing) {
      contactId = existing.id;
    } else {
      const copied = contactFieldsFromSheet(sheetValues, {
        ...identity,
        mailingAddress: risk?.address1,
        city: risk?.city,
        state: risk?.state ?? "FL",
        zip: risk?.zip,
      });
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

  const effective = new Date();
  const expiration = new Date(effective);
  expiration.setFullYear(expiration.getFullYear() + 1);
  const premiumRaw = str(formData, "premium");
  const wonAt = new Date();

  const [policy] = await db
    .insert(policies)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      contactId: bindTarget === "account" ? null : contactId,
      accountId: bindTarget === "account" ? accountId : null,
      dealId,
      riskId: risk?.id,
      policyNumber: str(formData, "policyNumber") || `FF-${Date.now().toString().slice(-8)}`,
      lineOfBusiness: deal.lineOfBusiness,
      status: "bound",
      effectiveDate: effective,
      expirationDate: expiration,
      premium: premiumRaw ? premiumRaw : null,
      coverageA: risk?.coverageA,
      premisesAddress: risk?.address1,
      premisesCity: risk?.city,
      premisesState: risk?.state,
      premisesZip: risk?.zip,
    })
    .returning();

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
