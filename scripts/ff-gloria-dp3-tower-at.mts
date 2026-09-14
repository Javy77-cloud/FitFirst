/**
 * Gaya handoff — Gloria Martinez / DP3 deal 03dccdd7-db06-4c89-9b7a-cf0a2064d044
 * 10358 NW 30th TER, Doral FL 33172
 * 1) Tower Hill — portal CloudFront 403 (NOT UW decline); no quote; same HO3 pattern
 * 2) American Traditions DP3 — Quoted/Conditional Q5113600 $4090; not bindable (Page 4 UW HVAC)
 * FitFirst Mac mini ONLY. No CloudAgent. No Air.
 */
import { eq, and } from "drizzle-orm";
import { db } from "../src/lib/db";
import { carriers, quotes, quoteAttemptLogs, risks } from "../src/lib/db/schema";
import { writePortalUsername } from "../src/lib/carriers/secrets";
import {
  emptyAppetiteRow,
  emptyDontWriteRow,
  normalizeAppetiteRows,
  normalizeDontWriteRows,
} from "../src/lib/carriers/appetite-rows";
import { decryptSecret } from "../src/lib/secrets/vault";

const DEAL = "03dccdd7-db06-4c89-9b7a-cf0a2064d044";
const TH_ID = "a11e04a4-7fa6-43fe-8db5-f2d1afae4c85";
const AT_ID = "e66c7eef-e6a2-44e5-8255-9fe15b11803d";
const TODAY = "2026-09-13";

const TH_PORTAL = "https://portal.thig.com/";
const TH_AUTH = "https://auth.thig.com";
const TH_USER = "SLEE";

const TH_NOTE = [
  "DP3 Tower Hill — Couldn't finish / no_quote — NOT a UW decline.",
  "Portal closed CloudFront 403 after login (Auth.thig.com → portal.thig.com).",
  "Quotes+Appetite couldn't finish — same pattern as Gloria HO3 Tower Hill.",
  "No quote#. No premium. Cov A not reached this attempt.",
  `Username ${TH_USER}. Carrier grabables already known — phones/emails not reinvented.`,
  "House: 10358 NW 30th TER Doral FL 33172, YB/roof 2006 masonry 1854sf 2-story Tenant PC02 15.3 mi coast Cov A 309000 DP3 landlord.",
  "No Write/Don't Write UW factors this attempt (portal blocked before UW).",
].join(" ");

const AT_LOGIN = "https://portal.jergermga.com/Home_Login.asp";
const AT_RATING =
  "https://portal.jergermga.com/NOIT_Rating/frmMainRating1.aspx?PolicyId=InsertH2&BusType=H";
const AT_RESUME =
  "https://portal.jergermga.com/NOIT_Rating/frmMainRating1.aspx?pid=H&PolicyID=Q5113600";
const AT_USER = "AF2668";
const AT_AGENCY = "AMTRIIS10";
const AT_QUOTE_NO = "Q5113600";
const AT_PREMIUM = "4090.00";
const AT_COV_A_TRIED = 309000;
const AT_COV_A_FORCED = 351000;

const AT_NOTE = [
  "DP3 American Traditions (West Point Underwriters / AMTR) — Quoted / Conditional — NOT bindable.",
  `Quote# ${AT_QUOTE_NO}. Premium $${AT_PREMIUM}.`,
  `Cov A tried ${AT_COV_A_TRIED} → forced ${AT_COV_A_FORCED}. Roof/house age 2006.`,
  "Credit unconfirmed 10% applied.",
  "Endorsements: Water Damage Exclusion + $10,000 Limited Water Damage.",
  "Not bindable: Page 4 UW requires central heat/air, electrical, plumbing — HVAC not confirmed.",
  `Portal ${AT_LOGIN} · rating ${AT_RATING} · resume ${AT_RESUME} · BusType=H · user ${AT_USER} / ${AT_AGENCY} — no password this handoff.`,
  "Phones/email as Gaya listed: (866) 561-2800; claims (866) 561-3433 / (727) 561-0013; (866) 270-0430; custserv@westpointuw.com.",
  "NOTE: verify product DP3/landlord vs HO3 given BusType=H on rating URL.",
  "House: 10358 NW 30th TER Doral FL 33172, YB/roof 2006 masonry 1854sf Tenant PC02 flood X Cov A forced 351000.",
  "Write: house age/roof 2006 WRITE. HVAC Don't Write / missing blocked. WH unknown.",
].join(" ");

