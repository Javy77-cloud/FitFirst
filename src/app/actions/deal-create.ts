"use server";

import { revalidatePath } from "next/cache";
import { and, desc, eq } from "drizzle-orm";
import { getActor } from "@/lib/auth/session";
import { DEFAULT_TENANT_ID, isShopLine, type ShopLine } from "@/lib/domain";
import { flashAction } from "@/lib/flash-action";
import { isUuid } from "@/lib/ids";
import { db } from "@/lib/db";
import { accounts, contacts, deals, quoteSheets, risks } from "@/lib/db/schema";
import { blankSheetWithDefaults } from "@/lib/quote-sheet/catalog";
import { loadRecordValues, writeRecordValues } from "@/lib/custom-fields/store";
import { cascadeValuesFromDealHints, mergeCascadePrefill } from "@/lib/deals/insurance-cascade";
import { persistDealWorkTab } from "@/lib/deals/work-tab";
import { formatDealTitle } from "@/lib/deals/deal-title";
import { newDealCreateHref } from "@/lib/deals/new-deal-href";
import {
  copyDealDetailValues,
  titleForCopiedDeal,
  type CreateDealPickHit,
} from "@/lib/deals/create-from-source";
import { sheetProductForQuotingForm } from "@/lib/deals/deal-line";
import {
  defaultFormForShopLine,
  packageCreateDraft,
  packageLinesFromForm,
  packageLinesFromFormOrUndefined,
} from "@/lib/deals/package-lines";
import { NEW_DEAL_PIPELINE_STAGE, seedNewDealShopFlow } from "@/lib/deals/new-deal-write";
import { scheduleContactCoverageNotices } from "@/lib/coverage/schedule-notices";
import { requireInsertedRisk, riskTypeForDeal } from "@/lib/deals/ensure-risk";
import { matchesQuery } from "@/lib/wire/search";

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function shopLinesFor(row: { shopLines?: string[] | null; lineOfBusiness?: string | null }): ShopLine[] {
  const fromRow = (row.shopLines ?? []).filter(isShopLine);
  if (fromRow.length) return fromRow;
  const lob = (row.lineOfBusiness ?? "HO").toUpperCase();
  if (lob === "AUTO") return ["auto"];
  if (lob === "FLOOD") return ["flood"];
  if (lob === "LIFE") return ["life"];
  if (lob === "HEALTH") return ["health"];
  return ["home"];
}

function seededSheetValues(line: ShopLine) {
  const values = blankSheetWithDefaults(line);
  const form = defaultFormForShopLine(line);
  if (form) {
    values.quoting_form = { value: form, status: "confirmed", source: "agent" };
    const product = sheetProductForQuotingForm(form);
    if (product) {
      values.sheet_product = { value: product, status: "confirmed", source: "agent" };
    }
  }
  return values;
}

async function insertBlankSheets(dealId: string, lines: ShopLine[]) {
  if (!lines.length) return;
  await db.insert(quoteSheets).values(
    lines.map((line) => ({
      tenantId: DEFAULT_TENANT_ID,
      dealId,
      line,
      values: seededSheetValues(line),
    })),
  );
}

function revalidateDeal(dealId: string) {
  try {
    revalidatePath("/");
    revalidatePath("/deals");
    revalidatePath(`/deals/${dealId}`);
  } catch {
    // Outside a Next request (scripts / tests) revalidate is a no-op.
  }
}

/**
 * Add New Deal / scratch navigation — never inserts a deals row.
 * Opens `/deals/new`; Save Deal (`createDeal`) is the only insert.
 */
export async function createDealFromScratch(
  formData?: FormData,
): Promise<{ ok: true; id: string; href: string } | { ok: false; message: string }> {
  const draft = packageCreateDraft(packageLinesFromForm(formData));
  return {
    ok: true,
    id: "",
    href: newDealCreateHref({ shopLines: draft.shopLines }),
  };
}

/** Form/action wrapper that redirects after scratch create. */
export async function createDealFromScratchAction(formData?: FormData) {
  const result = await createDealFromScratch(formData);
  if (!result.ok) throw new Error(result.message);
  flashAction(result.href, "deal-saved");
}

type SourceBundle = {
  deal: typeof deals.$inferSelect;
  contact: typeof contacts.$inferSelect | null;
  account: typeof accounts.$inferSelect | null;
  custom: Record<string, string>;
  risk: typeof risks.$inferSelect | null;
};

