/**
 * Gaya handoff — Gloria Martinez / DP3 deal 03dccdd7-db06-4c89-9b7a-cf0a2064d044
 * 10358 NW 30th TER, Doral FL 33172
 * 1) Slide — no_market / no DP3. Violet only HO3 + HO6. Dedicated DP3 link closed
 *    legacy slideinsagents.com FL NB. Don't Write Slide for DP3. Quote# none. Bindable N.
 *    Do NOT reopen H3QFL04634499 (HO3). Quotes+Appetite + DontWrite row.
 * 2) Safepoint (Manatee) — skipped this wave (same Microsoft NordPass autofill fail as HO3).
 *    Light appetite skip note + no_quote skip row: skipped — known portal access wall.
 * FitFirst Mac mini ONLY. No CloudAgent. No Air.
 */
import { eq, and } from "drizzle-orm";
import { db } from "../src/lib/db";
import { carriers, quotes, quoteAttemptLogs, risks } from "../src/lib/db/schema";
import {
  emptyAppetiteRow,
  emptyDontWriteRow,
  normalizeAppetiteRows,
  normalizeDontWriteRows,
} from "../src/lib/carriers/appetite-rows";

const DEAL = "03dccdd7-db06-4c89-9b7a-cf0a2064d044";
const RISK_ID = "fe30db6a-9e7b-42a2-b46c-2c7ced26e2e3";
const SLIDE_ID = "09af41b8-86b6-4d8a-80fd-7d7ba605709d";
const SAFEPOINT_ID = "544cec59-3bf9-4cd3-85f6-7fe81724a45a"; // Manatee (Safepoint NB)
const TODAY = "2026-09-13";

const SLIDE_VIOLET = "https://agent.slideinsurance.com";
const SLIDE_DP3_LEGACY = "https://slideinsagents.com"; // closed FL NB
const SLIDE_USER = "gary.h@afains.com";

const SLIDE_NOTE = [
  "DP3 Slide — No market / no DP3 product.",
  "Violet portal only writes HO3 Homeowners and HO6 Condo — no DP3 on Violet.",
  `Dedicated DP3 link → closed legacy ${SLIDE_DP3_LEGACY} FL NB.`,
  "Don't Write Slide for DP3.",
  "Quote# none. Bindable N. No premium. Cov A not reached.",
  "Do NOT reopen H3QFL04634499 (that is Gloria HO3 incomplete on Violet — leave alone).",
  `Portal ${SLIDE_VIOLET} · user ${SLIDE_USER} — no password this handoff.`,
  "House: 10358 NW 30th TER Doral FL 33172, YB/roof 2006 masonry 1854sf 2-story Tenant PC02 15.3 mi coast Cov A 309000 DP3 landlord.",
].join(" ");

const SAFEPOINT_PORTAL = "https://www.safepointdc.com/Policy/default.aspx";
const SAFEPOINT_AUTH = "https://login.microsoftonline.com";
const SAFEPOINT_USER = "501981Producer@spi-cjn-mnt.com";

const SAFEPOINT_NOTE = [
  "DP3 Safepoint (Manatee NB) — Skipped this wave.",
  "Skipped — known portal access wall (same Microsoft NordPass autofill fail as Gloria HO3).",
  `Username ${SAFEPOINT_USER} accepted at ${SAFEPOINT_AUTH}; NordPass did not fill password (copy only — password not typed).`,
  "No new portal attempt this DP3 wave. NOT a UW decline.",
  "No quote#. No premium. No Cov A. Form DP3.",
  `Portal ${SAFEPOINT_PORTAL}. House: 10358 NW 30th TER Doral FL 33172.`,
  "No Write/Don't Write UW factors this attempt (skipped before UW).",
].join(" ");

