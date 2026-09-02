"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getActor } from "@/lib/auth/session";
import { commissionAmount, periodKey } from "@/lib/commissions/math";
import { DEFAULT_COMMISSION_RATE_PCT, DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import {
  clientHistory,
  commissions,
  contacts,
  deals,
  leads,
  policies,
  reviewTasks,
  risks,
} from "@/lib/db/schema";

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

export async function createLead(formData: FormData) {
  const actor = await getActor();
  await db.insert(leads).values({
    tenantId: DEFAULT_TENANT_ID,
    firstName: str(formData, "firstName") || "Unknown",
    lastName: str(formData, "lastName") || "Lead",
    email: str(formData, "email") || null,
    phone: str(formData, "phone") || null,
    source: str(formData, "source") || "manual",
    notes: str(formData, "notes") || null,
    status: "new",
    ownerId: actor.id,
  });
  revalidatePath("/leads");
  redirect(`/leads`);
}

export async function createDealFromLead(formData: FormData) {
  const actor = await getActor();
  const leadId = str(formData, "leadId");
  const [lead] = await db.select().from(leads).where(eq(leads.id, leadId));
  if (!lead) throw new Error("Lead not found");

  const [deal] = await db
    .insert(deals)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      leadId,
      title: `${lead.lastName} · ${str(formData, "line") || "HO"} shop`,
      pipelineStage: "shopping",
      lineOfBusiness: str(formData, "line") || "HO",
      state: str(formData, "state") || "FL",
      ownerId: lead.ownerId ?? actor.id,
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

  revalidatePath("/deals");
  revalidatePath("/leads");
  redirect(`/deals/${deal.id}`);
}

export async function createDeal(formData: FormData) {
  const actor = await getActor();
  const firstName = str(formData, "firstName") || "New";
  const lastName = str(formData, "lastName") || "Shop";
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
      ownerId: actor.id,
    })
    .returning();

  const [deal] = await db
    .insert(deals)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      leadId: lead.id,
      title: `${lastName} · ${str(formData, "line") || "HO"} shop`,
      pipelineStage: "shopping",
      lineOfBusiness: str(formData, "line") || "HO",
      state: str(formData, "state") || "FL",
      ownerId: actor.id,
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

export async function createContact(formData: FormData) {
  const actor = await getActor();
  await db.insert(contacts).values({
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
    ownerId: actor.id,
  });
  revalidatePath("/contacts");
  redirect("/contacts");
}

export async function bindDeal(formData: FormData) {
  const actor = await getActor();
  const dealId = str(formData, "dealId");
  const [deal] = await db.select().from(deals).where(eq(deals.id, dealId));
  if (!deal) throw new Error("Deal not found");
  const [risk] = await db.select().from(risks).where(eq(risks.dealId, dealId));
  const ownerId = deal.ownerId ?? actor.id;

  let contactId = deal.contactId;
  if (!contactId) {
    const [lead] = deal.leadId
      ? await db.select().from(leads).where(eq(leads.id, deal.leadId))
      : [];
    const [contact] = await db
      .insert(contacts)
      .values({
        tenantId: DEFAULT_TENANT_ID,
        firstName: lead?.firstName ?? "Bound",
        lastName: lead?.lastName ?? "Client",
        email: lead?.email,
        phone: lead?.phone,
        city: risk?.city,
        state: risk?.state ?? "FL",
        zip: risk?.zip,
        tenureStart: new Date(),
        policyCount: 1,
        ownerId,
      })
      .returning();
    contactId = contact.id;
  } else {
    const [existing] = await db.select().from(contacts).where(eq(contacts.id, contactId));
    if (existing) {
      await db
        .update(contacts)
        .set({ policyCount: existing.policyCount + 1, updatedAt: new Date() })
        .where(eq(contacts.id, contactId));
    }
  }

  const effective = new Date();
  const expiration = new Date(effective);
  expiration.setFullYear(expiration.getFullYear() + 1);

  const premiumNum = Number(str(formData, "premium") || 0) || 0;
  const [policy] = await db
    .insert(policies)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      contactId,
      dealId,
      riskId: risk?.id,
      policyNumber: str(formData, "policyNumber") || `FF-${Date.now().toString().slice(-8)}`,
      lineOfBusiness: deal.lineOfBusiness,
      status: "active",
      effectiveDate: effective,
      expirationDate: expiration,
      premium: premiumNum ? String(premiumNum) : null,
      coverageA: risk?.coverageA,
      ownerId,
    })
    .returning();

  if (premiumNum > 0) {
    const due = new Date(effective);
    due.setUTCDate(due.getUTCDate() + 30);
    await db.insert(commissions).values({
      tenantId: DEFAULT_TENANT_ID,
      agentId: ownerId,
      policyId: policy.id,
      carrierId: policy.carrierId,
      lineOfBusiness: deal.lineOfBusiness,
      premium: premiumNum.toFixed(2),
      ratePct: DEFAULT_COMMISSION_RATE_PCT.toFixed(2),
      amount: commissionAmount(premiumNum, DEFAULT_COMMISSION_RATE_PCT).toFixed(2),
      status: "pending",
      dueDate: due,
      period: periodKey(effective),
    });
  }

  await db
    .update(deals)
    .set({
      contactId,
      pipelineStage: "bound",
      boundAt: new Date(),
      updatedAt: new Date(),
      ownerId,
    })
    .where(eq(deals.id, dealId));

  if (risk) {
    await db.update(risks).set({ contactId, updatedAt: new Date() }).where(eq(risks.id, risk.id));
  }

  await db.insert(clientHistory).values({
    tenantId: DEFAULT_TENANT_ID,
    contactId,
    dealId,
    policyId: policy.id,
    eventType: "bind",
    body: `Bound ${deal.lineOfBusiness} ${policy.policyNumber}. Contact + policy created only after bind.`,
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
      policyId: policy.id,
      dealId,
      kind,
      title: `${kind.replace("_", "-")} review · ${policy.policyNumber}`,
      dueDate: due,
    });
  }

  revalidatePath("/");
  revalidatePath("/policies");
  revalidatePath("/contacts");
  revalidatePath("/commissions");
  revalidatePath(`/deals/${dealId}`);
}