async function loadSourceDeal(dealId: string): Promise<SourceBundle | null> {
  const [deal] = await db
    .select()
    .from(deals)
    .where(and(eq(deals.tenantId, DEFAULT_TENANT_ID), eq(deals.id, dealId)));
  if (!deal) return null;
  const [[contact], [account], [risk], custom] = await Promise.all([
    deal.contactId
      ? db.select().from(contacts).where(eq(contacts.id, deal.contactId))
      : Promise.resolve([] as (typeof contacts.$inferSelect)[]),
    deal.accountId
      ? db.select().from(accounts).where(eq(accounts.id, deal.accountId))
      : Promise.resolve([] as (typeof accounts.$inferSelect)[]),
    db.select().from(risks).where(eq(risks.dealId, deal.id)).then((rows) => rows.slice(0, 1)),
    loadRecordValues(deal.id, "deals").catch(() => ({} as Record<string, string>)),
  ]);
  return {
    deal,
    contact: contact ?? null,
    account: account ?? null,
    custom,
    risk: risk ?? null,
  };
}

async function latestDealForContact(contactId: string): Promise<string | null> {
  const [row] = await db
    .select({ id: deals.id })
    .from(deals)
    .where(and(eq(deals.tenantId, DEFAULT_TENANT_ID), eq(deals.contactId, contactId)))
    .orderBy(desc(deals.updatedAt))
    .limit(1);
  return row?.id ?? null;
}

async function createCopiedDeal(
  source: SourceBundle,
  packageLines?: ReturnType<typeof packageLinesFromForm>,
): Promise<string> {
  const actor = await getActor();
  const { deal: row, contact, account, custom, risk } = source;
  const draft = packageLines?.length ? packageCreateDraft(packageLines) : null;
  const shopLines = draft?.shopLines ?? shopLinesFor(row);
  const lineOfBusiness = draft?.lineOfBusiness ?? row.lineOfBusiness;
  const quotingLine = draft?.quotingLine ?? row.quotingLine;
  const quotingForm = draft?.quotingForm ?? row.quotingForm;
  const title = titleForCopiedDeal({
    title: row.title,
    lineOfBusiness,
    primaryNamedInsured: row.primaryNamedInsured,
    firstName: contact?.firstName,
    lastName: contact?.lastName,
    accountName: account?.name,
    contact,
  });

  const [deal] = await db
    .insert(deals)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      leadId: row.leadId,
      contactId: row.contactId,
      accountId: row.accountId,
      title,
      ...NEW_DEAL_PIPELINE_STAGE,
      shopFlow: seedNewDealShopFlow({
        shopLines,
        lineOfBusiness,
        quotingLine,
        quotingForm,
        policySubType: draft?.quotingForm ?? row.policySubType,
      }),
      pipelineId: row.pipelineId,
      lineOfBusiness,
      bindTarget: row.bindTarget,
      state: row.state,
      notes: row.notes,
      primaryNamedInsured: row.primaryNamedInsured,
      secondaryNamedInsured: row.secondaryNamedInsured,
      shopLines,
      policySubType: draft?.quotingForm ?? row.policySubType,
      propertyOneliner: row.propertyOneliner,
      currentCarrier: row.currentCarrier,
      accountKind: row.accountKind,
      ownerId: row.ownerId || actor.id || null,
      source: row.source ?? "manual",
      quotingForm,
      quotingLine,
      coverageAmount: row.coverageAmount,
      tags: row.tags ?? [],
    })
    .returning();

  const [copiedRisk] = await db
    .insert(risks)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      dealId: deal.id,
      contactId: risk?.contactId ?? row.contactId,
      riskType: risk?.riskType ?? riskTypeForDeal(row),
      address1: risk?.address1,
      city: risk?.city,
      county: risk?.county,
      state: risk?.state || row.state || "FL",
      zip: risk?.zip,
      yearBuilt: risk?.yearBuilt,
      construction: risk?.construction,
      occupancy: risk?.occupancy,
      stories: risk?.stories,
      squareFeet: risk?.squareFeet,
      coverageA: risk?.coverageA,
      roofYear: risk?.roofYear,
      roofCovering: risk?.roofCovering,
      openingProtection: risk?.openingProtection,
      pool: risk?.pool,
      protectionClass: risk?.protectionClass,
      milesToCoast: risk?.milesToCoast,
      mobileHome: risk?.mobileHome,
      replacementCostEstimate: risk?.replacementCostEstimate,
      vin: risk?.vin,
      vehicleYear: risk?.vehicleYear,
      vehicleMake: risk?.vehicleMake,
      vehicleModel: risk?.vehicleModel,
      vehicleUsage: risk?.vehicleUsage,
      garagingZip: risk?.garagingZip,
    })
    .returning();
  requireInsertedRisk(copiedRisk, "Copied deal");

  await insertBlankSheets(deal.id, shopLines);

  const details = mergeCascadePrefill(copyDealDetailValues(custom), {
    shopProducts: draft?.products ?? shopLines,
    shopLines,
    lineOfBusiness,
    quotingLine,
    quotingForm,
    policySubType: draft?.quotingForm ?? row.policySubType,
  });
  if (Object.keys(details).length) {
    await writeRecordValues(deal.id, details, "deals");
  }
  await persistDealWorkTab(deal.id, "documents").catch(() => null);

  revalidateDeal(deal.id);
  scheduleContactCoverageNotices(row.contactId);
  return deal.id;
}

