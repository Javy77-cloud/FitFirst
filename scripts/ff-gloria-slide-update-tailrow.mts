/**
 * Gaya handoffs — Gloria Martinez / HO3 deal 8f4e7b68-2de3-458e-914b-ba60ea3c47aa
 * 1) Slide — UPDATE existing quote H3QFL04634499 (21aa9b52…) incomplete / not bindable NOT UW decline
 * 2) Tailrow (Harmony) — NEW quote 20-8105778-01 UW error / not bindable + Don't Write under min premium
 * 3) HOC — optional appetite note only (no voluntary NB this Harmony session); no invented quote
 * FitFirst Mac mini ONLY. No CloudAgent. No Air.
 * Do NOT invent pool_size / primary_plumbing_type / water_heater_year on sheet.
 */
import { eq, and } from "drizzle-orm";
import { db } from "../src/lib/db";
import { carriers, quotes, quoteAttemptLogs, risks, quoteSheets } from "../src/lib/db/schema";
import { writePortalUsername } from "../src/lib/carriers/secrets";
import {
  emptyAppetiteRow,
  emptyDontWriteRow,
  normalizeAppetiteRows,
  normalizeDontWriteRows,
} from "../src/lib/carriers/appetite-rows";
import { decryptSecret } from "../src/lib/secrets/vault";

const DEAL = "8f4e7b68-2de3-458e-914b-ba60ea3c47aa";
const SLIDE_ID = "09af41b8-86b6-4d8a-80fd-7d7ba605709d";
const SLIDE_QUOTE_ID = "21aa9b52-e71c-4335-9ab4-dbbd920f87ca";
const TAILROW_ID = "33333333-3333-4333-8333-333333333306";
const HOC_ID = "33333333-3333-4333-8333-333333333304";
const TODAY = "2026-09-13";

const SLIDE_PORTAL = "https://agent.slideinsurance.com";
const SLIDE_RESUME = "https://agent.slideinsurance.com/policy/default.aspx";
const SLIDE_USER = "gary.h@afains.com";
const SLIDE_QUOTE_NO = "H3QFL04634499";
const SLIDE_PREMIUM = "5465.00";
const SLIDE_COV_A = 433613;

const SLIDE_NOTE = [
  "HO3 Slide — Incomplete / not bindable — NOT a UW decline.",
  `Quote# ${SLIDE_QUOTE_NO}. Estimate Good package $${SLIDE_PREMIUM} only (Better/Best not selected).`,
  `Cov A ${SLIDE_COV_A}; B locked 8672; C 108403; D locked 43361; E 300000; F 1000; AOP 2500; HUR 2%.`,
  "Hip + Clay Tile + roof 2017 accepted.",
  "Couldn't finish — missing pool_size / primary_plumbing_type / water_heater_year + pool conflict (portal Pool locked YES vs sheet No).",
  "Block fields left blank on sheet — not invented: Pool Size, Plumbing Type, Year Hot Water Heater Replaced.",
  `Resume: ${SLIDE_RESUME}. Portal ${SLIDE_PORTAL} username ${SLIDE_USER}.`,
  "CS/UW 800-748-2030 PolicyServices@SlideInsurance.com; agencysupport@slideinsurance.com; claims 1-866-230-3758; PO Box 15012 Worcester MA 01615.",
  "House: 8944 Adriatico LN, YB 2017 masonry 2102sf PC3 flood X Occupied.",
].join(" ");

const TAILROW_PORTAL = "https://agency.harmony-ins.com/";
const TAILROW_AGENCY = "Allegiance HRMY-43432";
const TAILROW_QUOTE_NO = "20-8105778-01";
const TAILROW_DEVELOPED = "3539.00";
const TAILROW_MIN = 4151;
const TAILROW_SHORT = 612;
const TAILROW_COV_A_TRIED = 433613;
const TAILROW_COV_A = 434000;
const TAILROW_EFF = "09/14/2026";

