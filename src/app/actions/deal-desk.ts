"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { currentDeskSession } from "@/lib/auth/session";
import { requireAdminAction } from "@/lib/auth/guards";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import {
  alerts,
  deals,
  fillLearningLogs,
  quoteAttemptLogs,
  quotes,
  reviewTasks,
  risks,
} from "@/lib/db/schema";
import { isUuid } from "@/lib/ids";
import { EXPLICIT_MARKET_ACTION_MARKER, MANUAL_MARKET_MARKER } from "@/lib/deals/manual-markets";
import { confirmWhy, type QuoteConfirmKind } from "@/lib/deals/quote-confirm";
import { flashAction } from "@/lib/flash-action";
import { DEAL_ID } from "@/lib/fixtures/ids";

function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

export async function addManualMarket(formData: FormData) {
  const dealId = str(formData, "dealId");
  const carrierId = str(formData, "carrierId");
  if (!isUuid(dealId) || !isUuid(carrierId)) throw new Error("Pick a carrier from the list.");
  const [deal] = await db.select().from(deals).where(eq(deals.id, dealId));
  const [risk] = await db.select().from(risks).where(eq(risks.dealId, dealId));
  if (!deal || !risk) throw new Error("Deal or master risk is missing.");

  await db.insert(quoteAttemptLogs).values({
    tenantId: DEFAULT_TENANT_ID,
    dealId,
    riskId: risk.id,
    carrierId,
    lineOfBusiness: deal.lineOfBusiness || "HO",
    result: "maybe",
    bindable: false,
    why: `${MANUAL_MARKET_MARKER} ${EXPLICIT_MARKET_ACTION_MARKER} Agent added this carrier. Overrides appetite even when the system says skip.`,
    snapYearBuilt: risk.yearBuilt,
    snapRoofYear: risk.roofYear,
    snapRoofCovering: risk.roofCovering,
    snapConstruction: risk.construction,
    snapOpeningProtection: risk.openingProtection,
    snapOccupancy: risk.occupancy,
    snapStories: risk.stories,
    snapPool: risk.pool,
    snapProtectionClass: risk.protectionClass,
    snapMilesToCoast: risk.milesToCoast,
    snapCity: risk.city,
    snapCounty: risk.county,
    snapCoverageA: risk.coverageA,
  });

  revalidatePath(`/deals/${dealId}`);
  flashAction(`/deals/${dealId}?tab=markets`, "market-added");
}

export async function confirmQuotePull(formData: FormData) {
  const dealId = str(formData, "dealId");
  const carrierId = str(formData, "carrierId");
  const quoteId = str(formData, "quoteId");
  const formId = str(formData, "formId") || "HO3";
  const kind = str(formData, "kind") as QuoteConfirmKind;
  if (!isUuid(dealId) || !isUuid(carrierId)) throw new Error("Quote confirm is missing a carrier.");
  if (kind !== "first" && kind !== "sample") throw new Error("Unknown confirm kind.");

  const [deal] = await db.select().from(deals).where(eq(deals.id, dealId));
  const [risk] = await db.select().from(risks).where(eq(risks.dealId, dealId));
  if (!deal || !risk) throw new Error("Deal or master risk is missing.");
  const [quote] = quoteId
    ? await db.select().from(quotes).where(eq(quotes.id, quoteId))
    : [];

  await db.insert(quoteAttemptLogs).values({
    tenantId: DEFAULT_TENANT_ID,
    dealId,
    riskId: risk.id,
    carrierId,
    lineOfBusiness: deal.lineOfBusiness || "HO",
    result: "quoted",
    bindable: quote?.bindable ?? false,
    quoteNumber: quote?.quoteNumber ?? null,
    premium: quote?.premium ?? null,
    covATried: quote?.coverageA ?? risk.coverageA,
    why: confirmWhy(kind, formId),
    snapYearBuilt: risk.yearBuilt,
    snapRoofYear: risk.roofYear,
    snapRoofCovering: risk.roofCovering,
    snapConstruction: risk.construction,
    snapCoverageA: risk.coverageA,
  });

  revalidatePath(`/deals/${dealId}`);
}

export async function flagQuotePullForAdmin(formData: FormData) {
  const dealId = str(formData, "dealId");
  const carrierId = str(formData, "carrierId");
  const carrierName = str(formData, "carrierName") || "Carrier";
  const formId = str(formData, "formId") || "HO3";
  const reason = str(formData, "reason") || "Low-confidence or denied pull";
  if (!isUuid(dealId) || !isUuid(carrierId)) throw new Error("Correction task needs a carrier.");

  const [deal] = await db.select().from(deals).where(eq(deals.id, dealId));
  const [risk] = await db.select().from(risks).where(eq(risks.dealId, dealId));
  if (!deal || !risk) throw new Error("Deal or master risk is missing.");

  await db.insert(quoteAttemptLogs).values({
    tenantId: DEFAULT_TENANT_ID,
    dealId,
    riskId: risk.id,
    carrierId,
    lineOfBusiness: deal.lineOfBusiness || "HO",
    result: "declined",
    bindable: false,
    why: confirmWhy("admin", formId),
  });

  const due = new Date();
  due.setUTCDate(due.getUTCDate() + 1);
  await db.insert(reviewTasks).values({
    tenantId: DEFAULT_TENANT_ID,
    dealId,
    kind: "quote_correction",
    title: `Correct ${carrierName} ${formId} pull — ${reason}`,
    dueDate: due,
    status: "open",
  });
  await db.insert(alerts).values({
    tenantId: DEFAULT_TENANT_ID,
    kind: "quote_correction",
    title: `Quote pull needs a correction rule`,
    body: `${carrierName} · ${formId} on ${deal.title}. ${reason}. Store the fix as a rule on Operations → Carrier history.`,
    severity: "warning",
    entityType: "deal",
    entityId: dealId,
  });

  revalidatePath(`/deals/${dealId}`);
  revalidatePath("/tasks");
  revalidatePath("/admin/operations/carrier-history");
}

export async function saveCarrierHistoryRule(formData: FormData) {
  await requireAdminAction("Carrier history is admin only.");
  const carrierId = str(formData, "carrierId");
  const fieldKey = str(formData, "fieldKey") || "premium";
  const extractedValue = str(formData, "extractedValue");
  const correctedValue = str(formData, "correctedValue");
  const lineOfBusiness = str(formData, "lineOfBusiness") || "HO";
  const note = str(formData, "note");
  if (!isUuid(carrierId)) throw new Error("Carrier is required.");
  if (!correctedValue) throw new Error("Enter the corrected value for the next pull.");
  if (fieldKey === "coverage_a" && extractedValue === "321000") {
    throw new Error("Ana Dib Coverage A stays $321,000. Do not remap it.");
  }

  const session = await currentDeskSession();
  const shopLine = lineOfBusiness === "AUTO" ? "auto" : "home";
  await db.insert(fillLearningLogs).values({
    tenantId: DEFAULT_TENANT_ID,
    dealId: null,
    docType: "other",
    fieldKey,
    extractedValue,
    correctedValue,
    correctedBy: session.name?.trim() || session.email || "Admin",
    correctedByUserId: session.userId,
    note: note || `Carrier-history rule · ${lineOfBusiness}. Next pull applies this automatically.`,
    carrierId,
    shopLine,
  });

  revalidatePath("/admin/operations/carrier-history");
  revalidatePath("/logs/fill-learning");
}

export async function assertAnaUnboundForBind(dealId: string) {
  if (dealId === DEAL_ID) throw new Error("Ana stays shopping. Do not bind this shop.");
}
