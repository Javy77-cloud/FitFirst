/**
 * Gaya handoff — Gloria Martinez / HO3 deal 8f4e7b68-2de3-458e-914b-ba60ea3c47aa
 * Universal P&C intended but wrong portal — Universal North America / One Alliance.
 * Username FL82532 (NordPass UNA/One Alliance item). Portal URL ERR_NAME_NOT_RESOLVED.
 * Did not thrash. Portal closed / no portal access — NOT UW decline.
 * Quote# / premium / Cov A: none.
 * Grabables: username FL82532; no password; no writer email.
 * Appetite: wrong portal vs UPCIC — need separate Universal P&C NordPass item.
 * FitFirst Mac mini ONLY. No CloudAgent. No Air.
 */
import { and, eq } from "drizzle-orm";
import { db } from "../src/lib/db";
import { carriers, quotes, quoteAttemptLogs, risks } from "../src/lib/db/schema";
import { writePortalUsername } from "../src/lib/carriers/secrets";
import { decryptSecret } from "../src/lib/secrets/vault";

const DEAL = "8f4e7b68-2de3-458e-914b-ba60ea3c47aa";
const UPC_ID = "76ccf3a7-68c2-436b-8642-554cf96391c2"; // Universal P&C (intended)
const OA_ID = "d0435525-f869-4173-8880-3b70231598b0"; // One Alliance (formerly UNA — wrong portal)
const RISK_ID = "c49fb145-5e00-4abd-ac63-a3d64a2cbb66";
const TODAY = "2026-09-13";
const USERNAME = "FL82532";

const NOTE = [
  "Couldn’t finish Universal P&C quote because wrong portal — opened NordPass UNA / One Alliance item instead of UPCIC.",
  `Username ${USERNAME} (NordPass UNA/One Alliance). Portal URL ERR_NAME_NOT_RESOLVED. Did not thrash.`,
  "Portal closed / no portal access. NOT a UW decline.",
  "No quote#. No premium. No Cov A. Form HO3.",
  "Grabables: username FL82532; no password; no writer email.",
  "Wrong portal vs UPCIC — need separate Universal P&C NordPass item.",
  "House: 8944 Adriatico LN, Kissimmee OSCEOLA — YB 2017 masonry 2-story Occupied PC3 ~52.7 mi coast.",
  "No Write/Don’t Write UW factors this attempt.",
].join(" ");

const UPC_PORTAL_LOGIN = [
  `WRONG PORTAL attempt ${TODAY}: NordPass UNA/One Alliance item (user ${USERNAME}) — portal URL ERR_NAME_NOT_RESOLVED; did not thrash.`,
  "Need separate Universal P&C / UPCIC NordPass item (AtlasBridge). Do not treat FL82532 as UPCIC username.",
  "AtlasBridge remains the UPCIC portal target.",
].join(" ");

const OA_PORTAL_LOGIN = [
  `NordPass UNA / One Alliance — username ${USERNAME}; no password this handoff; no writer email.`,
  `Portal URL ERR_NAME_NOT_RESOLVED (${TODAY} Gloria HO3) — did not thrash.`,
  "Formerly Universal North America — NOT Universal P&C / UPCIC.",
].join(" ");

