/**
 * Gaya handoff — Gloria Martinez / HO3 · American Traditions (West Point / AMTR)
 * Quoted / Conditional — NOT bindable. Quote# Q5113526. Premium $2007.00 1-pay.
 * Bind blocked: portal requires Insured Birth Date (FCRA after DOB); DOB blank on purpose.
 * Same pattern as Tower Hill / ff-general helpers.
 */
import { eq, and } from "drizzle-orm";
import { db } from "../src/lib/db";
import { carriers, quotes, quoteAttemptLogs, risks } from "../src/lib/db/schema";
import { writePortalUsername } from "../src/lib/carriers/secrets";
import { emptyAppetiteRow, normalizeAppetiteRows } from "../src/lib/carriers/appetite-rows";
import { decryptSecret } from "../src/lib/secrets/vault";

const DEAL = "8f4e7b68-2de3-458e-914b-ba60ea3c47aa";
const CARRIER_ID = "e66c7eef-e6a2-44e5-8255-9fe15b11803d"; // American Traditions
const LOGIN = "https://portal.jergermga.com/Home_Login.asp";
const RATING =
  "https://portal.jergermga.com/NOIT_Rating/frmMainRating1.aspx?PolicyId=InsertH2&BusType=H";
const USER = "AF2668";
const AGENCY = "AMTRIIS10";
const QUOTE_NO = "Q5113526";
const PREMIUM = "2007.00";
const COV_A_TRIED = 433613;
const COV_A_FORCED = 434000;
const TODAY = "2026-09-13";

const NOTE =
  "HO3 American Traditions (West Point Underwriters / AMTR) — Quoted / Conditional — NOT bindable. Quote# Q5113526. Premium $2007.00 1-pay (base 1907 + other 53 + fees 47). Why not bindable: portal requires Insured Birth Date (FCRA after DOB); DOB blank on purpose. Cov A tried 433613 → forced 434000; RCE 450937 did not floor Cov A. Deductibles: requested 2% HUR / $2500 AOP rejected (capacity); took floor $2500 NHR / 5% HUR. Roof Surfaces Payment Schedule NOT added. Rated: A 434000, B 43400, C 108500, D 43400 included only (req 86723), E 300000, F 1000. Eff 09/14/2026. Territory 510 Osceola. Company AMTR #000200. Wind included. Next: go back into carrier with fixable DOB.";

const APPETITE_NOTE_APPEND = [
  "",
  `Conditional (Gloria HO3 ${TODAY}): capacity floors 5% HUR / $2500 NHR — requested 2% HUR / $2500 AOP rejected. Bind blocked on missing Insured Birth Date (FCRA after DOB). Quote# Q5113526 $2007 1-pay Cov A forced 434000 — not bindable until DOB. Roof Surfaces Payment Schedule not added this attempt.`,
].join("\n");

