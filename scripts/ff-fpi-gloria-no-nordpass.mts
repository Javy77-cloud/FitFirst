/**
 * Gaya handoff — Gloria Martinez / HO3 · Florida Peninsula (FPI)
 * Portal closed / no portal access — NOT UW decline.
 * NordPass Shared Login has no Florida Peninsula / FPI / peninsula / FPIC / Edison item;
 * no username; no URL guessed; no password typed.
 * Quote# / premium / Cov A: none. Grabables: none.
 * Appetite: Couldn’t finish because no NordPass FPI credentials.
 * Optional carrier note: need NordPass FPI item.
 * FitFirst Mac mini ONLY. No CloudAgent. No Air.
 */
import { eq, and } from "drizzle-orm";
import { db } from "../src/lib/db";
import { carriers, quotes, quoteAttemptLogs, risks } from "../src/lib/db/schema";

const DEAL = "8f4e7b68-2de3-458e-914b-ba60ea3c47aa";
const CARRIER_ID = "6a0f669f-1489-4501-83cf-197b0c90db93"; // Florida Peninsula

const NOTE = [
  "Couldn’t finish quote because no NordPass FPI credentials.",
  "NordPass Shared Login has no Florida Peninsula / FPI / peninsula / FPIC / Edison item; no username; no URL guessed; no password typed.",
  "Portal closed / no portal access. NOT a UW decline.",
  "No quote#. No premium. No Cov A. Grabables: none. Form HO3.",
  "House: 8944 Adriatico LN, Kissimmee OSCEOLA — YB 2017 masonry 2-story Occupied PC3 52.7 mi coast.",
  "No Write/Don’t Write UW factors this attempt. Carrier needs NordPass FPI item.",
].join(" ");

async function main() {
  const [carrier] = await db.select().from(carriers).where(eq(carriers.id, CARRIER_ID)).limit(1);
  if (!carrier) throw new Error("Florida Peninsula not found");
  console.log("carrier", carrier.id, carrier.name);

  // Carrier portal card — note only; do NOT invent URL / username / password; phones/emails untouched
  await db
    .update(carriers)
    .set({
      portalLogin:
        "need NordPass FPI item — Shared Login has no Florida Peninsula / FPI / peninsula / FPIC / Edison item; no username; no URL guessed; no password typed (Gloria HO3 2026-09-13)",
      // leave portalUrl / agentPortalUrl / username / password alone — nothing to store
      updatedAt: new Date(),
    } as any)
    .where(eq(carriers.id, CARRIER_ID));

  const [risk] = await db.select().from(risks).where(eq(risks.dealId, DEAL)).limit(1);
  if (!risk) throw new Error("no risk for Gloria HO3");

  const existing = await db
    .select()
    .from(quotes)
    .where(and(eq(quotes.dealId, DEAL), eq(quotes.carrierId, CARRIER_ID)));

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
      covATried: null,
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
      snapCity: risk.city ?? "Kissimmee",
      snapCounty: risk.county ?? "OSCEOLA",
      snapCoverageA: null,
      attemptedAt: new Date(),
    } as any)
    .returning();

  const patch = {
    riskOutcome: "no_option",
    nextStep: "go_back",
    bindable: false,
    quoteNumber: null,
    premium: null,
    coverageA: null,
    notes: NOTE,
    quoteAttemptLogId: log.id,
    agentStatus: "quoted",
    stub: false,
    carrierOpenUrl: null,
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

  // Verify — no dontWrite / appetite UW rows touched; no invented creds
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
        portalStatus: c2?.portalStatus,
        portalUrl: c2?.portalUrl,
        agentPortalUrl: c2?.agentPortalUrl,
        portalLogin: c2?.portalLogin,
        portalUsernameHint: c2?.portalUsernameHint,
        hasUsernameEnc: Boolean(c2?.portalUsernameEnc),
        hasPasswordEnc: Boolean(c2?.portalPasswordEnc),
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
          coverageA: q2?.coverageA,
          notes: (q2?.notes || "").slice(0, 220),
        },
        appetiteLog: {
          result: l2?.result,
          lineOfBusiness: l2?.lineOfBusiness,
          bindable: l2?.bindable,
          quoteNumber: l2?.quoteNumber,
          premium: l2?.premium,
          covATried: l2?.covATried,
          snapYearBuilt: l2?.snapYearBuilt,
          snapConstruction: l2?.snapConstruction,
          snapStories: l2?.snapStories,
          snapOccupancy: l2?.snapOccupancy,
          snapProtectionClass: l2?.snapProtectionClass,
          snapMilesToCoast: l2?.snapMilesToCoast,
          snapCoverageA: l2?.snapCoverageA,
          why: (l2?.why || "").slice(0, 220),
        },
      },
      null,
      2,
    ),
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