const AT_APPETITE_NOTE_APPEND = [
  "",
  `Conditional (Gloria DP3 ${TODAY}): Quote# ${AT_QUOTE_NO} $${AT_PREMIUM} Cov A forced ${AT_COV_A_FORCED} (tried ${AT_COV_A_TRIED}). Credit unconfirmed 10% applied. Endorsements Water Damage Exclusion + $10,000 Limited Water Damage. Not bindable — Page 4 UW central heat/air/electrical/plumbing; HVAC not confirmed. House age/roof 2006 WRITE; HVAC Don't Write / missing blocked; WH unknown. VERIFY product DP3/landlord vs HO3 (BusType=H).`,
].join("\n");

async function towerHill(risk: typeof risks.$inferSelect) {
  const [carrier] = await db.select().from(carriers).where(eq(carriers.id, TH_ID)).limit(1);
  if (!carrier) throw new Error("Tower Hill not found");

  // Grabables already known — refresh portal pointers/username only; do NOT invent phones/emails/password
  await db
    .update(carriers)
    .set({
      agentPortalUrl: TH_PORTAL,
      portalUrl: TH_PORTAL,
      portalLogin: `${TH_USER} — ${TH_AUTH} → ${TH_PORTAL} (CloudFront 403 after login; Gloria DP3 + HO3 same pattern)`,
      portalUsernameHint: TH_USER,
      portalSecretsUpdatedAt: new Date(),
      updatedAt: new Date(),
    } as any)
    .where(eq(carriers.id, TH_ID));

  const [log] = await db
    .insert(quoteAttemptLogs)
    .values({
      tenantId: carrier.tenantId,
      dealId: DEAL,
      carrierId: TH_ID,
      riskId: risk.id,
      lineOfBusiness: "HO",
      result: "no_quote",
      bindable: false,
      quoteNumber: null,
      premium: null,
      covATried: (risk as any).coverageA ?? 309000,
      why: TH_NOTE,
      snapYearBuilt: risk.yearBuilt ?? 2006,
      snapRoofYear: risk.roofYear ?? 2006,
      snapRoofCovering: risk.roofCovering ?? "Tile-Clay",
      snapConstruction: risk.construction ?? "Masonry",
      snapOpeningProtection: risk.openingProtection ?? null,
      snapOccupancy: risk.occupancy ?? "Tenant",
      snapStories: risk.stories ?? 2,
      snapPool: risk.pool ?? null,
      snapProtectionClass: risk.protectionClass ?? "02",
      snapMilesToCoast: risk.milesToCoast ?? 15.3,
      snapCity: risk.city ?? "Doral",
      snapCounty: risk.county ?? "MIAMI-DADE",
      snapCoverageA: (risk as any).coverageA ?? 309000,
      attemptedAt: new Date(),
    } as any)
    .returning();

  const existing = await db
    .select()
    .from(quotes)
    .where(and(eq(quotes.dealId, DEAL), eq(quotes.carrierId, TH_ID)));

  const patch = {
    riskOutcome: "no_option",
    nextStep: "go_back",
    bindable: false,
    quoteNumber: null,
    premium: null,
    coverageA: (risk as any).coverageA ?? 309000,
    notes: TH_NOTE,
    quoteAttemptLogId: log.id,
    agentStatus: "quoted",
    stub: false,
    carrierOpenUrl: TH_PORTAL,
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
        carrierId: TH_ID,
        ...patch,
      } as any)
      .returning();
    quoteId = q.id;
    mode = "created";
  }

  const [c2] = await db.select().from(carriers).where(eq(carriers.id, TH_ID)).limit(1);
  const [q2] = await db.select().from(quotes).where(eq(quotes.id, quoteId)).limit(1);
  const [l2] = await db.select().from(quoteAttemptLogs).where(eq(quoteAttemptLogs.id, log.id)).limit(1);

  return {
    carrier: "Tower Hill",
    mode,
    quoteId,
    appetiteId: log.id,
    carrierId: TH_ID,
    portalUrl: c2?.portalUrl,
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
      notes: (q2?.notes || "").slice(0, 180),
    },
    appetiteLog: {
      result: l2?.result,
      bindable: l2?.bindable,
      why: (l2?.why || "").slice(0, 180),
      snapYearBuilt: l2?.snapYearBuilt,
      snapRoofYear: l2?.snapRoofYear,
      snapCoverageA: l2?.snapCoverageA,
    },
  };
}

