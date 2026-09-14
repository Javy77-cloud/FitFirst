/**
 * Gaya handoff — Gloria Martinez / HO3 · Tower Hill
 * Couldn’t finish: CloudFront 403 after NordPass login (auth.thig.com → portal.thig.com).
 * NOT underwriting decline. No Write/Don’t Write UW factors this attempt.
 */
import { eq, and } from "drizzle-orm";
import { db } from "../src/lib/db";
import { carriers, quotes, quoteAttemptLogs, risks } from "../src/lib/db/schema";

const DEAL = "8f4e7b68-2de3-458e-914b-ba60ea3c47aa";
const CARRIER_ID = "a11e04a4-7fa6-43fe-8db5-f2d1afae4c85"; // Tower Hill
const PORTAL = "https://portal.thig.com/";
const AUTH = "https://auth.thig.com";
const USERNAME = "SLEE";

const NOTE =
  "Couldn’t finish quote because portal CloudFront 403 after login (Auth.thig.com → portal.thig.com). NordPass login succeeded; CloudFront blocked portal. NOT a UW decline. No quote#. No premium. Form HO3. House: YB 2017 masonry 2102sf 2-story 4/3 slab, flood X, PC 3, 52.7 mi coast, Occupied, Cov A 433613. No co-applicant. Username SLEE. Phones/emails none this attempt.";

async function main() {
  const [carrier] = await db.select().from(carriers).where(eq(carriers.id, CARRIER_ID)).limit(1);
  if (!carrier) throw new Error("Tower Hill not found");
  console.log("carrier", carrier.id, carrier.name);

  // Carrier portal card — username only; do NOT invent password; phones/emails untouched (none this attempt)
  await db
    .update(carriers)
    .set({
      agentPortalUrl: PORTAL,
      portalUrl: PORTAL,
      portalLogin: `${USERNAME} — ${AUTH} → ${PORTAL} (CloudFront 403 after NordPass login this attempt)`,
      portalUsernameHint: USERNAME,
      // explicitly leave phone/email alone; no password fields set
      portalSecretsUpdatedAt: new Date(),
      updatedAt: new Date(),
    } as any)
    .where(eq(carriers.id, CARRIER_ID));

  const [risk] = await db.select().from(risks).where(eq(risks.dealId, DEAL)).limit(1);
  if (!risk) throw new Error("no risk for Gloria HO3");

  const existing = await db
    .select()
    .from(quotes)
    .where(and(eq(quotes.dealId, DEAL), eq(quotes.carrierId, CARRIER_ID)));

  const covA = (risk as any).coverageA ?? 433613;

  const [log] = await db
    .insert(quoteAttemptLogs)
    .values({
      tenantId: carrier.tenantId,
      dealId: DEAL,
      carrierId: CARRIER_ID,
      riskId: risk.id,
      lineOfBusiness: "HO",
      result: "no_quote",
      bindable: false,
      quoteNumber: null,
      premium: null,
      covATried: covA,
      why: NOTE,
      snapYearBuilt: risk.yearBuilt ?? 2017,
      snapRoofYear: risk.roofYear ?? null,
      snapRoofCovering: risk.roofCovering ?? null,
      snapConstruction: risk.construction ?? "Masonry",
      snapOpeningProtection: risk.openingProtection ?? null,
      snapOccupancy: risk.occupancy ?? "Occupied",
      snapStories: risk.stories ?? 2,
      snapPool: risk.pool ?? null,
      snapProtectionClass: risk.protectionClass ?? "3",
      snapMilesToCoast: risk.milesToCoast ?? 52.7,
      snapCity: risk.city ?? null,
      snapCounty: risk.county ?? null,
      snapCoverageA: covA,
      attemptedAt: new Date(),
    } as any)
    .returning();

  const patch = {
    riskOutcome: "no_option",
    nextStep: "go_back",
    bindable: false,
    quoteNumber: null,
    premium: null,
    coverageA: covA,
    notes: NOTE,
    quoteAttemptLogId: log.id,
    agentStatus: "quoted",
    stub: false,
    carrierOpenUrl: PORTAL,
  } as any;

  let quoteId: string;
  let mode: string;
  if (existing[0]) {
    await db.update(quotes).set(patch).where(eq(quotes.id, existing[0].id));
    quoteId = existing[0].id;
    mode = "updated";
  } else {
    const [q] = await db
      .insert(quotes)
      .values({
        tenantId: carrier.tenantId,
        dealId: DEAL,
        riskId: risk.id,
        carrierId: CARRIER_ID,
        ...patch,
      } as any)
      .returning();
    quoteId = q.id;
    mode = "created";
  }

  // Verify — no dontWrite / appetite UW rows touched
  const [c2] = await db.select().from(carriers).where(eq(carriers.id, CARRIER_ID)).limit(1);
  const [q2] = await db.select().from(quotes).where(eq(quotes.id, quoteId)).limit(1);
  const [l2] = await db.select().from(quoteAttemptLogs).where(eq(quoteAttemptLogs.id, log.id)).limit(1);

  console.log(
    JSON.stringify(
      {
        mode,
        quoteId,
        appetiteId: log.id,
        carrierId: CARRIER_ID,
        carrierName: c2?.name,
        portalUrl: c2?.portalUrl,
        agentPortalUrl: c2?.agentPortalUrl,
        portalLogin: c2?.portalLogin,
        portalUsernameHint: c2?.portalUsernameHint,
        phone: c2?.phone,
        email: c2?.email,
        dontWriteRowsLen: (c2?.dontWriteRows as any)?.length ?? 0,
        appetiteRowsLen: (c2?.appetiteRows as any)?.length ?? 0,
        quote: {
          riskOutcome: q2?.riskOutcome,
          nextStep: q2?.nextStep,
          bindable: q2?.bindable,
          quoteNumber: q2?.quoteNumber,
          premium: q2?.premium,
          notes: (q2?.notes || "").slice(0, 160),
        },
        appetiteLog: {
          result: l2?.result,
          lineOfBusiness: l2?.lineOfBusiness,
          bindable: l2?.bindable,
          why: (l2?.why || "").slice(0, 160),
          snapYearBuilt: l2?.snapYearBuilt,
          snapConstruction: l2?.snapConstruction,
          snapStories: l2?.snapStories,
          snapOccupancy: l2?.snapOccupancy,
          snapProtectionClass: l2?.snapProtectionClass,
          snapMilesToCoast: l2?.snapMilesToCoast,
          snapCoverageA: l2?.snapCoverageA,
        },
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
