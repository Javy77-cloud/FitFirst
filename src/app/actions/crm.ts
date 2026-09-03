"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { DEAL_STAGES, DEFAULT_TENANT_ID, LINES, type DealStage } from "@/lib/domain";
import {
  BindBlockedError,
  defaultAccountKind,
  parseAccountKind,
  planBind,
  stubPolicyNumber,
} from "@/lib/crm/bind";
import { db } from "@/lib/db";
import {
  alerts,
  clientHistory,
  contacts,
  deals,
  leads,
  policies,
  reviewTasks,
  risks,
} from "@/lib/db/schema";
import { extractDocument, persistFile } from "@/app/actions/documents";

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function revalidateCrm(extra: string[] = []) {
  for (const path of [
    "/",
    "/leads",
    "/deals",
    "/contacts",
    "/policies",
    "/reviews",
    "/alerts",
    ...extra,
  ]) {
    revalidatePath(path);
  }
}

export async function createLead(formData: FormData) {
  const [row] = await db
    .insert(leads)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      firstName: str(formData, "firstName") || "Unknown",
      lastName: str(formData, "lastName") || "Lead",
      email: str(formData, "email") || null,
      phone: str(formData, "phone") || null,
      source: str(formData, "source") || "manual",
      notes: str(formData, "notes") || null,
      status: "new",
    })
    .returning();
  revalidateCrm([`/leads/${row.id}`]);
  redirect(`/leads/${row.id}`);
}

export async function updateLead(formData: FormData) {
  const leadId = str(formData, "leadId");
  const status = str(formData, "status") || "new";
  await db
    .update(leads)
    .set({
      firstName: str(formData, "firstName") || "Unknown",
      lastName: str(formData, "lastName") || "Lead",
      email: str(formData, "email") || null,
      phone: str(formData, "phone") || null,
      source: str(formData, "source") || null,
      notes: str(formData, "notes") || null,
      status,
      updatedAt: new Date(),
    })
    .where(eq(leads.id, leadId));
  revalidateCrm([`/leads/${leadId}`]);
}

export async function createDealFromLead(formData: FormData) {
  const leadId = str(formData, "leadId");
  const [lead] = await db.select().from(leads).where(eq(leads.id, leadId));
  if (!lead) throw new Error("Lead not found");

  const line = LINES.includes(str(formData, "line") as (typeof LINES)[number])
    ? str(formData, "line")
    : "HO";

  const [deal] = await db
    .insert(deals)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      leadId,
      title: `${lead.lastName} · ${line} shop`,
      pipelineStage: "shopping",
      lineOfBusiness: line,
      state: str(formData, "state") || "FL",
      notes: lead.notes,
    })
    .returning();

  await db.insert(risks).values({
    tenantId: DEFAULT_TENANT_ID,
    dealId: deal.id,
    riskType: deal.lineOfBusiness === "AUTO" ? "auto" : "property",
    state: deal.state,
  });

  await db
    .update(leads)
    .set({ status: "converted", convertedDealId: deal.id, updatedAt: new Date() })
    .where(eq(leads.id, leadId));

  revalidateCrm([`/leads/${leadId}`, `/deals/${deal.id}`]);
  redirect(`/deals/${deal.id}`);
}

export async function createDeal(formData: FormData) {
  const firstName = str(formData, "firstName") || "New";
  const lastName = str(formData, "lastName") || "Shop";
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
      source: "manual",
      status: "converted",
      notes: str(formData, "notes") || null,
    })
    .returning();

  const [deal] = await db
    .insert(deals)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      leadId: lead.id,
      title: `${lastName} · ${line} shop`,
      pipelineStage: "shopping",
      lineOfBusiness: line,
      state: str(formData, "state") || "FL",
      notes: str(formData, "notes") || null,
    })
    .returning();

  await db
    .update(leads)
    .set({ convertedDealId: deal.id, updatedAt: new Date() })
    .where(eq(leads.id, lead.id));

  await db.insert(risks).values({
    tenantId: DEFAULT_TENANT_ID,
    dealId: deal.id,
    riskType: deal.lineOfBusiness === "AUTO" ? "auto" : "property",
    state: deal.state,
    city: str(formData, "city") || null,
    county: str(formData, "county") || null,
  });

  revalidateCrm([`/deals/${deal.id}`, `/leads/${lead.id}`]);
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
      source: "dec_drop",
      status: "converted",
      notes: str(formData, "notes") || `Dec drop: ${file.name}`,
    })
    .returning();

  const [deal] = await db
    .insert(deals)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      leadId: lead.id,
      title: `${lastName} · ${line} shop`,
      pipelineStage: "shopping",
      lineOfBusiness: line,
      state: str(formData, "state") || "FL",
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
  const doc = await persistFile(
    deal.id,
    risk.id,
    file.name,
    file.type || "application/octet-stream",
    buffer,
    "dec",
  );
  await extractDocument(doc.id, deal.id);

  revalidateCrm([`/deals/${deal.id}`, `/leads/${lead.id}`]);
  redirect(`/deals/${deal.id}`);
}