async function main() {
  const [carrier] = await db.select().from(carriers).where(eq(carriers.id, CARRIER_ID)).limit(1);
  if (!carrier) throw new Error("American Traditions not found");
  console.log("carrier", carrier.id, carrier.name);

  const user = writePortalUsername(USER);

  // Structured Write/Don't Write — AppetiteNoteRow has roofAge / hvac / waterHeater; NO houseAge column.
  // House age WRITE goes in notes. HVAC + water heater fields exist → leave empty with "not reached".
  const existingRows = normalizeAppetiteRows(carrier.appetiteRows);
  const gloriaRow = emptyAppetiteRow({
    dateRequested: TODAY,
    lob: "HO3",
    roofAge: "WRITE — 2017 original (~9y)",
    waterHeater: "not reached",
    hvac: "not reached",
    electrical: "",
    claimsHistory: "",
    acceptDecline: "accept",
    notes: [
      "WRITE house age: 2017 — Age of dwelling credit HUR $1470 / NHR $847 (no houseAge column on schema; recorded in notes).",
      "WRITE roof: 2017 original; Age of roof disc $44; roof shape credit Accepted $455 (Hip prefilled); opening protection Declined $280 (None); Windstorm loss mit credit $3449; roof material Tile prefilled; FBC 110; terrain B; no SWR.",
      "HVAC: not reached this attempt.",
      "Water heater: not reached this attempt.",
      "Capacity: 5% HUR floor (2% HUR rejected). Bind blocked on missing DOB (FCRA).",
    ].join(" "),
  });
  // Dedupe prior Gloria HO3 rows from today if re-run
  const kept = existingRows.filter(
    (r) => !(r.lob === "HO3" && r.dateRequested === TODAY && /Q5113526|Gloria|Age of dwelling/i.test(r.notes)),
  );
  const appetiteRows = [...kept, gloriaRow];

  const priorNotes = String(carrier.appetiteNotes || "").trim();
  const appetiteNotes = priorNotes.includes("Quote# Q5113526")
    ? priorNotes
    : [priorNotes, APPETITE_NOTE_APPEND].filter(Boolean).join("\n").trim();

  await db
    .update(carriers)
    .set({
      agentPortalUrl: LOGIN,
      portalUrl: LOGIN,
      portalLogin: `Jerger/West Point — login ${LOGIN} · rating ${RATING} · user ${USER} (${AGENCY}) — no password this handoff`,
      ...user,
      // explicitly no password
      portalPasswordEnc: null,
      portalPasswordIv: null,
      phone: "(866) 561-3433",
      customerServicePhone: "(727) 561-0013",
      claimsPhone: "(866) 270-8430",
      underwriterEmail: "custserv@westpointuw.com",
      email: "custserv@westpointuw.com",
      mailingAddress: "PO Box 2800, Pinellas Park, FL 33780-2800 — West Point Underwriters",
      appetiteNotes,
      appetiteRows,
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

  const [log] = await db
    .insert(quoteAttemptLogs)
    .values({
      tenantId: carrier.tenantId,
      dealId: DEAL,
      carrierId: CARRIER_ID,
      riskId: risk.id,
      lineOfBusiness: "HO",
      result: "quoted",
      bindable: false,
      quoteNumber: QUOTE_NO,
      premium: PREMIUM,
      covATried: COV_A_TRIED,
      covAForced: COV_A_FORCED,
      why: NOTE,
      snapYearBuilt: risk.yearBuilt ?? 2017,
      snapRoofYear: 2017,
      snapRoofCovering: "Tile",
      snapConstruction: risk.construction ?? "Masonry",
      snapOpeningProtection: "None",
      snapOccupancy: risk.occupancy ?? "Occupied",
      snapStories: risk.stories ?? 2,
      snapPool: risk.pool ?? false,
      snapProtectionClass: risk.protectionClass ?? "3",
      snapMilesToCoast: risk.milesToCoast ?? 52.7,
      snapCity: risk.city ?? "Kissimmee",
      snapCounty: risk.county ?? "OSCEOLA",
      snapCoverageA: COV_A_FORCED,
      attemptedAt: new Date(),
    } as any)
    .returning();

  const patch = {
    riskOutcome: "maybe",
    nextStep: "go_back",
    bindable: false,
    quoteNumber: QUOTE_NO,
    premium: PREMIUM,
    coverageA: COV_A_FORCED,
    hurricaneDeductible: "5%",
    aopDeductible: "2500",
    notes: NOTE,
    quoteAttemptLogId: log.id,
    agentStatus: "quoted",
    stub: false,
    carrierOpenUrl: RATING,
    bindRequirements: ["Insured Birth Date (FCRA after DOB) — blank on purpose this attempt"],
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

  const [c2] = await db.select().from(carriers).where(eq(carriers.id, CARRIER_ID)).limit(1);
  const [q2] = await db.select().from(quotes).where(eq(quotes.id, quoteId)).limit(1);
  const [l2] = await db.select().from(quoteAttemptLogs).where(eq(quoteAttemptLogs.id, log.id)).limit(1);

  let userAfter: string | null = null;
  if (c2?.portalUsernameEnc && c2?.portalUsernameIv) {
    userAfter = decryptSecret(c2.portalUsernameEnc, c2.portalUsernameIv);
  }

  const rows = normalizeAppetiteRows(c2?.appetiteRows);
  const lastRow = rows[rows.length - 1];

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
        usernameDecrypted: userAfter,
        hasPassword: Boolean(c2?.portalPasswordEnc),
        phone: c2?.phone,
        customerServicePhone: c2?.customerServicePhone,
        claimsPhone: c2?.claimsPhone,
        underwriterEmail: c2?.underwriterEmail,
        email: c2?.email,
        mailingAddress: c2?.mailingAddress,
        appetiteRowsLen: rows.length,
        appetiteRowLast: lastRow
          ? {
              id: lastRow.id,
              dateRequested: lastRow.dateRequested,
              lob: lastRow.lob,
              roofAge: lastRow.roofAge,
              hvac: lastRow.hvac,
              waterHeater: lastRow.waterHeater,
              acceptDecline: lastRow.acceptDecline,
              notes: lastRow.notes.slice(0, 220),
            }
          : null,
        appetiteNotesTail: (c2?.appetiteNotes || "").slice(-280),
        quote: {
          riskOutcome: q2?.riskOutcome,
          nextStep: q2?.nextStep,
          bindable: q2?.bindable,
          quoteNumber: q2?.quoteNumber,
          premium: q2?.premium,
          coverageA: q2?.coverageA,
          hurricaneDeductible: q2?.hurricaneDeductible,
          aopDeductible: q2?.aopDeductible,
          notes: (q2?.notes || "").slice(0, 200),
        },
        appetiteLog: {
          result: l2?.result,
          lineOfBusiness: l2?.lineOfBusiness,
          bindable: l2?.bindable,
          quoteNumber: l2?.quoteNumber,
          premium: l2?.premium,
          covATried: l2?.covATried,
          covAForced: l2?.covAForced,
          snapYearBuilt: l2?.snapYearBuilt,
          snapRoofYear: l2?.snapRoofYear,
          snapRoofCovering: l2?.snapRoofCovering,
          snapCoverageA: l2?.snapCoverageA,
          why: (l2?.why || "").slice(0, 200),
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