const TAILROW_NOTE = [
  "HO3 Tailrow (Harmony) / Allegiance HRMY-43432 — Quoted then UW error / not bindable.",
  `Quote# ${TAILROW_QUOTE_NO}. Developed $${TAILROW_DEVELOPED}. Portal: Total Premium does not meet minimum developed premium; must be at least $${TAILROW_MIN}. Exception path NOT submitted.`,
  `Don't Write — under min premium $${TAILROW_SHORT} short.`,
  `Cov A ${TAILROW_COV_A_TRIED}→${TAILROW_COV_A}; B 43400; C 108500; D max 43400; E 300000; F portal 2000; AOP 2500; HUR 2% $8680; Eff ${TAILROW_EFF}.`,
  "TypTap voluntary NB not offered; 40060 takeout not used.",
  "Construction FRAME vs sheet Masonry (not editable) — note only.",
  "Wind-mit Roof Geometry prefilled Other (NOT changed to Hip).",
  `Portal ${TAILROW_PORTAL}. customerservice@tailrow.com; agencysupport@tailrow.com; claims@tailrow.com; marketing@tailrow.com; (844) 954-1110.`,
  "Payments: Tailrow Insurance Exchange PO Box 1510 Ocala FL 34478.",
  "House: 8944 Adriatico LN, YB 2017 masonry 2102sf PC3 flood X Occupied.",
].join(" ");

const HOC_NOTE_APPEND = [
  "",
  `Optional appetite (Gloria HO3 ${TODAY} / Harmony session): No voluntary NB offered from this Harmony session for Homeowners Choice — Tailrow only on company list; TypTap voluntary NB not offered; 40060 takeout not used. No HOC quote invented.`,
].join("\n");