export async function updateDealStage(formData: FormData) {
  const dealId = str(formData, "dealId");
  const stage = str(formData, "stage") as DealStage;
  if (!DEAL_STAGES.includes(stage)) throw new Error("Unknown pipeline stage");
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
      accountKind: parseAccountKind(str(formData, "accountKind")),
      legalName: str(formData, "legalName") || null,
      lifeNotes: str(formData, "lifeNotes") || null,
      healthNotes: str(formData, "healthNotes") || null,
      notes: str(formData, "notes") || null,
    })
    .returning();
  revalidateCrm([`/contacts/${row.id}`]);
  redirect(`/contacts/${row.id}`);
}

export async function updateContact(formData: FormData) {
  const contactId = str(formData, "contactId");
  await db
    .update(contacts)
    .set({
      firstName: str(formData, "firstName") || "Unknown",
      lastName: str(formData, "lastName") || "Client",
      email: str(formData, "email") || null,
      phone: str(formData, "phone") || null,
      mailingAddress: str(formData, "mailingAddress") || null,
      city: str(formData, "city") || null,
      state: str(formData, "state") || "FL",
      zip: str(formData, "zip") || null,
      accountKind: parseAccountKind(str(formData, "accountKind")),
      legalName: str(formData, "legalName") || null,
      lifeNotes: str(formData, "lifeNotes") || null,
      healthNotes: str(formData, "healthNotes") || null,
      notes: str(formData, "notes") || null,
      updatedAt: new Date(),
    })
    .where(eq(contacts.id, contactId));
  revalidateCrm([`/contacts/${contactId}`]);
}

export async function addContactNote(formData: FormData) {
  const contactId = str(formData, "contactId");
  const body = str(formData, "body");
  if (!body) return;
  await db.insert(clientHistory).values({
    tenantId: DEFAULT_TENANT_ID,
    contactId,
    eventType: "note",
    body,
  });
  revalidateCrm([`/contacts/${contactId}`]);
}