async function slide(risk: typeof risks.$inferSelect) {
  const [carrier] = await db.select().from(carriers).where(eq(carriers.id, SLIDE_ID)).limit(1);
  if (!carrier) throw new Error("Slide not found");

  const existingRows = normalizeAppetiteRows(carrier.appetiteRows);
  const appetiteRow = emptyAppetiteRow({
    dateRequested: TODAY,
    lob: "DP3",
    roofAge: "",
    waterHeater: "",
    hvac: "",
    electrical: "",
    claimsHistory: "",
    acceptDecline: "decline",
    notes: [
      "Gloria DP3 — no_market / no DP3 product on Violet.",
      "Violet only HO3 Homeowners and HO6 Condo.",
      `Dedicated DP3 link closed legacy ${SLIDE_DP3_LEGACY} FL NB.`,
      "Don't Write Slide for DP3. Quote# none. Bindable N.",
      "Do NOT reopen H3QFL04634499 (HO3).",
    ].join(" "),
  });
  const keptAppetite = existingRows.filter(
    (r) =>
      !(
        r.lob === "DP3" &&
        r.dateRequested === TODAY &&
        /no DP3 product|Gloria DP3|slideinsagents/i.test(r.notes)
      ),
  );
  // Keep HO3 incomplete row (H3QFL04634499) untouched
  const appetiteRows = [...keptAppetite, appetiteRow];

  const existingDont = normalizeDontWriteRows(carrier.dontWriteRows);
  const dontRow = emptyDontWriteRow({
    date: TODAY,
    lob: "DP3",
    reason: "Slide does not write DP3 / no DP3 product on Violet (Violet = HO3 + HO6 only; dedicated DP3 link closed legacy slideinsagents.com FL NB)",
    notes: [
      "Gloria DP3 no_market. Quote# none. Bindable N.",
      "Do NOT reopen H3QFL04634499 (HO3 incomplete — separate deal).",
      `Violet ${SLIDE_VIOLET}; user ${SLIDE_USER}.`,
    ].join(" "),
  });
  const keptDont = existingDont.filter(
    (r) =>
      !(
        r.lob === "DP3" &&
        r.date === TODAY &&
        /does not write DP3|no DP3 product|Gloria DP3/i.test(`${r.reason} ${r.notes}`)
      ),
  );
  const dontWriteRows = [...keptDont, dontRow];

  const priorNotes = String(carrier.appetiteNotes || "").trim();
  const append = `No market (Gloria DP3 ${TODAY}): Slide does not write DP3 / no DP3 product on Violet (HO3+HO6 only). Dedicated DP3 link closed legacy slideinsagents.com FL NB. Quote# none. Bindable N. Do NOT reopen H3QFL04634499.`;
  let appetiteNotes: string;
  if (/Gloria DP3 2026-09-13.*no DP3 product|does not write DP3 \/ no DP3 product on Violet/i.test(priorNotes)) {
    const stripped = priorNotes
      .split("\n")
      .filter((line) => !/Gloria DP3 2026-09-13|does not write DP3 \/ no DP3 product on Violet|slideinsagents\.com FL NB/i.test(line))
      .join("\n")
      .trim();
    appetiteNotes = [stripped, append].filter(Boolean).join("\n").trim();
  } else {
    appetiteNotes = [priorNotes, append].filter(Boolean).join("\n").trim();
  }

  const priorDontNotes = String((carrier as any).dontWriteNotes || "").trim();
  const dontAppend = `Gloria DP3 ${TODAY}: Slide does not write DP3 / no DP3 product on Violet (HO3+HO6 only); dedicated DP3 link closed legacy slideinsagents.com FL NB.`;
  const dontWriteNotes = /Gloria DP3 2026-09-13: Slide does not write DP3/i.test(priorDontNotes)
    ? priorDontNotes
        .split("\n")
        .filter((line) => !/Gloria DP3 2026-09-13: Slide does not write DP3/i.test(line))
        .join("\n")
        .trim() + "\n" + dontAppend
    : [priorDontNotes, dontAppend].filter(Boolean).join("\n").trim();

  // Portal card: keep Violet; note no DP3; do NOT wipe HO3 resume/user; do NOT reopen HO3 quote
  await db
    .update(carriers)
    .set({
      agentPortalUrl: SLIDE_VIOLET,
      portalUrl: SLIDE_VIOLET,
      portalLogin: [
        `Violet ${SLIDE_VIOLET} · user ${SLIDE_USER} — HO3 Homeowners + HO6 Condo only (no DP3 on Violet).`,
        `Dedicated DP3 link closed legacy ${SLIDE_DP3_LEGACY} FL NB.`,
        "legacy ghallock closed for FL NB — no password this handoff.",
        "Do NOT reopen H3QFL04634499 from DP3 handoff.",
      ].join(" "),
      appetiteNotes,
      appetiteRows,
      dontWriteNotes,
      dontWriteRows,
      updatedAt: new Date(),
    } as any)
    .where(eq(carriers.id, SLIDE_ID));

  const [log] = await db
    .insert(quoteAttemptLogs)
    .values({
      tenantId: carrier.tenantId,
      dealId: DEAL,
      carrierId: SLIDE_ID,
      riskId: risk.id,
      lineOfBusiness: "HO",
      result: "no_market",
      bindable: false,
      quoteNumber: null,
      premium: null,
      covATried: null,
      why: SLIDE_NOTE,
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
      snapCoverageA: null,
      attemptedAt: new Date(),
    } as any)
    .returning();

  const existing = await db
    .select()
    .from(quotes)
    .where(and(eq(quotes.dealId, DEAL), eq(quotes.carrierId, SLIDE_ID)));

  const patch = {
    riskOutcome: "no_market",
    nextStep: "hard_no",
    bindable: false,
    quoteNumber: null,
    premium: null,
    coverageA: null,
    notes: SLIDE_NOTE,
    quoteAttemptLogId: log.id,
    agentStatus: "quoted",
    stub: false,
    carrierOpenUrl: SLIDE_VIOLET,
    lostReason: "Slide does not write DP3 / no DP3 product on Violet",
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

  // Sanity: HO3 Slide quote H3QFL04634499 must remain untouched
  const ho3Slide = await db
    .select()
    .from(quotes)
    .where(
      and(
        eq(quotes.dealId, "8f4e7b68-2de3-458e-914b-ba60ea3c47aa"),
        eq(quotes.carrierId, SLIDE_ID),
      ),
    );

  const [c2] = await db.select().from(carriers).where(eq(carriers.id, SLIDE_ID)).limit(1);
  const [q2] = await db.select().from(quotes).where(eq(quotes.id, quoteId)).limit(1);
  const [l2] = await db.select().from(quoteAttemptLogs).where(eq(quoteAttemptLogs.id, log.id)).limit(1);
  const rows = normalizeAppetiteRows(c2?.appetiteRows);
  const dont = normalizeDontWriteRows(c2?.dontWriteRows);
  const lastApp = rows.filter((r) => r.lob === "DP3").slice(-1)[0];
  const lastDont = dont.filter((r) => r.lob === "DP3").slice(-1)[0];
  const ho3AppKept = rows.some((r) => /H3QFL04634499/.test(r.notes));

  return {
    carrier: "Slide",
    mode,
    quoteId,
    appetiteId: log.id,
    carrierId: SLIDE_ID,
    portalUrl: c2?.portalUrl,
    portalLogin: c2?.portalLogin,
    appetiteRowsLen: rows.length,
    dontWriteRowsLen: dont.length,
    appetiteRowDp3: lastApp
      ? {
          id: lastApp.id,
          dateRequested: lastApp.dateRequested,
          lob: lastApp.lob,
          acceptDecline: lastApp.acceptDecline,
          notes: lastApp.notes.slice(0, 260),
        }
      : null,
    dontWriteRowDp3: lastDont
      ? {
          id: lastDont.id,
          date: lastDont.date,
          lob: lastDont.lob,
          reason: lastDont.reason,
          notes: lastDont.notes.slice(0, 220),
        }
      : null,
    ho3IncompleteRowKept: ho3AppKept,
    ho3SlideQuotesUntouched: ho3Slide.map((q) => ({
      id: q.id,
      quoteNumber: q.quoteNumber,
      riskOutcome: q.riskOutcome,
      bindable: q.bindable,
    })),
    appetiteNotesTail: (c2?.appetiteNotes || "").slice(-280),
    dontWriteNotesTail: String((c2 as any)?.dontWriteNotes || "").slice(-240),
    quote: {
      riskOutcome: q2?.riskOutcome,
      nextStep: q2?.nextStep,
      bindable: q2?.bindable,
      quoteNumber: q2?.quoteNumber,
      premium: q2?.premium,
      lostReason: q2?.lostReason,
      notes: (q2?.notes || "").slice(0, 220),
    },
    appetiteLog: {
      id: l2?.id,
      result: l2?.result,
      bindable: l2?.bindable,
      quoteNumber: l2?.quoteNumber,
      why: (l2?.why || "").slice(0, 200),
    },
  };
}

async function safepoint(risk: typeof risks.$inferSelect) {
  const [carrier] = await db.select().from(carriers).where(eq(carriers.id, SAFEPOINT_ID)).limit(1);
  if (!carrier) throw new Error("Manatee/Safepoint not found");

  // Light skip note on appetite — known portal access wall from HO3 NordPass fail
  const priorNotes = String(carrier.appetiteNotes || "").trim();
  const append = `Skipped (Gloria DP3 ${TODAY}): skipped — known portal access wall (same Microsoft NordPass autofill fail as Gloria HO3). No new portal attempt this wave. No quote.`;
  let appetiteNotes: string;
  if (/Skipped \(Gloria DP3 2026-09-13\)|skipped — known portal access wall/i.test(priorNotes)) {
    const stripped = priorNotes
      .split("\n")
      .filter((line) => !/Skipped \(Gloria DP3 2026-09-13\)|skipped — known portal access wall/i.test(line))
      .join("\n")
      .trim();
    appetiteNotes = [stripped, append].filter(Boolean).join("\n").trim();
  } else {
    appetiteNotes = [priorNotes, append].filter(Boolean).join("\n").trim();
  }

  // Optional light appetite row (skipped / no_quote) — no DontWrite UW factors
  const existingRows = normalizeAppetiteRows(carrier.appetiteRows);
  const skipRow = emptyAppetiteRow({
    dateRequested: TODAY,
    lob: "DP3",
    roofAge: "",
    waterHeater: "",
    hvac: "",
    electrical: "",
    claimsHistory: "",
    acceptDecline: "",
    notes: [
      "Gloria DP3 skipped — known portal access wall (same Microsoft NordPass autofill fail as HO3).",
      "No new portal attempt this wave. No quote#. NOT UW decline.",
    ].join(" "),
  });
  const kept = existingRows.filter(
    (r) =>
      !(
        r.lob === "DP3" &&
        r.dateRequested === TODAY &&
        /skipped — known portal access wall|Gloria DP3 skipped/i.test(r.notes)
      ),
  );
  const appetiteRows = [...kept, skipRow];

  await db
    .update(carriers)
    .set({
      // keep existing portal pointers/username from HO3 handoff — do not invent password
      portalLogin: [
        `Safepoint (Manatee NB) — ${SAFEPOINT_AUTH} → ${SAFEPOINT_PORTAL} · user ${SAFEPOINT_USER}`,
        "— NordPass autofill failed (copy only, password not typed)",
        `— Gloria DP3 ${TODAY} skipped — known portal access wall (same as HO3)`,
        "— related safepointins.com, manatee-insurance.com",
      ].join(" "),
      appetiteNotes,
      appetiteRows,
      updatedAt: new Date(),
    } as any)
    .where(eq(carriers.id, SAFEPOINT_ID));

  const [log] = await db
    .insert(quoteAttemptLogs)
    .values({
      tenantId: carrier.tenantId,
      dealId: DEAL,
      carrierId: SAFEPOINT_ID,
      riskId: risk.id,
      lineOfBusiness: "HO",
      result: "no_quote",
      bindable: false,
      quoteNumber: null,
      premium: null,
      covATried: null,
      why: SAFEPOINT_NOTE,
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
      snapCoverageA: null,
      attemptedAt: new Date(),
    } as any)
    .returning();

  const existing = await db
    .select()
    .from(quotes)
    .where(and(eq(quotes.dealId, DEAL), eq(quotes.carrierId, SAFEPOINT_ID)));

  const patch = {
    riskOutcome: "no_option",
    nextStep: "go_back",
    bindable: false,
    quoteNumber: null,
    premium: null,
    coverageA: null,
    notes: SAFEPOINT_NOTE,
    quoteAttemptLogId: log.id,
    agentStatus: "quoted",
    stub: false,
    carrierOpenUrl: SAFEPOINT_PORTAL,
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
        carrierId: SAFEPOINT_ID,
        ...patch,
      } as any)
      .returning();
    quoteId = q.id;
    mode = "created";
  }

  const [c2] = await db.select().from(carriers).where(eq(carriers.id, SAFEPOINT_ID)).limit(1);
  const [q2] = await db.select().from(quotes).where(eq(quotes.id, quoteId)).limit(1);
  const [l2] = await db.select().from(quoteAttemptLogs).where(eq(quoteAttemptLogs.id, log.id)).limit(1);
  const rows = normalizeAppetiteRows(c2?.appetiteRows);
  const lastApp = rows.slice(-1)[0];

  return {
    carrier: "Safepoint (Manatee)",
    mode,
    quoteId,
    appetiteId: log.id,
    carrierId: SAFEPOINT_ID,
    portalUrl: c2?.portalUrl,
    portalLogin: c2?.portalLogin,
    hasPassword: Boolean(c2?.portalPasswordEnc),
    dontWriteRowsLen: Array.isArray(c2?.dontWriteRows) ? (c2?.dontWriteRows as any[]).length : 0,
    appetiteRowsLen: rows.length,
    appetiteRowLast: lastApp
      ? {
          id: lastApp.id,
          dateRequested: lastApp.dateRequested,
          lob: lastApp.lob,
          notes: lastApp.notes.slice(0, 220),
        }
      : null,
    appetiteNotesTail: (c2?.appetiteNotes || "").slice(-320),
    quote: {
      riskOutcome: q2?.riskOutcome,
      nextStep: q2?.nextStep,
      bindable: q2?.bindable,
      quoteNumber: q2?.quoteNumber,
      premium: q2?.premium,
      notes: (q2?.notes || "").slice(0, 220),
    },
    appetiteLog: {
      id: l2?.id,
      result: l2?.result,
      bindable: l2?.bindable,
      why: (l2?.why || "").slice(0, 200),
    },
  };
}

async function main() {
  const [risk] = await db.select().from(risks).where(eq(risks.id, RISK_ID)).limit(1);
  if (!risk || risk.dealId !== DEAL) throw new Error("Gloria DP3 risk missing/mismatch");

  const slideResult = await slide(risk);
  const safepointResult = await safepoint(risk);

  console.log(
    JSON.stringify(
      {
        dealId: DEAL,
        riskId: risk.id,
        slide: slideResult,
        safepoint: safepointResult,
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