/** New deal for same contact, details copied from source → Documents. */
export async function createDealFromSourceDeal(
  formData: FormData,
): Promise<{ ok: boolean; message: string; href?: string; id?: string }> {
  const sourceDealId = str(formData, "sourceDealId") || str(formData, "recordId") || str(formData, "dealId");
  if (!isUuid(sourceDealId)) {
    return { ok: false, message: "Pick a deal to copy details from." };
  }
  const source = await loadSourceDeal(sourceDealId);
  if (!source) return { ok: false, message: "Deal not found." };
  const packageLines = packageLinesFromFormOrUndefined(formData);
  const id = await createCopiedDeal(source, packageLines);
  const line = packageLines ? packageCreateDraft(packageLines).quotingLine : "";
  return {
    ok: true,
    message: `Created ${source.deal.title.replace(/\s*\(copy\)\s*$/i, "").trim()} shop.`,
    href: line ? `/deals/${id}?line=${line}` : `/deals/${id}`,
    id,
  };
}

/** Redirecting variant for form posts. */
export async function createDealFromSourceDealAction(formData: FormData) {
  const result = await createDealFromSourceDeal(formData);
  if (!result.ok || !result.href) throw new Error(result.message);
  flashAction(result.href, "deal-saved");
}

/**
 * Existing-contact path: pick a deal OR a contact.
 * Contact → use that contact's latest deal when present; otherwise seed from contact.
 */
