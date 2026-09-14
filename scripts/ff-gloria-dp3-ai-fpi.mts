/**
 * Gaya handoff — Gloria Martinez / DP3 deal 03dccdd7-db06-4c89-9b7a-cf0a2064d044
 * 10358 NW 30th TER, Doral FL 33172
 * 1) American Integrity (Grabables) — Incomplete / Couldn't finish — NOT UW decline.
 *    Quote# QT-21890053. Premium $0 / not developed. Cov A not reached. Bindable N.
 *    Why: required Insurance Score estimate blank — not invented. Don't Write until score.
 *    Address verified. Form DP3 started.
 *    Reuse AI grabables from HO3 (portal/user/phones/producer).
 * 2) Florida Peninsula — Skip this wave (no NordPass) — light skip note like Safepoint.
 * FitFirst Mac mini ONLY. No CloudAgent. No Air.
 */
import { eq, and } from "drizzle-orm";
import { db } from "../src/lib/db";
import {
  carriers,
  quotes,
  quoteAttemptLogs,
  risks,
} from "../src/lib/db/schema";
import { writePortalUsername } from "../src/lib/carriers/secrets";
import { emptyAppetiteRow, normalizeAppetiteRows } from "../src/lib/carriers/appetite-rows";
import { decryptSecret } from "../src/lib/secrets/vault";

const DEAL = "03dccdd7-db06-4c89-9b7a-cf0a2064d044";
const RISK_ID = "fe30db6a-9e7b-42a2-b46c-2c7ced26e2e3";
const AI_ID = "33333333-3333-4333-8333-333333333309"; // American Integrity
const FPI_ID = "6a0f669f-1489-4501-83cf-197b0c90db93"; // Florida Peninsula
const TODAY = "2026-09-13";

// Reuse HO3 Grabables
const PORTAL = "https://platform.go.aiiconnect.com/innovation";
const LOGIN = "https://platform.go.aiiconnect.com/login.jsp";
const USER = "AG11068A1"; // Use for New Business — NOT AG5237A1 / NOT AG5237A2
const PRODUCER = "American Family Agency LLC";
const UW_PHONE = "866-904-9044";
const CS_TEXT = "SUPPORT to 813-706-3348";
const UW_TEXT = "UNDERWRITING to 813-706-3348";

const QUOTE_NO = "QT-21890053";

const HOUSE =
  "10358 NW 30th TER Doral FL 33172, YB/roof 2006 masonry 1854sf 2-story Tenant PC02 15.3 mi coast Cov A 309000 DP3 landlord.";

const AI_NOTE = [
  "DP3 American Integrity (Grabables / aiiconnect) — Incomplete / Couldn't finish — NOT a UW decline, NOT a portal fail.",
  `Quote# ${QUOTE_NO}. Premium $0 / not developed. Cov A not reached. Bindable N.`,
  "Couldn't finish — required Insurance Score estimate blank (not invented). Don't Write until score.",
  "Address verified. Form DP3 started.",
  `Portal ${PORTAL} · login ${LOGIN} · username ${USER} (Use for New Business) · Producer ${PRODUCER} — no password this handoff.`,
  `Do NOT use AG5237A1 (Citizens takeout) or AG5237A2 (Do not Write NB).`,
  `UW ${UW_PHONE}; Client Services text ${CS_TEXT}; Underwriting text ${UW_TEXT}.`,
  "Write/Don't Write: incomplete — no UW factors until Insurance Score.",
  `House: ${HOUSE}`,
  "Next: resume with Insurance Score estimate when available — do not invent.",
].join(" ");

const AI_APPETITE_NOTE_APPEND = [
  "",
  `Incomplete (Gloria DP3 ${TODAY}): American Integrity Quote# ${QUOTE_NO} — not UW decline, not portal fail. Premium $0 / not developed; Cov A not reached. Bindable N. Blocked: required Insurance Score estimate blank (not invented). Don't Write until score. Address verified. Form DP3 started. User ${USER} NB only (not AG5237A1/A2).`,
].join("\n");

const FPI_NOTE = [
  "DP3 Florida Peninsula — Skipped this wave.",
  "Skipped — no NordPass FPI credentials (Shared Login has no Florida Peninsula / FPI / peninsula / FPIC / Edison item).",
  "No username; no URL guessed; no password typed. No new portal attempt this DP3 wave. NOT a UW decline.",
  "No quote#. No premium. No Cov A. Form DP3. Grabables: none.",
  `House: ${HOUSE}`,
  "No Write/Don't Write UW factors this attempt (skipped before UW). Carrier needs NordPass FPI item.",
].join(" ");