async function main() {
  const [upc] = await db.select().from(carriers).where(eq(carriers.id, UPC_ID)).limit(1);
  if (!upc) throw new Error("Universal P&C not found");
  const [oa] = await db.select().from(carriers).where(eq(carriers.id, OA_ID)).limit(1);
  if (!oa) throw new Error("One Alliance not found");

  const [risk] = await db.select().from(risks).where(eq(risks.id, RISK_ID)).limit(1);
  if (!risk || risk.dealId !== DEAL) throw new Error("Gloria HO3 risk missing/mismatch");

  // Universal P&C portal card — keep AtlasBridge URLs; do NOT store UNA username as UPCIC creds
  const upcAppetiteNotesPrior = String(upc.appetiteNotes || "").trim();
  const upcAppend = [
    "",
    `Portal closed (${TODAY} Gloria HO3): wrong portal vs UPCIC — used NordPass UNA/One Alliance item user ${USERNAME}; portal URL ERR_NAME_NOT_RESOLVED; did not thrash. NOT UW decline. Need separate Universal P&C NordPass item. No quote/premium/Cov A.`,
  ].join("\n");
  let upcAppetiteNotes: string;
  if (/wrong portal vs UPCIC|ERR_NAME_NOT_RESOLVED.*FL82532|Need separate Universal P&C NordPass/i.test(upcAppetiteNotesPrior)) {
    const stripped = upcAppetiteNotesPrior
      .split("\n")
      .filter((line) => !/wrong portal vs UPCIC|ERR_NAME_NOT_RESOLVED|Need separate Universal P&C NordPass|FL82532/i.test(line))
      .join("\n")
      .trim();
    upcAppetiteNotes = [stripped, upcAppend.trim()].filter(Boolean).join("\n").trim();
  } else {
    upcAppetiteNotes = [upcAppetiteNotesPrior, upcAppend].filter(Boolean).join("\n").trim();
  }

  await db
    .update(carriers)
    .set({
      // leave portalUrl / agentPortalUrl as AtlasBridge — correct UPCIC target
      portalLogin: UPC_PORTAL_LOGIN,
      // do NOT write FL82532 onto UPCIC username fields
      appetiteNotes: upcAppetiteNotes,
      updatedAt: new Date(),
    } as any)
    .where(eq(carriers.id, UPC_ID));

  // One Alliance card — store the grabable username that actually belongs to UNA/OA
  const oaUser = writePortalUsername(USERNAME);
  await db
    .update(carriers)
    .set({
      portalLogin: OA_PORTAL_LOGIN,
      ...oaUser,
      portalPasswordEnc: null,
      portalPasswordIv: null,
      portalSecretsUpdatedAt: new Date(),
      updatedAt: new Date(),
    } as any)
    .where(eq(carriers.id, OA_ID));

  const existing = await db
    .select()
    .from(quotes)
    .where(and(eq(quotes.dealId, DEAL), eq(quotes.carrierId, UPC_ID)));

  const [log] = await db
    .insert(quoteAttemptLogs)
    .values({
      tenantId: upc.tenantId,
      dealId: DEAL,
      carrierId: UPC_ID,
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
    carrierOpenUrl: null, // ERR_NAME_NOT_RESOLVED — no working URL this attempt
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
        tenantId: upc.tenantId,
        dealId: DEAL,
        riskId: risk.id,
        carrierId: UPC_ID,
        ...patch,
      } as any)
      .returning();
    quoteId = q.id;
    mode = "created";
  }

  const [upc2] = await db.select().from(carriers).where(eq(carriers.id, UPC_ID)).limit(1);
  const [oa2] = await db.select().from(carriers).where(eq(carriers.id, OA_ID)).limit(1);
  const [q2] = await db.select().from(quotes).where(eq(quotes.id, quoteId)).limit(1);
  const [l2] = await db.select().from(quoteAttemptLogs).where(eq(quoteAttemptLogs.id, log.id)).limit(1);

  let oaUserAfter: string | null = null;
  if (oa2?.portalUsernameEnc && oa2?.portalUsernameIv) {
    oaUserAfter = decryptSecret(oa2.portalUsernameEnc, oa2.portalUsernameIv);
  }

  console.log(
    JSON.stringify(
      {
        mode,
        dealId: DEAL,
        riskId: risk.id,
        upc: {
          carrierId: UPC_ID,
          carrierName: upc2?.name,
          portalUrl: upc2?.portalUrl,
          agentPortalUrl: upc2?.agentPortalUrl,
          portalLogin: upc2?.portalLogin,
          portalUsernameHint: upc2?.portalUsernameHint,
          hasUsernameEnc: Boolean(upc2?.portalUsernameEnc),
          hasPasswordEnc: Boolean(upc2?.portalPasswordEnc),
          appetiteNotesTail: (upc2?.appetiteNotes || "").slice(-420),
          dontWriteRowsLen: Array.isArray((upc2 as any)?.dontWriteRows)
            ? ((upc2 as any).dontWriteRows as unknown[]).length
            : null,
        },
        oneAlliance: {
          carrierId: OA_ID,
          carrierName: oa2?.name,
          portalLogin: oa2?.portalLogin,
          portalUsernameHint: oa2?.portalUsernameHint,
          usernameDecrypted: oaUserAfter,
          hasPasswordEnc: Boolean(oa2?.portalPasswordEnc),
        },
        quoteId,
        appetiteLogId: log.id,
        quote: {
          riskOutcome: q2?.riskOutcome,
          nextStep: q2?.nextStep,
          bindable: q2?.bindable,
          quoteNumber: q2?.quoteNumber,
          premium: q2?.premium,
          coverageA: q2?.coverageA,
          notes: (q2?.notes || "").slice(0, 320),
        },
        appetiteLog: {
          id: l2?.id,
          result: l2?.result,
          lineOfBusiness: l2?.lineOfBusiness,
          bindable: l2?.bindable,
          quoteNumber: l2?.quoteNumber,
          premium: l2?.premium,
          covATried: l2?.covATried,
          snapYearBuilt: l2?.snapYearBuilt,
          snapCity: l2?.snapCity,
          snapCounty: l2?.snapCounty,
          why: (l2?.why || "").slice(0, 320),
        },
        amwinsAlreadyLogged: {
          quoteId: "25b94ada-c26c-4188-bd1a-1db1e69d92ba",
          appetiteLogId: "a7170a92-439e-417d-abbb-b180b6545535",
          quoteNumber: "SUB004773160",
          premium: "2180.42",
          bindable: true,
        },
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
