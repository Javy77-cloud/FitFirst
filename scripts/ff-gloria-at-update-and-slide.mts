/**
 * Gaya handoffs — Gloria Martinez / HO3 deal 8f4e7b68-2de3-458e-914b-ba60ea3c47aa
 * 1) American Traditions — UPDATE existing quote Q5113526 (premium $1872; DOB+FCRA in; UW Next blocked)
 * 2) Slide — NEW Quotes+Appetite row (incomplete / no_quote; roof_shape missing — do NOT invent Hip)
 * FitFirst Mac mini ONLY. No CloudAgent. No Air.
 */
import { eq, and } from "drizzle-orm";
import { db } from "../src/lib/db";
import { carriers, quotes, quoteAttemptLogs, risks } from "../src/lib/db/schema";
import { writePortalUsername } from "../src/lib/carriers/secrets";
import { emptyAppetiteRow, normalizeAppetiteRows } from "../src/lib/carriers/appetite-rows";
import { decryptSecret } from "../src/lib/secrets/vault";

const DEAL = "8f4e7b68-2de3-458e-914b-ba60ea3c47aa";
const AT_ID = "e66c7eef-e6a2-44e5-8255-9fe15b11803d";
const AT_QUOTE_ID = "955c748d-46be-42bf-9fa9-b8e20476a0a3";
const SLIDE_ID = "09af41b8-86b6-4d8a-80fd-7d7ba605709d";
const TODAY = "2026-09-13";

const AT_LOGIN = "https://portal.jergermga.com/Home_Login.asp";
const AT_RESUME =
  "https://portal.jergermga.com/NOIT_Rating/frmMainRating1.aspx?pid=H&PolicyID=Q5113526&InceptionDate=09%2f14%2f2026";
const AT_USER = "AF2668";
const AT_AGENCY = "AMTRIIS10";
const AT_QUOTE_NO = "Q5113526";
const AT_PREMIUM = "1872.00";
const AT_COV_A = 434000;

const AT_NOTE = [
  "HO3 American Traditions (West Point Underwriters / AMTR) — Quoted / Conditional — NOT bindable.",
  `Quote# ${AT_QUOTE_NO}. Premium $${AT_PREMIUM} 1-pay (Financial Responsibility Credit $176).`,
  "DOB 01/16/1975 + FCRA Yes entered. Bindable false — Underwriting Next blocked (not inventing answers).",
  `Cov A ${AT_COV_A}; ded $2500 NHR / 5% HUR.`,
  "Roof shape credit accepted (Hip portal); opening protection declined; HVAC reno portal-disabled 2022; roof year 2017.",
  `Resume: ${AT_RESUME}`,
  "Username AF2668. Phones (866) 561-2800; claims (866) 561-3433 / (727) 561-0013; (866) 270-0430; custserv@westpointuw.com.",
  "House: 8944 Adriatico LN, YB 2017 masonry 2102sf PC3 flood X Occupied.",
  "UW blocked pending answers: sinkhole adjacent, damage, foreclosure/bk, prior cancel, breaker amps, electrical type, panel brands, heating, HVAC, Airbnb, lead paint, commercial proximity, residents, plumbing, converted, for sale, panel age, flat roof, sinkhole damage, smoke detectors, trampoline, under construction.",
].join(" ");

const AT_APPETITE_NOTE_APPEND = [
  "",
  `Conditional update (Gloria HO3 ${TODAY}): Quote# ${AT_QUOTE_NO} now $${AT_PREMIUM} 1-pay (FR credit $176). DOB 01/16/1975 + FCRA Yes entered — bindable still false; Underwriting Next blocked (not inventing answers). Roof Hip credit portal-only WRITE; roof year 2017 WRITE. HVAC reno 2022 portal-disabled. Ded $2500 NHR / 5% HUR Cov A ${AT_COV_A}.`,
].join("\n");

const AT_UW_BLOCK_LIST =
  "UW Next blocked pending (not inventing): sinkhole adjacent, damage, foreclosure/bk, prior cancel, breaker amps, electrical type, panel brands, heating, HVAC, Airbnb, lead paint, commercial proximity, residents, plumbing, converted, for sale, panel age, flat roof, sinkhole damage, smoke detectors, trampoline, under construction.";