async function americanIntegrity(risk: typeof risks.$inferSelect) {
  const [carrier] = await db.select().from(carriers).where(eq(carriers.id, AI_ID)).limit(1);
  if (!carrier) throw new Error("American Integrity not found");

  const user = writePortalUsername(USER);

  // Appetite: incomplete note only — acceptDecline blank; NO DontWrite rows (Don't Write until score)
  const existingRows = normalizeAppetiteRows(carrier.appetiteRows);
  const gloriaRow = emptyAppetiteRow({
    dateRequested: TODAY,
    lob: "DP3",
    roofAge: "not reached",
    waterHeater: "not reached",
    hvac: "not reached",
    electrical: "",
    claimsHistory: "",
    acceptDecline: "",
    notes: [
      "Gloria DP3 incomplete / couldn't finish — NOT UW decline, NOT portal fail.",
      `Quote# ${QUOTE_NO}. Premium $0 / not developed; Cov A not reached. Bindable N.`,
      "Blocked: required Insurance Score estimate blank — not invented. Don't Write until score.",
      "Address verified. Form DP3 started.",
      `User ${USER} (NB). Do not use AG5237A1 / AG5237A2.`,
    ].join(" "),
  });
  const kept = existingRows.filter(
    (r) =>
      !(
        r.lob === "DP3" &&
        r.dateRequested === TODAY &&
        /QT-21890053|Gloria DP3 incomplete|Insurance Score estimate/i.test(r.notes)
      ),
  );
  // Keep HO3 incomplete row (QT-21889873) untouched
  const appetiteRows = [...kept, gloriaRow];

  const priorNotes = String(carrier.appetiteNotes || "").trim();
  let appetiteNotes: string;
  if (/Incomplete \(Gloria DP3 2026-09-13\).*QT-21890053|QT-21890053/.test(priorNotes)) {
    const stripped = priorNotes
      .split("\n")
      .filter((line) => !/QT-21890053|Incomplete \(Gloria DP3.*American Integrity/i.test(line))
      .join("\n")
      .trim();
    appetiteNotes = [stripped, AI_APPETITE_NOTE_APPEND.trim()].filter(Boolean).join("\n").trim();
  } else {
    appetiteNotes = [priorNotes, AI_APPETITE_NOTE_APPEND].filter(Boolean).join("\n").trim();
  }

  await db
    .update(carriers)
    .set({
      // reuse / refresh HO3 Grabables — do not invent password
      agentPortalUrl: LOGIN,
      portalUrl: LOGIN,
      website: PORTAL,
      portalLogin: `Grabables / AIC — ${PORTAL} · login ${LOGIN} · user ${USER} (Use for New Business; NOT AG5237A1 Citizens takeout; NOT AG5237A2 Do not Write NB) · Producer ${PRODUCER} — no password this handoff`,
      ...user,
      portalPasswordEnc: null,
      portalPasswordIv: null,
      phone: UW_PHONE,
      customerServicePhone: "813-706-3348",
      underwriterEmail: null,
      email: null,
      appetiteNotes,
      appetiteRows,
      // intentionally leave dontWriteRows untouched — Don't Write until Insurance Score
      portalSecretsUpdatedAt: new Date(),
      updatedAt: new Date(),
      carrierInfo: [
        "Grabables platform.go.aiiconnect.com",
        `UW ${UW_PHONE}`,
        `Client Services text ${CS_TEXT}`,
        `Underwriting text ${UW_TEXT}`,
        `Producer ${PRODUCER}`,
        "NB username AG11068A1 only",
      ].join(" · "),
    } as any)
    .where(eq(carriers.id, AI_ID));

  const existing = await db
    .select()
    .from(quotes)
    .where(and(eq(quotes.dealId, DEAL), eq(quotes.carrierId, AI_ID)));

  const [log] = await db
    .insert(quoteAttemptLogs)
    .values({
      tenantId: carrier.tenantId,
      dealId: DEAL,
      carrierId: AI_ID,
      riskId: risk.id,
      lineOfBusiness: "HO",
      result: "incomplete",
      bindable: false,
      quoteNumber: QUOTE_NO,
      premium: null, // $0 / not developed — do not store 0 as a priced premium
      covATried: null, // Cov A not reached
      why: AI_NOTE,
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
      snapCoverageA: null,
      attemptedAt: new Date(),
    } as any)
    .returning();

  const patch = {
    riskOutcome: "conditional",
    nextStep: "fixable",
    bindable: false,
    quoteNumber: QUOTE_NO,
    premium: null,
    coverageA: null,
    notes: AI_NOTE,
    quoteAttemptLogId: log.id,
    agentStatus: "quoted",
    stub: false,
    carrierOpenUrl: PORTAL,
    bindRequirements: [
      "Insurance Score estimate — blank / required; not inventing. Don't Write until score.",
      "Address verified (OK).",
      "Form DP3 started — resume quote QT-21890053 when score available.",
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
        carrierId: AI_ID,
        ...patch,
      } as any)
      .returning();
    quoteId = q.id;
    mode = "created";
  }

  // Sanity: HO3 AI quote QT-21889873 must remain untouched
  const ho3Ai = await db
    .select()
    .from(quotes)
    .where(
      and(
        eq(quotes.dealId, "8f4e7b68-2de3-458e-914b-ba60ea3c47aa"),
        eq(quotes.carrierId, AI_ID),
      ),
    );

  const [c2] = await db.select().from(carriers).where(eq(carriers.id, AI_ID)).limit(1);
  const [q2] = await db.select().from(quotes).where(eq(quotes.id, quoteId)).limit(1);
  const [l2] = await db.select().from(quoteAttemptLogs).where(eq(quoteAttemptLogs.id, log.id)).limit(1);

  let userAfter: string | null = null;
  if (c2?.portalUsernameEnc && c2?.portalUsernameIv) {
    userAfter = decryptSecret(c2.portalUsernameEnc, c2.portalUsernameIv);
  }
  const rows = normalizeAppetiteRows(c2?.appetiteRows);
  const lastDp3 = rows.filter((r) => r.lob === "DP3").slice(-1)[0];
  const ho3AppKept = rows.some((r) => /QT-21889873/.test(r.notes));

  return {
    carrier: "American Integrity",
    mode,
    quoteId,
    appetiteId: log.id,
    carrierId: AI_ID,
    portalUrl: c2?.portalUrl,
    agentPortalUrl: c2?.agentPortalUrl,
    website: c2?.website,
    portalLogin: c2?.portalLogin,
    usernameDecrypted: userAfter,
    hasPassword: Boolean(c2?.portalPasswordEnc),
    phone: c2?.phone,
    customerServicePhone: c2?.customerServicePhone,
    carrierInfo: c2?.carrierInfo,
    appetiteRowsLen: rows.length,
    appetiteRowDp3: lastDp3
      ? {
          id: lastDp3.id,
          dateRequested: lastDp3.dateRequested,
          lob: lastDp3.lob,
          acceptDecline: lastDp3.acceptDecline,
          notes: lastDp3.notes.slice(0, 280),
        }
      : null,
    ho3IncompleteRowKept: ho3AppKept,
    ho3AiQuotesUntouched: ho3Ai.map((q) => ({
      id: q.id,
      quoteNumber: q.quoteNumber,
      riskOutcome: q.riskOutcome,
      bindable: q.bindable,
    })),
    dontWriteRowsLen: Array.isArray((c2 as any)?.dontWriteRows)
      ? ((c2 as any).dontWriteRows as unknown[]).length
      : 0,
    appetiteNotesTail: (c2?.appetiteNotes || "").slice(-360),
    quote: {
      riskOutcome: q2?.riskOutcome,
      nextStep: q2?.nextStep,
      bindable: q2?.bindable,
      quoteNumber: q2?.quoteNumber,
      premium: q2?.premium,
      coverageA: q2?.coverageA,
      carrierOpenUrl: q2?.carrierOpenUrl,
      bindRequirements: q2?.bindRequirements,
      notes: (q2?.notes || "").slice(0, 280),
    },
    appetiteLog: {
      id: l2?.id,
      result: l2?.result,
      bindable: l2?.bindable,
      quoteNumber: l2?.quoteNumber,
      premium: l2?.premium,
      covATried: l2?.covATried,
      snapCoverageA: l2?.snapCoverageA,
      why: (l2?.why || "").slice(0, 240),
    },
  };
}