async function americanTraditions(risk: typeof risks.$inferSelect) {
  const [carrier] = await db.select().from(carriers).where(eq(carriers.id, AT_ID)).limit(1);
  if (!carrier) throw new Error("American Traditions not found");

  const user = writePortalUsername(AT_USER);
  const existingRows = normalizeAppetiteRows(carrier.appetiteRows);

  // Structured Write/Don't Write
  // AppetiteNoteRow: roofAge / hvac / waterHeater; NO houseAge column → house age WRITE in notes.
  const gloriaRow = emptyAppetiteRow({
    dateRequested: TODAY,
    lob: "DP3",
    roofAge: "WRITE — 2006 (~20y)",
    waterHeater: "unknown",
    hvac: "Don't Write / missing blocked — Page 4 UW central heat/air not confirmed",
    electrical: "Page 4 UW required — not confirmed this attempt",
    claimsHistory: "",
    acceptDecline: "accept",
    notes: [
      "WRITE house age: 2006 (no houseAge column; recorded in notes).",
      "WRITE roof: 2006.",
      "HVAC: Don't Write / missing blocked — Page 4 UW requires central heat/air not confirmed (also electrical + plumbing required).",
      "Water heater: unknown.",
      `Quote# ${AT_QUOTE_NO} $${AT_PREMIUM} Cov A forced ${AT_COV_A_FORCED}; credit unconfirmed 10% applied; Water Damage Exclusion + $10,000 Limited Water Damage.`,
      "VERIFY product DP3/landlord vs HO3 given BusType=H.",
    ].join(" "),
  });
  const kept = existingRows.filter(
    (r) =>
      !(
        r.lob === "DP3" &&
        r.dateRequested === TODAY &&
        /Q5113600|Gloria DP3|house age: 2006/i.test(r.notes)
      ),
  );
  const appetiteRows = [...kept, gloriaRow];

  const existingDont = normalizeDontWriteRows(carrier.dontWriteRows);
  const dontRow = emptyDontWriteRow({
    date: TODAY,
    lob: "DP3",
    reason:
      "HVAC Don't Write / missing blocked — Page 4 UW requires central heat/air not confirmed (also electrical + plumbing)",
    notes: [
      `Gloria DP3 Quote# ${AT_QUOTE_NO} Conditional $${AT_PREMIUM} — not bindable this attempt.`,
      "HVAC not confirmed; Page 4 UW blocked. WH unknown. House/roof age 2006 were WRITE.",
      "VERIFY BusType=H product (DP3/landlord vs HO3).",
    ].join(" "),
  });
  const keptDont = existingDont.filter(
    (r) =>
      !(
        r.lob === "DP3" &&
        r.date === TODAY &&
        /Q5113600|HVAC Don't Write|Gloria DP3/i.test(`${r.reason} ${r.notes}`)
      ),
  );
  const dontWriteRows = [...keptDont, dontRow];

  const priorNotes = String(carrier.appetiteNotes || "").trim();
  const appetiteNotes = priorNotes.includes("Q5113600")
    ? priorNotes
        .split("\n")
        .filter((line) => !/Q5113600|Gloria DP3 2026-09-13/i.test(line))
        .join("\n")
        .trim() + AT_APPETITE_NOTE_APPEND
    : [priorNotes, AT_APPETITE_NOTE_APPEND].filter(Boolean).join("\n").trim();

  const priorDontNotes = String((carrier as any).dontWriteNotes || "").trim();
  const dontAppend = `\nGloria DP3 ${TODAY}: HVAC Don't Write / missing blocked — Page 4 UW central heat/air not confirmed (Quote# ${AT_QUOTE_NO}).`;
  const dontWriteNotes = priorDontNotes.includes("Q5113600")
    ? priorDontNotes
        .split("\n")
        .filter((line) => !/Q5113600|Gloria DP3 2026-09-13: HVAC/i.test(line))
        .join("\n")
        .trim() + dontAppend
    : [priorDontNotes, dontAppend].filter(Boolean).join("\n").trim();

  // Phones/email as Gaya listed (already on carrier from HO3); keep same grabables
  await db
    .update(carriers)
    .set({
      agentPortalUrl: AT_LOGIN,
      portalUrl: AT_LOGIN,
      portalLogin: `Jerger/West Point — login ${AT_LOGIN} · rating ${AT_RATING} · resume ${AT_RESUME} · user ${AT_USER} (${AT_AGENCY}) BusType=H — no password this handoff`,
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
      dontWriteNotes,
      dontWriteRows,
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
      covATried: AT_COV_A_TRIED,
      covAForced: AT_COV_A_FORCED,
      why: AT_NOTE,
      snapYearBuilt: risk.yearBuilt ?? 2006,
      snapRoofYear: risk.roofYear ?? 2006,
      snapRoofCovering: risk.roofCovering ?? "Tile-Clay",
      snapConstruction: risk.construction ?? "Masonry",
      snapOpeningProtection: risk.openingProtection ?? null,
      snapOccupancy: risk.occupancy ?? "Tenant",
      snapStories: risk.stories ?? 2,
      snapPool: risk.pool ?? false,
      snapProtectionClass: risk.protectionClass ?? "02",
      snapMilesToCoast: risk.milesToCoast ?? 15.3,
      snapCity: risk.city ?? "Doral",
      snapCounty: risk.county ?? "MIAMI-DADE",
      snapCoverageA: AT_COV_A_FORCED,
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
    coverageA: AT_COV_A_FORCED,
    notes: AT_NOTE,
    quoteAttemptLogId: log.id,
    agentStatus: "quoted",
    stub: false,
    carrierOpenUrl: AT_RESUME,
    bindRequirements: [
      "Page 4 UW — confirm central heat/air (HVAC), electrical, plumbing (HVAC not confirmed this attempt)",
      "VERIFY product DP3/landlord vs HO3 given BusType=H",
    ],
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
  const lastRow = rows.filter((r) => r.lob === "DP3").slice(-1)[0] ?? rows[rows.length - 1];
  const dont = normalizeDontWriteRows(c2?.dontWriteRows);
  const lastDont = dont.filter((r) => r.lob === "DP3").slice(-1)[0] ?? dont[dont.length - 1];

  return {
    carrier: "American Traditions",
    mode,
    quoteId,
    appetiteId: log.id,
    carrierId: AT_ID,
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
          electrical: lastRow.electrical,
          acceptDecline: lastRow.acceptDecline,
          notes: lastRow.notes.slice(0, 240),
        }
      : null,
    dontWriteRowsLen: dont.length,
    dontWriteLast: lastDont
      ? {
          id: lastDont.id,
          date: lastDont.date,
          lob: lastDont.lob,
          reason: lastDont.reason.slice(0, 200),
          notes: lastDont.notes.slice(0, 200),
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
      bindRequirements: q2?.bindRequirements,
      carrierOpenUrl: q2?.carrierOpenUrl,
      notes: (q2?.notes || "").slice(0, 220),
    },
    appetiteLog: {
      result: l2?.result,
      bindable: l2?.bindable,
      quoteNumber: l2?.quoteNumber,
      premium: l2?.premium,
      covATried: l2?.covATried,
      covAForced: l2?.covAForced,
      snapYearBuilt: l2?.snapYearBuilt,
      snapRoofYear: l2?.snapRoofYear,
      snapCoverageA: l2?.snapCoverageA,
      why: (l2?.why || "").slice(0, 220),
    },
  };
}

async function main() {
  const [risk] = await db.select().from(risks).where(eq(risks.dealId, DEAL)).limit(1);
  if (!risk) throw new Error("no risk for Gloria DP3");

  const th = await towerHill(risk);
  const at = await americanTraditions(risk);

  console.log(
    JSON.stringify(
      {
        dealId: DEAL,
        riskId: risk.id,
        towerHill: th,
        americanTraditions: at,
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