const SLIDE_PORTAL = "https://agent.slideinsurance.com";
const SLIDE_RESUME = "https://agent.slideinsurance.com/policy/default.aspx";
const SLIDE_USER = "gary.h@afains.com";
const SLIDE_QUOTE_NO = "H3QFL04634499";

const SLIDE_NOTE = [
  "HO3 Slide — incomplete / no_quote — NOT a UW decline.",
  `Quote# ${SLIDE_QUOTE_NO} New Business-Pending. No premium. Cov A not reached.`,
  "Couldn't finish because roof_shape missing — roof shape required; third party did not return it (not inventing Hip from American Traditions).",
  `Resume: ${SLIDE_RESUME} (Estimated Premium step).`,
  `Portal ${SLIDE_PORTAL} username ${SLIDE_USER}.`,
  "CS/UW 800-748-2030 PolicyServices@SlideInsurance.com; agencysupport@slideinsurance.com; claims 1-866-230-3758; PO Box 15012 Worcester MA 01615.",
  "Note: Violet portal; legacy ghallock closed for FL NB.",
  "House: 8944 Adriatico LN, YB 2017 masonry 2102sf PC3 flood X Occupied.",
].join(" ");

async function updateAmericanTraditions(risk: typeof risks.$inferSelect) {
  const [carrier] = await db.select().from(carriers).where(eq(carriers.id, AT_ID)).limit(1);
  if (!carrier) throw new Error("American Traditions not found");

  const user = writePortalUsername(AT_USER);
  const existingRows = normalizeAppetiteRows(carrier.appetiteRows);

  // Structured Write fields: HVAC / electrical exist on schema; plumbing + household residents → notes (no columns).
  // Known WRITE: roof year 2017; Hip roof-shape credit portal-only (carrier appetite only — NOT sheet roof_shape).
  const gloriaRow = emptyAppetiteRow({
    dateRequested: TODAY,
    lob: "HO3",
    roofAge: "WRITE — 2017 original (~9y)",
    waterHeater: "not reached / UW blocked",
    hvac: "UW blocked — reno 2022 portal-disabled; not inventing answers",
    electrical: "UW blocked — type / panel brands / amps / panel age pending (not inventing)",
    claimsHistory: "UW blocked — prior cancel / damage / sinkhole Qs pending (not inventing)",
    acceptDecline: "accept",
    notes: [
      "WRITE roof year 2017. WRITE roof shape credit Accepted (Hip) — portal-only on this carrier row; do NOT copy Hip onto deal sheet roof_shape.",
      "Opening protection declined (None). HVAC reno portal-disabled 2022.",
      "Plumbing: UW blocked — not inventing. Household residents: UW blocked — not inventing.",
      "Also pending in notes (no structured columns): heating, Airbnb, lead paint, commercial proximity, converted, for sale, flat roof, smoke detectors, trampoline, under construction, foreclosure/bk.",
      AT_UW_BLOCK_LIST,
      `Quote# ${AT_QUOTE_NO} $${AT_PREMIUM} 1-pay FR credit $176. DOB+FCRA in; still not bindable.`,
    ].join(" "),
  });

  const kept = existingRows.filter(
    (r) =>
      !(
        r.lob === "HO3" &&
        r.dateRequested === TODAY &&
        /Q5113526|Gloria|Age of dwelling|roof year 2017|Hip portal/i.test(r.notes)
      ),
  );
  const appetiteRows = [...kept, gloriaRow];

  const priorNotes = String(carrier.appetiteNotes || "").trim();
  // Replace prior Gloria Q5113526 conditional append if present; else append update.
  let appetiteNotes: string;
  if (/Quote# Q5113526/.test(priorNotes)) {
    // Strip prior Gloria conditional lines about Q5113526, then append fresh update.
    const stripped = priorNotes
      .split("\n")
      .filter((line) => !/Q5113526|Gloria HO3 2026-09-13/i.test(line))
      .join("\n")
      .trim();
    appetiteNotes = [stripped, AT_APPETITE_NOTE_APPEND].filter(Boolean).join("\n").trim();
  } else {
    appetiteNotes = [priorNotes, AT_APPETITE_NOTE_APPEND].filter(Boolean).join("\n").trim();
  }

  await db
    .update(carriers)
    .set({
      agentPortalUrl: AT_LOGIN,
      portalUrl: AT_LOGIN,
      portalLogin: `Jerger/West Point — login ${AT_LOGIN} · resume ${AT_RESUME} · user ${AT_USER} (${AT_AGENCY}) — no password this handoff`,
      ...user,
      portalPasswordEnc: null,
      portalPasswordIv: null,
      phone: "(866) 561-2800",
      customerServicePhone: "(866) 270-0430",
      claimsPhone: "(866) 561-3433 / (727) 561-0013",
      underwriterEmail: "custserv@westpointuw.com",
      email: "custserv@westpointuw.com",
      mailingAddress: "PO Box 2800, Pinellas Park, FL 33780-2800 — West Point Underwriters",
      appetiteNotes,
      appetiteRows,
      portalSecretsUpdatedAt: new Date(),
      updatedAt: new Date(),
    } as any)
    .where(eq(carriers.id, AT_ID));

  const [log] = await db
    .insert(quoteAttemptLogs)
    .values({
      tenantId: carrier.tenantId,
      dealId: DEAL,
      carrierId: AT_ID,
      riskId: risk.id,
      lineOfBusiness: "HO",
      result: "quoted",
      bindable: false,
      quoteNumber: AT_QUOTE_NO,
      premium: AT_PREMIUM,
      covATried: 433613,
      covAForced: AT_COV_A,
      why: AT_NOTE,
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
      snapCoverageA: AT_COV_A,
      // Intentionally NO snapRoofShape — Hip is portal-credit only; sheet roof_shape not invented.
      attemptedAt: new Date(),
    } as any)
    .returning();

  const existing = await db
    .select()
    .from(quotes)
    .where(and(eq(quotes.dealId, DEAL), eq(quotes.carrierId, AT_ID)));

  const patch = {
    riskOutcome: "conditional",
    nextStep: "fixable",
    bindable: false,
    quoteNumber: AT_QUOTE_NO,
    premium: AT_PREMIUM,
    coverageA: AT_COV_A,
    hurricaneDeductible: "5%",
    aopDeductible: "2500",
    notes: AT_NOTE,
    quoteAttemptLogId: log.id,
    agentStatus: "quoted",
    stub: false,
    carrierOpenUrl: AT_RESUME,
    bindRequirements: [
      "Underwriting Next answers (not inventing) — sinkhole adjacent, damage, foreclosure/bk, prior cancel, breaker amps, electrical type, panel brands, heating, HVAC, Airbnb, lead paint, commercial proximity, residents, plumbing, converted, for sale, panel age, flat roof, sinkhole damage, smoke detectors, trampoline, under construction",
    ],
  } as any;

  let quoteId: string;
  let mode: string;
  if (existing[0]) {
    if (existing[0].id !== AT_QUOTE_ID) {
      console.warn("AT quote id changed:", existing[0].id, "expected", AT_QUOTE_ID);
    }
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
        carrierId: AT_ID,
        ...patch,
      } as any)
      .returning();
    quoteId = q.id;
    mode = "created";
  }

  const [c2] = await db.select().from(carriers).where(eq(carriers.id, AT_ID)).limit(1);
  const [q2] = await db.select().from(quotes).where(eq(quotes.id, quoteId)).limit(1);
  const [l2] = await db.select().from(quoteAttemptLogs).where(eq(quoteAttemptLogs.id, log.id)).limit(1);

  let userAfter: string | null = null;
  if (c2?.portalUsernameEnc && c2?.portalUsernameIv) {
    userAfter = decryptSecret(c2.portalUsernameEnc, c2.portalUsernameIv);
  }
  const rows = normalizeAppetiteRows(c2?.appetiteRows);
  const lastRow = rows[rows.length - 1];

  return {
    mode,
    quoteId,
    appetiteId: log.id,
    carrierId: AT_ID,
    carrierName: c2?.name,
    portalUrl: c2?.portalUrl,
    agentPortalUrl: c2?.agentPortalUrl,
    portalLogin: c2?.portalLogin,
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
          electrical: lastRow.electrical,
          waterHeater: lastRow.waterHeater,
          claimsHistory: lastRow.claimsHistory,
          acceptDecline: lastRow.acceptDecline,
          notes: lastRow.notes.slice(0, 280),
        }
      : null,
    appetiteNotesTail: (c2?.appetiteNotes || "").slice(-320),
    quote: {
      riskOutcome: q2?.riskOutcome,
      nextStep: q2?.nextStep,
      bindable: q2?.bindable,
      quoteNumber: q2?.quoteNumber,
      premium: q2?.premium,
      coverageA: q2?.coverageA,
      hurricaneDeductible: q2?.hurricaneDeductible,
      aopDeductible: q2?.aopDeductible,
      carrierOpenUrl: q2?.carrierOpenUrl,
      bindRequirements: q2?.bindRequirements,
      notes: (q2?.notes || "").slice(0, 240),
    },
    appetiteLog: {
      result: l2?.result,
      bindable: l2?.bindable,
      quoteNumber: l2?.quoteNumber,
      premium: l2?.premium,
      covAForced: l2?.covAForced,
      snapRoofYear: l2?.snapRoofYear,
      snapCoverageA: l2?.snapCoverageA,
      why: (l2?.why || "").slice(0, 220),
    },
  };
}