async function floridaPeninsula(risk: typeof risks.$inferSelect) {
  const [carrier] = await db.select().from(carriers).where(eq(carriers.id, FPI_ID)).limit(1);
  if (!carrier) throw new Error("Florida Peninsula not found");

  // Light skip note on appetite — no NordPass (like Safepoint)
  const priorNotes = String(carrier.appetiteNotes || "").trim();
  const append = `Skipped (Gloria DP3 ${TODAY}): skipped — no NordPass FPI credentials (Shared Login has no Florida Peninsula / FPI / peninsula / FPIC / Edison item). No new portal attempt this wave. No quote.`;
  let appetiteNotes: string;
  if (/Skipped \(Gloria DP3 2026-09-13\)|skipped — no NordPass FPI/i.test(priorNotes)) {
    const stripped = priorNotes
      .split("\n")
      .filter((line) => !/Skipped \(Gloria DP3 2026-09-13\)|skipped — no NordPass FPI/i.test(line))
      .join("\n")
      .trim();
    appetiteNotes = [stripped, append].filter(Boolean).join("\n").trim();
  } else {
    appetiteNotes = [priorNotes, append].filter(Boolean).join("\n").trim();
  }

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
      "Gloria DP3 skipped — no NordPass FPI credentials (Shared Login has no FPI / peninsula / FPIC / Edison item).",
      "No new portal attempt this wave. No quote#. NOT UW decline.",
    ].join(" "),
  });
  const kept = existingRows.filter(
    (r) =>
      !(
        r.lob === "DP3" &&
        r.dateRequested === TODAY &&
        /no NordPass FPI|Gloria DP3 skipped/i.test(r.notes)
      ),
  );
  const appetiteRows = [...kept, skipRow];

  await db
    .update(carriers)
    .set({
      // leave portalUrl / username / password alone — nothing to invent
      portalLogin: [
        "need NordPass FPI item — Shared Login has no Florida Peninsula / FPI / peninsula / FPIC / Edison item;",
        "no username; no URL guessed; no password typed",
        `(Gloria HO3 2026-09-13; Gloria DP3 ${TODAY} skipped — same no NordPass)`,
      ].join(" "),
      appetiteNotes,
      appetiteRows,
      updatedAt: new Date(),
    } as any)
    .where(eq(carriers.id, FPI_ID));

  const [log] = await db
    .insert(quoteAttemptLogs)
    .values({
      tenantId: carrier.tenantId,
      dealId: DEAL,
      carrierId: FPI_ID,
      riskId: risk.id,
      lineOfBusiness: "HO",
      result: "no_quote",
      bindable: false,
      quoteNumber: null,
      premium: null,
      covATried: null,
      why: FPI_NOTE,
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
    .where(and(eq(quotes.dealId, DEAL), eq(quotes.carrierId, FPI_ID)));

  const patch = {
    riskOutcome: "no_option",
    nextStep: "go_back",
    bindable: false,
    quoteNumber: null,
    premium: null,
    coverageA: null,
    notes: FPI_NOTE,
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
        carrierId: FPI_ID,
        ...patch,
      } as any)
      .returning();
    quoteId = q.id;
    mode = "created";
  }

  const [c2] = await db.select().from(carriers).where(eq(carriers.id, FPI_ID)).limit(1);
  const [q2] = await db.select().from(quotes).where(eq(quotes.id, quoteId)).limit(1);
  const [l2] = await db.select().from(quoteAttemptLogs).where(eq(quoteAttemptLogs.id, log.id)).limit(1);
  const rows = normalizeAppetiteRows(c2?.appetiteRows);
  const lastApp = rows.slice(-1)[0];

  return {
    carrier: "Florida Peninsula",
    mode,
    quoteId,
    appetiteId: log.id,
    carrierId: FPI_ID,
    portalUrl: c2?.portalUrl,
    agentPortalUrl: c2?.agentPortalUrl,
    portalLogin: c2?.portalLogin,
    hasUsername: Boolean(c2?.portalUsernameEnc),
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

  const ai = await americanIntegrity(risk);
  const fpi = await floridaPeninsula(risk);

  console.log(
    JSON.stringify(
      {
        dealId: DEAL,
        riskId: risk.id,
        americanIntegrity: ai,
        floridaPeninsula: fpi,
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