async function updateSlide(risk: typeof risks.$inferSelect) {
  const [carrier] = await db.select().from(carriers).where(eq(carriers.id, SLIDE_ID)).limit(1);
  if (!carrier) throw new Error("Slide not found");

  const user = writePortalUsername(SLIDE_USER);
  const existingRows = normalizeAppetiteRows(carrier.appetiteRows);
  const incompleteRow = emptyAppetiteRow({
    dateRequested: TODAY,
    lob: "HO3",
    roofAge: "WRITE — 2017 accepted",
    waterHeater: "BLOCK — year blank on sheet (not invented)",
    hvac: "",
    electrical: "",
    claimsHistory: "",
    acceptDecline: "",
    notes: [
      `Gloria HO3 incomplete / not bindable — NOT UW decline. Quote# ${SLIDE_QUOTE_NO}. Estimate Good package $${SLIDE_PREMIUM} only (Better/Best not selected).`,
      "Hip + Clay Tile + roof 2017 accepted.",
      "Blocked: Pool Size (portal Pool locked YES vs sheet No), Plumbing Type, Year Hot Water Heater Replaced — blank not invented.",
      "Couldn't finish — missing pool_size / primary_plumbing_type / water_heater_year + pool conflict.",
      "Do NOT invent pool_size / primary_plumbing_type / water_heater_year onto sheet.",
    ].join(" "),
  });
  const kept = existingRows.filter(
    (r) =>
      !(r.lob === "HO3" && r.dateRequested === TODAY && /H3QFL04634499|Gloria HO3 incomplete/i.test(r.notes)),
  );
  const appetiteRows = [...kept, incompleteRow];

  const priorNotes = String(carrier.appetiteNotes || "").trim();
  const freshAppend = `Incomplete update (Gloria HO3 ${TODAY}): Quote# ${SLIDE_QUOTE_NO} Estimate Good $${SLIDE_PREMIUM} only — not bindable; blocked pool_size / primary_plumbing_type / water_heater_year + portal Pool YES vs sheet No (not inventing blanks). Hip + Clay Tile + roof 2017 accepted.`;
  let appetiteNotes: string;
  if (/H3QFL04634499/.test(priorNotes)) {
    const stripped = priorNotes
      .split("\n")
      .filter((line) => !/H3QFL04634499|Gloria HO3 2026-09-13|Incomplete \(Gloria HO3/i.test(line))
      .join("\n")
      .trim();
    appetiteNotes = [stripped, freshAppend].filter(Boolean).join("\n").trim();
  } else {
    appetiteNotes = [priorNotes, freshAppend].filter(Boolean).join("\n").trim();
  }

  await db
    .update(carriers)
    .set({
      agentPortalUrl: SLIDE_PORTAL,
      portalUrl: SLIDE_PORTAL,
      portalLogin: `Violet portal ${SLIDE_PORTAL} · resume ${SLIDE_RESUME} · user ${SLIDE_USER} — legacy ghallock closed for FL NB — no password this handoff`,
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
      result: "quoted",
      bindable: false,
      quoteNumber: SLIDE_QUOTE_NO,
      premium: SLIDE_PREMIUM,
      covATried: SLIDE_COV_A,
      covAForced: SLIDE_COV_A,
      why: SLIDE_NOTE,
      snapYearBuilt: risk.yearBuilt ?? 2017,
      snapRoofYear: 2017,
      snapRoofCovering: risk.roofCovering ?? "Tile-Clay",
      snapConstruction: risk.construction ?? "Masonry",
      snapOpeningProtection: risk.openingProtection ?? null,
      snapOccupancy: risk.occupancy ?? "Occupied",
      snapStories: risk.stories ?? 2,
      snapPool: risk.pool ?? false,
      snapProtectionClass: risk.protectionClass ?? "3",
      snapMilesToCoast: risk.milesToCoast ?? 52.7,
      snapCity: risk.city ?? "Kissimmee",
      snapCounty: risk.county ?? "OSCEOLA",
      snapCoverageA: SLIDE_COV_A,
      attemptedAt: new Date(),
    } as any)
    .returning();

  const patch = {
    riskOutcome: "conditional",
    nextStep: "fixable",
    bindable: false,
    quoteNumber: SLIDE_QUOTE_NO,
    premium: SLIDE_PREMIUM,
    coverageA: SLIDE_COV_A,
    hurricaneDeductible: "2%",
    aopDeductible: "2500",
    notes: SLIDE_NOTE,
    quoteAttemptLogId: log.id,
    agentStatus: "quoted",
    stub: false,
    carrierOpenUrl: SLIDE_RESUME,
    bindRequirements: [
      "pool_size (portal Pool locked YES vs sheet No — conflict; not inventing)",
      "primary_plumbing_type (blank on sheet — not inventing)",
      "water_heater_year / Year Hot Water Heater Replaced (blank on sheet — not inventing)",
    ],
  } as any;

  let quoteId: string;
  let mode: string;
  if (existing[0]) {
    if (existing[0].id !== SLIDE_QUOTE_ID) {
      console.warn("Slide quote id changed:", existing[0].id, "expected", SLIDE_QUOTE_ID);
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
          roofAge: lastRow.roofAge,
          waterHeater: lastRow.waterHeater,
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
      notes: (q2?.notes || "").slice(0, 280),
    },
    appetiteLog: {
      id: l2?.id,
      result: l2?.result,
      bindable: l2?.bindable,
      quoteNumber: l2?.quoteNumber,
      premium: l2?.premium,
      snapCoverageA: l2?.snapCoverageA,
      why: (l2?.why || "").slice(0, 220),
    },
  };
}

async function createTailrow(risk: typeof risks.$inferSelect) {
  const [carrier] = await db.select().from(carriers).where(eq(carriers.id, TAILROW_ID)).limit(1);
  if (!carrier) throw new Error("Tailrow not found");

  const existingRows = normalizeAppetiteRows(carrier.appetiteRows);
  // Don't Write is primary; optional appetite row notes portal quirks only (no accept)
  const noteRow = emptyAppetiteRow({
    dateRequested: TODAY,
    lob: "HO3",
    roofAge: "note — roof year not the blocker this attempt",
    waterHeater: "",
    hvac: "",
    electrical: "",
    claimsHistory: "",
    acceptDecline: "",
    notes: [
      `Gloria HO3 Quote# ${TAILROW_QUOTE_NO} developed $${TAILROW_DEVELOPED} — UW min premium $${TAILROW_MIN} ($${TAILROW_SHORT} short); exception NOT submitted.`,
      "Construction FRAME portal vs sheet Masonry — not editable; note only (do not change sheet).",
      "Wind-mit Roof Geometry prefilled Other — NOT changed to Hip.",
      "TypTap voluntary NB not offered; 40060 takeout not used.",
    ].join(" "),
  });
  const keptAppetite = existingRows.filter(
    (r) => !(r.lob === "HO3" && r.dateRequested === TODAY && /20-8105778-01|Gloria HO3 Quote#/i.test(r.notes)),
  );
  const appetiteRows = [...keptAppetite, noteRow];

  const existingDont = normalizeDontWriteRows(carrier.dontWriteRows);
  const dontRow = emptyDontWriteRow({
    date: TODAY,
    lob: "HO3",
    reason: `Under min developed premium — $${TAILROW_SHORT} short ($${TAILROW_DEVELOPED} developed vs $${TAILROW_MIN} min); exception path NOT submitted`,
    notes: [
      `Gloria HO3 Quote# ${TAILROW_QUOTE_NO}. Don't Write this attempt.`,
      "Construction FRAME vs sheet Masonry (not editable — note only).",
      "Wind-mit Roof Geometry prefilled Other (NOT changed to Hip).",
      `${TAILROW_AGENCY}.`,
    ].join(" "),
  });
  const keptDont = existingDont.filter(
    (r) => !(r.lob === "HO3" && r.date === TODAY && /20-8105778-01|Under min developed premium/i.test(`${r.reason} ${r.notes}`)),
  );
  const dontWriteRows = [...keptDont, dontRow];

  const priorNotes = String(carrier.appetiteNotes || "").trim();
  const append = `\nDon't Write (Gloria HO3 ${TODAY}): Quote# ${TAILROW_QUOTE_NO} developed $${TAILROW_DEVELOPED} under min $${TAILROW_MIN} ($${TAILROW_SHORT} short); exception NOT submitted. FRAME vs Masonry note-only; Roof Geometry Other not changed to Hip.`;
  const appetiteNotes = priorNotes.includes("20-8105778-01")
    ? priorNotes
        .split("\n")
        .filter((line) => !/20-8105778-01|Don't Write \(Gloria HO3/i.test(line))
        .join("\n")
        .trim() + append
    : [priorNotes, append].filter(Boolean).join("\n").trim();

  const priorDontNotes = String((carrier as any).dontWriteNotes || "").trim();
  const dontAppend = `\nGloria HO3 ${TODAY}: under min developed premium $${TAILROW_SHORT} short ($${TAILROW_DEVELOPED} vs $${TAILROW_MIN}) — Quote# ${TAILROW_QUOTE_NO}; exception not submitted.`;
  const dontWriteNotes = priorDontNotes.includes("20-8105778-01")
    ? priorDontNotes
        .split("\n")
        .filter((line) => !/20-8105778-01|Gloria HO3 2026-09-13: under min/i.test(line))
        .join("\n")
        .trim() + dontAppend
    : [priorDontNotes, dontAppend].filter(Boolean).join("\n").trim();

  await db
    .update(carriers)
    .set({
      agentPortalUrl: TAILROW_PORTAL,
      portalUrl: TAILROW_PORTAL,
      portalLogin: `Harmony ${TAILROW_PORTAL} · ${TAILROW_AGENCY} — no password this handoff`,
      phone: "(844) 954-1110",
      customerServicePhone: "(844) 954-1110",
      claimsPhone: "(844) 954-1110",
      underwriterEmail: "agencysupport@tailrow.com",
      email: "customerservice@tailrow.com",
      mailingAddress: "Tailrow Insurance Exchange PO Box 1510 Ocala FL 34478",
      appetiteNotes,
      appetiteRows,
      dontWriteNotes,
      dontWriteRows,
      portalSecretsUpdatedAt: new Date(),
      updatedAt: new Date(),
    } as any)
    .where(eq(carriers.id, TAILROW_ID));

  const existing = await db
    .select()
    .from(quotes)
    .where(and(eq(quotes.dealId, DEAL), eq(quotes.carrierId, TAILROW_ID)));

  const [log] = await db
    .insert(quoteAttemptLogs)
    .values({
      tenantId: carrier.tenantId,
      dealId: DEAL,
      carrierId: TAILROW_ID,
      riskId: risk.id,
      lineOfBusiness: "HO",
      result: "quoted",
      bindable: false,
      quoteNumber: TAILROW_QUOTE_NO,
      premium: TAILROW_DEVELOPED,
      covATried: TAILROW_COV_A_TRIED,
      covAForced: TAILROW_COV_A,
      why: TAILROW_NOTE,
      snapYearBuilt: risk.yearBuilt ?? 2017,
      snapRoofYear: risk.roofYear ?? 2017,
      snapRoofCovering: risk.roofCovering ?? "Tile-Clay",
      snapConstruction: risk.construction ?? "Masonry",
      snapOpeningProtection: risk.openingProtection ?? null,
      snapOccupancy: risk.occupancy ?? "Occupied",
      snapStories: risk.stories ?? 2,
      snapPool: risk.pool ?? false,
      snapProtectionClass: risk.protectionClass ?? "3",
      snapMilesToCoast: risk.milesToCoast ?? 52.7,
      snapCity: risk.city ?? "Kissimmee",
      snapCounty: risk.county ?? "OSCEOLA",
      snapCoverageA: TAILROW_COV_A,
      // Intentionally NO snapRoofShape — Roof Geometry left Other; not changed to Hip
      attemptedAt: new Date(),
    } as any)
    .returning();

  const patch = {
    riskOutcome: "conditional",
    nextStep: "hard_no",
    bindable: false,
    quoteNumber: TAILROW_QUOTE_NO,
    premium: TAILROW_DEVELOPED,
    coverageA: TAILROW_COV_A,
    hurricaneDeductible: "2%",
    aopDeductible: "2500",
    notes: TAILROW_NOTE,
    quoteAttemptLogId: log.id,
    agentStatus: "quoted",
    stub: false,
    carrierOpenUrl: TAILROW_PORTAL,
    bindRequirements: [
      `Minimum developed premium $${TAILROW_MIN} (developed $${TAILROW_DEVELOPED}; $${TAILROW_SHORT} short) — exception path NOT submitted`,
    ],
    lostReason: `Don't Write — under min premium $${TAILROW_SHORT} short`,
  } as any;

  let quoteId: string;
  let mode: string;
  // Prefer NEW quote row; if a prior Tailrow stub/markets row exists for this deal, update it to this real quote
  if (existing[0]) {
    await db.update(quotes).set(patch).where(eq(quotes.id, existing[0].id));
    quoteId = existing[0].id;
    mode = existing.length > 1 ? `updated_primary_of_${existing.length}` : "updated_existing";
  } else {
    const [q] = await db
      .insert(quotes)
      .values({
        tenantId: carrier.tenantId,
        dealId: DEAL,
        riskId: risk.id,
        carrierId: TAILROW_ID,
        ...patch,
      } as any)
      .returning();
    quoteId = q.id;
    mode = "created";
  }

  const [c2] = await db.select().from(carriers).where(eq(carriers.id, TAILROW_ID)).limit(1);
  const [q2] = await db.select().from(quotes).where(eq(quotes.id, quoteId)).limit(1);
  const [l2] = await db.select().from(quoteAttemptLogs).where(eq(quoteAttemptLogs.id, log.id)).limit(1);
  const dont = normalizeDontWriteRows(c2?.dontWriteRows);
  const lastDont = dont[dont.length - 1];
  const rows = normalizeAppetiteRows(c2?.appetiteRows);
  const lastRow = rows[rows.length - 1];

  return {
    mode,
    quoteId,
    appetiteId: log.id,
    carrierId: TAILROW_ID,
    carrierName: c2?.name,
    portalUrl: c2?.portalUrl,
    agentPortalUrl: c2?.agentPortalUrl,
    portalLogin: c2?.portalLogin,
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
    dontWriteRowsLen: dont.length,
    dontWriteRowLast: lastDont
      ? {
          id: lastDont.id,
          date: lastDont.date,
          lob: lastDont.lob,
          reason: lastDont.reason,
          notes: lastDont.notes.slice(0, 240),
        }
      : null,
    appetiteNotesTail: (c2?.appetiteNotes || "").slice(-280),
    dontWriteNotesTail: String((c2 as any)?.dontWriteNotes || "").slice(-280),
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
      lostReason: q2?.lostReason,
      notes: (q2?.notes || "").slice(0, 280),
    },
    appetiteLog: {
      id: l2?.id,
      result: l2?.result,
      bindable: l2?.bindable,
      quoteNumber: l2?.quoteNumber,
      premium: l2?.premium,
      covAForced: l2?.covAForced,
      snapCoverageA: l2?.snapCoverageA,
      why: (l2?.why || "").slice(0, 220),
    },
  };
}

async function optionalHocNote() {
  const [carrier] = await db.select().from(carriers).where(eq(carriers.id, HOC_ID)).limit(1);
  if (!carrier) return { skipped: true, reason: "HOC carrier not found" };

  const priorNotes = String(carrier.appetiteNotes || "").trim();
  let appetiteNotes: string;
  if (/No voluntary NB offered from this Harmony session for Homeowners Choice/i.test(priorNotes)) {
    // replace today's Gloria Harmony session line(s)
    const stripped = priorNotes
      .split("\n")
      .filter((line) => !/Gloria HO3 2026-09-13 \/ Harmony session|No voluntary NB offered from this Harmony session for Homeowners Choice/i.test(line))
      .join("\n")
      .trim();
    appetiteNotes = [stripped, HOC_NOTE_APPEND].filter(Boolean).join("\n").trim();
  } else {
    appetiteNotes = [priorNotes, HOC_NOTE_APPEND].filter(Boolean).join("\n").trim();
  }

  await db
    .update(carriers)
    .set({
      appetiteNotes,
      updatedAt: new Date(),
    } as any)
    .where(eq(carriers.id, HOC_ID));

  // Confirm no HOC quote invented on this deal
  const hocQuotes = await db
    .select()
    .from(quotes)
    .where(and(eq(quotes.dealId, DEAL), eq(quotes.carrierId, HOC_ID)));

  const [c2] = await db.select().from(carriers).where(eq(carriers.id, HOC_ID)).limit(1);
  return {
    skipped: false,
    carrierId: HOC_ID,
    carrierName: c2?.name,
    dealHocQuotesCount: hocQuotes.length,
    appetiteNotesTail: String(c2?.appetiteNotes || "").slice(-360),
  };
}

async function sheetSanity() {
  const [sheet] = await db
    .select()
    .from(quoteSheets)
    .where(and(eq(quoteSheets.dealId, DEAL), eq(quoteSheets.line, "home")))
    .limit(1);
  const values = (sheet?.values || {}) as Record<string, any>;
  return {
    sheetId: sheet?.id ?? null,
    pool: values.pool ?? null,
    pool_size: values.pool_size ?? null,
    primary_plumbing_type: values.primary_plumbing_type ?? null,
    water_heater_year: values.water_heater_year ?? null,
    roof_shape: values.roof_shape ?? null,
    construction: values.construction ?? null,
    roof_covering: values.roof_covering ?? null,
    roof_year: values.roof_year ?? null,
  };
}

async function main() {
  const [risk] = await db.select().from(risks).where(eq(risks.dealId, DEAL)).limit(1);
  if (!risk) throw new Error("no risk for Gloria HO3");

  const beforeSheet = await sheetSanity();
  const slide = await updateSlide(risk);
  const tailrow = await createTailrow(risk);
  const hoc = await optionalHocNote();
  const afterSheet = await sheetSanity();

  console.log(
    JSON.stringify(
      {
        dealId: DEAL,
        riskId: risk.id,
        slide,
        tailrow,
        hoc,
        sheetUnchangedBlockedFields: {
          before: beforeSheet,
          after: afterSheet,
          invented: {
            pool_size: afterSheet.pool_size?.value ? "INVENTED!" : "blank/absent OK",
            primary_plumbing_type: afterSheet.primary_plumbing_type?.value ? "INVENTED!" : "blank OK",
            water_heater_year: afterSheet.water_heater_year?.value ? "INVENTED!" : "blank OK",
          },
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