export async function bindDeal(formData: FormData) {
  const dealId = str(formData, "dealId");
  const now = new Date();

  const contactId = await db.transaction(async (tx) => {
    const [deal] = await tx.select().from(deals).where(eq(deals.id, dealId));
    if (!deal) throw new Error("Deal not found");
    const [risk] = await tx.select().from(risks).where(eq(risks.dealId, dealId));
    const [lead] = deal.leadId
      ? await tx.select().from(leads).where(eq(leads.id, deal.leadId))
      : [];
    const [existing] = deal.contactId
      ? await tx.select().from(contacts).where(eq(contacts.id, deal.contactId))
      : [];

    const sameLineActive = existing
      ? await tx
          .select({ id: policies.id })
          .from(policies)
          .where(
            and(
              eq(policies.contactId, existing.id),
              eq(policies.lineOfBusiness, deal.lineOfBusiness),
              eq(policies.status, "active"),
            ),
          )
      : [];

    const plan = planBind({
      deal: {
        id: deal.id,
        pipelineStage: deal.pipelineStage,
        lineOfBusiness: deal.lineOfBusiness,
        contactId: deal.contactId,
        notes: deal.notes,
      },
      lead: lead
        ? {
            firstName: lead.firstName,
            lastName: lead.lastName,
            email: lead.email,
            phone: lead.phone,
          }
        : null,
      contact: existing
        ? {
            id: existing.id,
            policyCount: existing.policyCount,
            activePolicyCount: existing.activePolicyCount,
            accountKind: existing.accountKind,
            legalName: existing.legalName,
            tenureStart: existing.tenureStart,
            lifeNotes: existing.lifeNotes,
            healthNotes: existing.healthNotes,
          }
        : null,
      risk: risk
        ? {
            id: risk.id,
            city: risk.city,
            state: risk.state,
            zip: risk.zip,
            address1: risk.address1,
            coverageA: risk.coverageA,
          }
        : null,
      policyNumber: str(formData, "policyNumber") || stubPolicyNumber(now),
      premium: str(formData, "premium") || null,
      carrierId: str(formData, "carrierId") || null,
      accountKind: str(formData, "accountKind")
        ? parseAccountKind(str(formData, "accountKind"))
        : defaultAccountKind(deal.lineOfBusiness),
      legalName: str(formData, "legalName") || null,
      replacingSameLine: sameLineActive.length > 0,
      now,
    });

    let contactId = deal.contactId;
    if (plan.createContact || !contactId) {
      const [created] = await tx
        .insert(contacts)
        .values({
          tenantId: DEFAULT_TENANT_ID,
          firstName: plan.contactDraft.firstName,
          lastName: plan.contactDraft.lastName,
          email: plan.contactDraft.email,
          phone: plan.contactDraft.phone,
          mailingAddress: plan.contactDraft.mailingAddress,
          city: plan.contactDraft.city,
          state: plan.contactDraft.state,
          zip: plan.contactDraft.zip,
          tenureStart: plan.contactDraft.tenureStart,
          policyCount: plan.contactDraft.policyCount,
          activePolicyCount: plan.contactDraft.activePolicyCount,
          accountKind: plan.contactDraft.accountKind,
          legalName: plan.contactDraft.legalName,
          lifeNotes: plan.contactDraft.lifeNotes,
          healthNotes: plan.contactDraft.healthNotes,
        })
        .returning();
      contactId = created.id;
    } else {
      await tx
        .update(contacts)
        .set({
          policyCount: plan.nextPolicyCount,
          activePolicyCount: plan.nextActivePolicyCount,
          tenureStart: plan.tenureStart,
          accountKind: plan.contactDraft.accountKind,
          legalName: plan.contactDraft.legalName,
          lifeNotes: plan.contactDraft.lifeNotes,
          healthNotes: plan.contactDraft.healthNotes,
          updatedAt: now,
        })
        .where(eq(contacts.id, contactId));
    }

    if (plan.replacingSameLine && contactId) {
      await tx
        .update(policies)
        .set({ status: "replaced", updatedAt: now })
        .where(
          and(
            eq(policies.contactId, contactId),
            eq(policies.lineOfBusiness, deal.lineOfBusiness),
            eq(policies.status, "active"),
          ),
        );
    }

    const [policy] = await tx
      .insert(policies)
      .values({
        tenantId: DEFAULT_TENANT_ID,
        contactId,
        dealId,
        riskId: plan.policy.riskId,
        carrierId: plan.policy.carrierId,
        policyNumber: plan.policy.policyNumber,
        lineOfBusiness: plan.policy.lineOfBusiness,
        status: plan.policy.status,
        effectiveDate: plan.policy.effectiveDate,
        expirationDate: plan.policy.expirationDate,
        premium: plan.policy.premium,
        coverageA: plan.policy.coverageA,
      })
      .returning();

    await tx
      .update(deals)
      .set({
        contactId,
        pipelineStage: "bound",
        boundAt: now,
        updatedAt: now,
      })
      .where(eq(deals.id, dealId));

    if (risk) {
      await tx.update(risks).set({ contactId, updatedAt: now }).where(eq(risks.id, risk.id));
    }

    await tx.insert(clientHistory).values({
      tenantId: DEFAULT_TENANT_ID,
      contactId,
      dealId,
      policyId: policy.id,
      eventType: plan.history.eventType,
      body: plan.history.body,
    });

    await tx.insert(reviewTasks).values(
      plan.tasks.map((task) => ({
        tenantId: DEFAULT_TENANT_ID,
        contactId,
        policyId: policy.id,
        dealId,
        kind: task.kind,
        title: task.title,
        dueDate: task.dueDate,
      })),
    );

    await tx.insert(alerts).values(
      plan.alerts.map((alert) => ({
        tenantId: DEFAULT_TENANT_ID,
        kind: alert.kind,
        title: alert.title,
        body: alert.body,
        severity: alert.severity,
        entityType: alert.entityType,
        entityId: alert.entityType === "policy" ? policy.id : contactId,
      })),
    );

    return contactId;
  });

  revalidateCrm([
    `/deals/${dealId}`,
    `/contacts/${contactId}`,
  ]);
  redirect(`/contacts/${contactId}`);
}
