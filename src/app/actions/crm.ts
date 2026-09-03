"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import {
  clientHistory,
  contacts,
  deals,
  leads,
  policies,
  quoteSheets,
  reviewTasks,
  risks,
} from "@/lib/db/schema";
import type { QuoteSheetFieldValue } from "@/lib/db/schema";
import { LOB_TO_SHOP_LINE, SHOP_LINES, type ShopLine } from "@/lib/domain";
import { emptySheetValues } from "@/lib/quote-sheet/catalog";
import {
  fillContactBlanksFromSheet,
  fillPolicyBlanksFromSheet,
  parseSheetDate,
} from "@/lib/quote-sheet/apply";

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
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
  revalidatePath("/leads");
  redirect(`/leads`);
  return row;
}

export async function createDealFromLead(formData: FormData) {
  const leadId = str(formData, "leadId");
  const [lead] = await db.select().from(leads).where(eq(leads.id, leadId));
  if (!lead) throw new Error("Lead not found");

  const shopLines = shopLinesFromForm(formData, str(formData, "line") || "HO");
  const [deal] = await db
    .insert(deals)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      leadId,
      title: `${lead.lastName} · ${str(formData, "line") || "HO"} shop`,
      pipelineStage: "shopping",
      lineOfBusiness: str(formData, "line") || "HO",
      state: str(formData, "state") || "FL",
      shopLines,
    })
    .returning();

  await db.insert(risks).values({
    tenantId: DEFAULT_TENANT_ID,
    dealId: deal.id,
    riskType: deal.lineOfBusiness === "AUTO" ? "auto" : "property",
    state: deal.state,
  });
  await insertSheetsForDeal(deal.id, shopLines);

  await db
    .update(leads)
    .set({ status: "converted", convertedDealId: deal.id, updatedAt: new Date() })
    .where(eq(leads.id, leadId));

  revalidatePath("/deals");
  revalidatePath("/leads");
  redirect(`/deals/${deal.id}`);
}

export async function createDeal(formData: FormData) {
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
    })
    .returning();

  const shopLines = shopLinesFromForm(formData, str(formData, "line") || "HO");
  const [deal] = await db
    .insert(deals)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      leadId: lead.id,
      title: `${lastName} · ${str(formData, "line") || "HO"} shop`,
      pipelineStage: "shopping",
      lineOfBusiness: str(formData, "line") || "HO",
      state: str(formData, "state") || "FL",
      shopLines,
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
  await insertSheetsForDeal(deal.id, shopLines);

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
      dateOfBirth: str(formData, "dateOfBirth") || null,
      notes: str(formData, "notes") || null,
    })
    .returning();
  revalidatePath("/contacts");
  redirect("/contacts");
  return row;
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
  const dealId = str(formData, "dealId");
  const [deal] = await db.select().from(deals).where(eq(deals.id, dealId));
  if (!deal) throw new Error("Deal not found");
  const [risk] = await db.select().from(risks).where(eq(risks.dealId, dealId));
  const sheetValues = await sheetValuesForDeal(dealId);

  let contactId = deal.contactId;
  if (!contactId) {
    const [lead] = deal.leadId
      ? await db.select().from(leads).where(eq(leads.id, deal.leadId))
      : [];
    const seeded = fillContactBlanksFromSheet(
      {
        firstName: lead?.firstName ?? "Bound",
        lastName: lead?.lastName ?? "Client",
        mailingAddress: null,
        city: risk?.city ?? null,
        state: risk?.state ?? "FL",
        zip: risk?.zip ?? null,
      },
      sheetValues,
    );
    const [contact] = await db
      .insert(contacts)
      .values({
        tenantId: DEFAULT_TENANT_ID,
        firstName: seeded.firstName,
        lastName: seeded.lastName,
        email: lead?.email,
        phone: lead?.phone,
        mailingAddress: seeded.mailingAddress,
        city: seeded.city,
        state: seeded.state ?? "FL",
        zip: seeded.zip,
        tenureStart: new Date(),
        policyCount: 1,
      })
      .returning();
    contactId = contact.id;
  } else {
    const [existing] = await db.select().from(contacts).where(eq(contacts.id, contactId));
    if (existing) {
      const filled = fillContactBlanksFromSheet(
        {
          firstName: existing.firstName,
          lastName: existing.lastName,
          mailingAddress: existing.mailingAddress,
          city: existing.city,
          state: existing.state,
          zip: existing.zip,
        },
        sheetValues,
      );
      await db
        .update(contacts)
        .set({
          firstName: filled.firstName,
          lastName: filled.lastName,
          mailingAddress: filled.mailingAddress,
          city: filled.city,
          state: filled.state,
          zip: filled.zip,
          policyCount: existing.policyCount + 1,
          updatedAt: new Date(),
        })
        .where(eq(contacts.id, contactId));
    }
  }

  const typedPolicy = str(formData, "policyNumber");
  const typedPremium = str(formData, "premium");
  const fromSheet = fillPolicyBlanksFromSheet(
    {
      policyNumber: typedPolicy || null,
      coverageA: risk?.coverageA ?? null,
      premium: typedPremium ? Number(typedPremium) || null : null,
      effectiveDate: null,
      expirationDate: null,
    },
    sheetValues,
  );
  const effective = parseSheetDate(fromSheet.effectiveDate) ?? new Date();
  const parsedExp = parseSheetDate(fromSheet.expirationDate);
  const expiration = parsedExp ?? new Date(effective.getTime());
  if (!parsedExp) expiration.setUTCFullYear(effective.getUTCFullYear() + 1);

  const [policy] = await db
    .insert(policies)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      contactId,
      dealId,
      riskId: risk?.id,
      policyNumber: fromSheet.policyNumber || `FF-${Date.now().toString().slice(-8)}`,
      lineOfBusiness: deal.lineOfBusiness,
      status: "active",
      effectiveDate: effective,
      expirationDate: expiration,
      premium: fromSheet.premium != null ? String(fromSheet.premium) : null,
      coverageA: fromSheet.coverageA ?? risk?.coverageA,
    })
    .returning();

  await db
    .update(deals)
    .set({
      contactId,
      pipelineStage: "bound",
      boundAt: new Date(),
      updatedAt: new Date(),
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
  revalidatePath(`/deals/${dealId}`);
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