async function createSlide(risk: typeof risks.$inferSelect) {
  const [carrier] = await db.select().from(carriers).where(eq(carriers.id, SLIDE_ID)).limit(1);
  if (!carrier) throw new Error("Slide not found");

  const user = writePortalUsername(SLIDE_USER);

  // Quotes+Appetite: log + quote. No Write/Don't Write UW invent from AT Hip / roof_shape.
  // Optional appetite row notes incomplete reason only — acceptDecline blank (not decline).
  const existingRows = normalizeAppetiteRows(carrier.appetiteRows);
  const incompleteRow = emptyAppetiteRow({
    dateRequested: TODAY,
    lob: "HO3",
    roofAge: "",
    waterHeater: "",
    hvac: "",
    electrical: "",
    claimsHistory: "",
    acceptDecline: "",
    notes: [
      `Gloria HO3 incomplete / no_quote — NOT UW decline. Quote# ${SLIDE_QUOTE_NO} New Business-Pending.`,
      "Stopped at Estimated Premium: roof_shape required; third party did not return it.",
      "Do NOT invent Hip (or any roof_shape) from American Traditions onto sheet or this row.",
      "Violet portal; legacy ghallock closed for FL NB.",
    ].join(" "),
  });
  const kept = existingRows.filter(
    (r) => !(r.lob === "HO3" && r.dateRequested === TODAY && /H3QFL04634499|Gloria HO3 incomplete/i.test(r.notes)),
  );
  const appetiteRows = [...kept, incompleteRow];

  const priorNotes = String(carrier.appetiteNotes || "").trim();
  const append = `\nIncomplete (Gloria HO3 ${TODAY}): Quote# ${SLIDE_QUOTE_NO} NB-Pending — no_quote; roof_shape missing from third party (not inventing Hip). Violet portal; ghallock closed FL NB.`;
  const appetiteNotes = priorNotes.includes("H3QFL04634499")
    ? priorNotes
    : [priorNotes, append].filter(Boolean).join("\n").trim();

  await db
    .update(carriers)
    .set({
      agentPortalUrl: SLIDE_PORTAL,
      portalUrl: SLIDE_PORTAL,
      portalLogin: `Violet portal ${SLIDE_PORTAL} · resume ${SLIDE_RESUME} (Estimated Premium) · user ${SLIDE_USER} — legacy ghallock closed for FL NB — no password this handoff`,
      ...user,
      portalPasswordEnc: null,
      portalPasswordIv: null,
      phone: "800-748-2030",
      customerServicePhone: "800-748-2030",
      claimsPhone: "1-866-230-3758",
      underwriterEmail: "PolicyServices@SlideInsurance.com",
      email: "agencysupport@slideinsurance.com",
      mailingAddress: "PO Box 15012 Worcester MA 01615",
      appetiteNotes,
      appetiteRows,
      portalSecretsUpdatedAt: new Date(),
      updatedAt: new Date(),
    } as any)
    .where(eq(carriers.id, SLIDE_ID));

  const existing = await db
    .select()
    .from(quotes)
    .where(and(eq(quotes.dealId, DEAL), eq(quotes.carrierId, SLIDE_ID)));

  const [log] = await db
    .insert(quoteAttemptLogs)
    .values({
      tenantId: carrier.tenantId,
      dealId: DEAL,
      carrierId: SLIDE_ID,
      riskId: risk.id,
      lineOfBusiness: "HO",
      result: "no_quote",
      bindable: false,
      quoteNumber: SLIDE_QUOTE_NO,
      premium: null,
      covATried: null,
      why: SLIDE_NOTE,
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
      // NO roof_shape snap invented
      attemptedAt: new Date(),
    } as any)
    .returning();

  const patch = {
    riskOutcome: "conditional",
    nextStep: "fixable",
    bindable: false,
    quoteNumber: SLIDE_QUOTE_NO,
    premium: null,
    coverageA: null,
    notes: SLIDE_NOTE,
    quoteAttemptLogId: log.id,
    agentStatus: "quoted",
    stub: false,
    carrierOpenUrl: SLIDE_RESUME,
    bindRequirements: ["roof_shape from third party (required — not inventing Hip from AT)"],
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
        carrierId: SLIDE_ID,
        ...patch,
      } as any)
      .returning();
    quoteId = q.id;
    mode = "created";
  }

  const [c2] = await db.select().from(carriers).where(eq(carriers.id, SLIDE_ID)).limit(1);
  const [q2] = await db.select().from(quotes).where(eq(quotes.id, quoteId)).limit(1);
  const [l2] = await db.select().from(quoteAttemptLogs).where(eq(quoteAttemptLogs.id, log.id)).limit(1);

  let userAfter: string | null = null;
  if (c2?.portalUsernameEnc && c2?.portalUsernameIv) {
    userAfter = decryptSecret(c2.portalUsernameEnc, c2.portalUsernameIv);
  }
  const rows = normalizeAppetiteRows(c2?.appetiteRows);
  const lastRow = rows[rows.length - 1];

  // Confirm risk sheet was NOT patched with invented roof_shape
  const [riskAfter] = await db.select().from(risks).where(eq(risks.id, risk.id)).limit(1);
  const roofShapeKeys = Object.keys(riskAfter || {}).filter((k) => /roof.*shape|shape.*roof/i.test(k));
  const roofShapeSnap: Record<string, unknown> = {};
  for (const k of roofShapeKeys) roofShapeSnap[k] = (riskAfter as any)[k];

  return {
    mode,
    quoteId,
    appetiteId: log.id,
    carrierId: SLIDE_ID,
    carrierName: c2?.name,
    portalUrl: c2?.portalUrl,
    agentPortalUrl: c2?.agentPortalUrl,
    portalLogin: c2?.portalLogin,
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
          acceptDecline: lastRow.acceptDecline,
          notes: lastRow.notes.slice(0, 240),
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
      carrierOpenUrl: q2?.carrierOpenUrl,
      bindRequirements: q2?.bindRequirements,
      notes: (q2?.notes || "").slice(0, 240),
    },
    appetiteLog: {
      result: l2?.result,
      bindable: l2?.bindable,
      quoteNumber: l2?.quoteNumber,
      premium: l2?.premium,
      snapCoverageA: l2?.snapCoverageA,
      why: (l2?.why || "").slice(0, 220),
    },
    sheetRoofShapeUnchanged: roofShapeSnap,
  };
}

async function main() {
  const [risk] = await db.select().from(risks).where(eq(risks.dealId, DEAL)).limit(1);
  if (!risk) throw new Error("no risk for Gloria HO3");

  const americanTraditions = await updateAmericanTraditions(risk);
  const slide = await createSlide(risk);

  console.log(JSON.stringify({ dealId: DEAL, riskId: risk.id, americanTraditions, slide }, null, 2));
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