export async function createDealFromExistingPick(
  formData: FormData,
): Promise<{ ok: boolean; message: string; href?: string; id?: string }> {
  const kind = str(formData, "kind");
  const id = str(formData, "id");
  if (!isUuid(id) || (kind !== "deal" && kind !== "contact")) {
    return { ok: false, message: "Pick a deal or contact." };
  }

  if (kind === "deal") {
    const fd = new FormData();
    fd.set("sourceDealId", id);
    for (const line of formData.getAll("shopLines")) fd.append("shopLines", String(line));
    return createDealFromSourceDeal(fd);
  }

  const latestId = await latestDealForContact(id);
  if (latestId) {
    const fd = new FormData();
    fd.set("sourceDealId", latestId);
    for (const line of formData.getAll("shopLines")) fd.append("shopLines", String(line));
    return createDealFromSourceDeal(fd);
  }

  // No prior deal — create linked to contact with contact details, land Documents.
  const actor = await getActor();
  const [contact] = await db
    .select()
    .from(contacts)
    .where(and(eq(contacts.tenantId, DEFAULT_TENANT_ID), eq(contacts.id, id)));
  if (!contact) return { ok: false, message: "Contact not found." };

  const draft = packageCreateDraft(packageLinesFromForm(formData));
  const title = formatDealTitle({
    firstName: contact.firstName,
    lastName: contact.lastName,
    line: draft.lineOfBusiness,
    quotingForm: draft.quotingForm,
  });
  const [deal] = await db
    .insert(deals)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      contactId: contact.id,
      accountId: contact.accountId,
      title,
      ...NEW_DEAL_PIPELINE_STAGE,
      shopFlow: seedNewDealShopFlow({
        shopProducts: draft.products,
        shopLines: draft.shopLines,
        lineOfBusiness: draft.lineOfBusiness,
        quotingLine: draft.quotingLine,
        quotingForm: draft.quotingForm,
        policySubType: draft.quotingForm,
      }),
      lineOfBusiness: draft.lineOfBusiness,
      quotingLine: draft.quotingLine,
      quotingForm: draft.quotingForm,
      policySubType: draft.quotingForm,
      state: contact.state || "FL",
      ownerId: contact.ownerId || actor.id || null,
      source: contact.source ?? "manual",
      shopLines: draft.shopLines,
      accountKind: "personal",
      bindTarget: "contact",
      primaryNamedInsured: [contact.firstName, contact.lastName].filter(Boolean).join(" ").trim() || null,
      notes: contact.notes,
    })
    .returning();

  const [contactRisk] = await db
    .insert(risks)
    .values({
      tenantId: DEFAULT_TENANT_ID,
      dealId: deal.id,
      contactId: contact.id,
      riskType: draft.riskType,
      address1: contact.mailingAddress,
      city: contact.city,
      state: contact.state || "FL",
      zip: contact.zip,
    })
    .returning();
  requireInsertedRisk(contactRisk, "Contact deal");
  await insertBlankSheets(deal.id, draft.shopLines);

  const seeded: Record<string, string> = {};
  if (contact.firstName) seeded.first_name = contact.firstName;
  if (contact.lastName) seeded.last_name = contact.lastName;
  if (contact.email) seeded.email = contact.email;
  if (contact.phone) seeded.phone = contact.phone;
  if (contact.mailingAddress) seeded.mailing_address = contact.mailingAddress;
  if (contact.city) seeded.city = contact.city;
  if (contact.state) seeded.state = contact.state;
  if (contact.zip) seeded.zip = contact.zip;
  if (contact.notes) seeded.notes = contact.notes;
  if (seeded.first_name || seeded.last_name) {
    seeded.named_insured = [seeded.first_name, seeded.last_name].filter(Boolean).join(" ");
  }
  Object.assign(
    seeded,
    cascadeValuesFromDealHints({
      shopProducts: draft.products,
      shopLines: draft.shopLines,
      lineOfBusiness: draft.lineOfBusiness,
      quotingLine: draft.quotingLine,
      quotingForm: draft.quotingForm,
      policySubType: draft.quotingForm,
    }),
  );
  if (Object.keys(seeded).length) {
    await writeRecordValues(deal.id, seeded, "deals");
  }
  await persistDealWorkTab(deal.id, "documents").catch(() => null);

  revalidateDeal(deal.id);
  scheduleContactCoverageNotices(contact.id);
  return {
    ok: true,
    message: `Created deal for ${contact.firstName} ${contact.lastName}.`.trim(),
    href: `/deals/${deal.id}?line=${draft.quotingLine}`,
    id: deal.id,
  };
}

/** Live search for the Add New Deal → existing path (deals + contacts). */
export async function searchDealsForCreate(query: string): Promise<CreateDealPickHit[]> {
  const q = query.trim();
  if (q.length < 1) return [];

  const [dealRows, contactRows] = await Promise.all([
    db.select().from(deals).where(eq(deals.tenantId, DEFAULT_TENANT_ID)),
    db.select().from(contacts).where(eq(contacts.tenantId, DEFAULT_TENANT_ID)),
  ]);

  const hits: CreateDealPickHit[] = [];

  for (const row of dealRows) {
    if (row.archivedAt) continue;
    const contact = contactRows.find((c) => c.id === row.contactId);
    if (
      matchesQuery(
        q,
        row.title,
        row.primaryNamedInsured,
        contact?.firstName,
        contact?.lastName,
        contact?.email,
        contact?.phone,
      )
    ) {
      hits.push({
        kind: "deal",
        id: row.id,
        title: row.title,
        subtitle: [
          contact ? `${contact.firstName} ${contact.lastName}`.trim() : null,
          row.lineOfBusiness,
          "Deal",
        ]
          .filter(Boolean)
          .join(" · "),
      });
    }
  }

  for (const row of contactRows) {
    if (
      matchesQuery(q, row.firstName, row.lastName, row.email, row.phone, row.mailingAddress)
    ) {
      const latestId = dealRows
        .filter((d) => d.contactId === row.id && !d.archivedAt)
        .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt))[0]?.id;
      hits.push({
        kind: "contact",
        id: row.id,
        title: `${row.firstName} ${row.lastName}`.trim(),
        subtitle: [row.email, row.phone, latestId ? "Contact · has deal" : "Contact · new shop"]
          .filter(Boolean)
          .join(" · "),
        sourceDealId: latestId ?? null,
      });
    }
  }

  return hits
    .sort((a, b) => {
      const aDeal = a.kind === "deal" ? 0 : 1;
      const bDeal = b.kind === "deal" ? 0 : 1;
      if (aDeal !== bDeal) return aDeal - bDeal;
      return a.title.localeCompare(b.title);
    })
    .slice(0, 20);
}
