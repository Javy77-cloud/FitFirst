/**
 * Gaya handoff — Gloria Martinez / DP3 deal 03dccdd7-db06-4c89-9b7a-cf0a2064d044
 * 10358 NW 30th TER, Doral FL 33172
 * 1) UPDATE American Traditions Q5113600 (quote 19edb457…) — portal product label
 *    confirmed DP3 (not HO3 despite BusType=H URL). Keep Conditional $4090 / Cov A floor 351k.
 * 2) NEW People's Trust / SLATE — Incomplete / Couldn't finish — NOT UW decline.
 *    Form offered Basic Choice (HO-3 unavailable). Indication $3251 only — NOT bindable.
 *    Quote# none. Cov A not reached. Blocked: Insurance Score Range (no credit pull) +
 *    Loss History required/unspecified. Don't Write until score range filled.
 *    Same grabables as HO3 PTI if useful.
 * FitFirst Mac mini ONLY. No CloudAgent. No Air.
 */
import { and, eq } from "drizzle-orm";
import { db } from "../src/lib/db";
import {
  carriers,
  quotes,
  quoteAttemptLogs,
  quoteSheets,
  risks,
  type QuoteSheetFieldValue,
} from "../src/lib/db/schema";
import { writePortalUsername } from "../src/lib/carriers/secrets";
import {
  emptyAppetiteRow,
  emptyDontWriteRow,
  normalizeAppetiteRows,
  normalizeDontWriteRows,
} from "../src/lib/carriers/appetite-rows";
import { decryptSecret } from "../src/lib/secrets/vault";
import { fieldIsBlank } from "../src/lib/quote-sheet/apply";

const DEAL = "03dccdd7-db06-4c89-9b7a-cf0a2064d044";
const RISK_ID = "fe30db6a-9e7b-42a2-b46c-2c7ced26e2e3";
const AT_ID = "e66c7eef-e6a2-44e5-8255-9fe15b11803d";
const AT_QUOTE_ID = "19edb457-5e6a-44b2-96d9-0c1e64353936";
const PTI_ID = "67d52980-9167-4d94-8017-23509ded489a";
const SHEET_ID = "8982682c-eb72-4349-96a0-30c1a1c7aada";
const TODAY = "2026-09-13";

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
  `Cov A tried ${AT_COV_A_TRIED} → forced floor ${AT_COV_A_FORCED}. Roof/house age 2006.`,
  "Credit unconfirmed 10% applied.",
  "Endorsements: Water Damage Exclusion + $10,000 Limited Water Damage.",
  "Not bindable: Page 4 UW requires central heat/air, electrical, plumbing — HVAC not confirmed.",
  "Portal product label confirmed DP3 (not HO3 despite BusType=H URL).",
  `Portal ${AT_LOGIN} · rating ${AT_RATING} · resume ${AT_RESUME} · BusType=H · user ${AT_USER} / ${AT_AGENCY} — no password this handoff.`,
  "Phones/email: (866) 561-2800; claims (866) 561-3433 / (727) 561-0013; (866) 270-0430; custserv@westpointuw.com.",
  "House: 10358 NW 30th TER Doral FL 33172, YB/roof 2006 masonry 1854sf Tenant PC02 flood X Cov A floor 351000.",
  "Write: house age/roof 2006 WRITE. HVAC Don't Write / missing blocked. WH unknown.",
].join(" ");

const AT_APPETITE_NOTE_APPEND = [
  "",
  `Conditional (Gloria DP3 ${TODAY}): Quote# ${AT_QUOTE_NO} $${AT_PREMIUM} Cov A floor ${AT_COV_A_FORCED} (tried ${AT_COV_A_TRIED}). Credit unconfirmed 10% applied. Endorsements Water Damage Exclusion + $10,000 Limited Water Damage. Not bindable — Page 4 UW central heat/air/electrical/plumbing; HVAC not confirmed. House age/roof 2006 WRITE; HVAC Don't Write / missing blocked; WH unknown. Portal product label confirmed DP3 (not HO3 despite BusType=H URL).`,
].join("\n");

const PORTAL = "https://pti.slateinsure.com";
const LOGIN = "https://pti.api.slateinsure.com:2443/Account/Login";
const USER = "javier.g@afains.com";
const AGENCY = "AFAINS LLC dba American Family Agency";
const AGENCY_CODE = "0978-03-00";
const INDICATION = "3251";

const PTI_NOTE = [
  "DP3 People's Trust / SLATE — Incomplete / Couldn't finish — NOT a UW decline.",
  "Form offered Basic Choice (HO-3 unavailable).",
  `Quote# none. Indication $${INDICATION} only — NOT a bindable quote (notes only; not stored as quoted premium).`,
  "Cov A not reached.",
  "Couldn't finish: Insurance Score Range required (Above Average / Average / Below Average); no credit pull offered; range not picked.",
  "Loss History also required/unspecified.",
  "Don't Write until Insurance Score Range filled.",
  `Portal ${PORTAL} · login ${LOGIN} · user ${USER} · agency ${AGENCY} ${AGENCY_CODE} — no password this handoff (same grabables as Gloria HO3 PTI).`,
  "House: 10358 NW 30th TER Doral FL 33172, YB/roof 2006 masonry 1854sf 2-story Tenant PC02 15.3 mi coast Cov A 309000 DP3 landlord.",
  "Next: go back into Slate, fill Insurance Score Range + Loss History, then re-rate Basic Choice.",
].join(" ");

const PTI_APPETITE_NOTE_APPEND = [
  "",
  `Incomplete (Gloria DP3 ${TODAY}): People's Trust / SLATE — not UW decline. Form Basic Choice (HO-3 unavailable). Indication $${INDICATION} (not bindable; notes only). Cov A not reached. Blocked: Insurance Score Range required (no credit pull; range not picked) + Loss History required/unspecified. Don't Write until score range filled. Quote# none.`,
].join("\n");

function cellOf(values: Record<string, QuoteSheetFieldValue>, key: string) {
  const c = values[key];
  return {
    key,
    value: c?.value ?? "",
    source: c?.source ?? "",
    status: c?.status ?? "",
    sourceLabel: c?.sourceLabel ?? "",
    blank: !c || fieldIsBlank(c),
  };
}

async function ensureSheetPlaceholders() {
  const [sheet] = await db
    .select()
    .from(quoteSheets)
    .where(and(eq(quoteSheets.dealId, DEAL), eq(quoteSheets.line, "home")))
    .limit(1);
  if (!sheet) throw new Error("no home quote_sheet for Gloria DP3");
  if (sheet.id !== SHEET_ID) console.warn("sheet id changed", sheet.id, "expected", SHEET_ID);

  const values = { ...(sheet.values as Record<string, QuoteSheetFieldValue>) };
  let touched = false;
  if (!values.insurance_score_range) {
    values.insurance_score_range = { value: "", status: "missing", source: "blank" };
    touched = true;
  }
  if (!values.loss_history) {
    values.loss_history = { value: "", status: "missing", source: "blank" };
    touched = true;
  }
  if (touched) {
    await db
      .update(quoteSheets)
      .set({ values, updatedAt: new Date() })
      .where(eq(quoteSheets.id, sheet.id));
  }
  const [after] = await db.select().from(quoteSheets).where(eq(quoteSheets.id, sheet.id)).limit(1);
  const v = (after?.values ?? {}) as Record<string, QuoteSheetFieldValue>;
  return {
    sheetId: sheet.id,
    touched,
    insurance_score_range: cellOf(v, "insurance_score_range"),
    loss_history: cellOf(v, "loss_history"),
    form: cellOf(v, "form"),
  };
}

async function updateAmericanTraditions(risk: typeof risks.$inferSelect) {
  const [carrier] = await db.select().from(carriers).where(eq(carriers.id, AT_ID)).limit(1);
  if (!carrier) throw new Error("American Traditions not found");

  const user = writePortalUsername(AT_USER);
  const existingRows = normalizeAppetiteRows(carrier.appetiteRows);

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
      `Quote# ${AT_QUOTE_NO} $${AT_PREMIUM} Cov A floor ${AT_COV_A_FORCED}; credit unconfirmed 10% applied; Water Damage Exclusion + $10,000 Limited Water Damage.`,
      "Portal product label confirmed DP3 (not HO3 despite BusType=H URL).",
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
      "Portal product label confirmed DP3 (not HO3 despite BusType=H URL).",
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
  let appetiteNotes: string;
  if (/Q5113600/.test(priorNotes)) {
    const stripped = priorNotes
      .split("\n")
      .filter((line) => !/Q5113600|Gloria DP3 2026-09-13/i.test(line))
      .join("\n")
      .trim();
    appetiteNotes = [stripped, AT_APPETITE_NOTE_APPEND].filter(Boolean).join("\n").trim();
  } else {
    appetiteNotes = [priorNotes, AT_APPETITE_NOTE_APPEND].filter(Boolean).join("\n").trim();
  }

  const priorDontNotes = String((carrier as any).dontWriteNotes || "").trim();
  const dontAppend = `\nGloria DP3 ${TODAY}: HVAC Don't Write / missing blocked — Page 4 UW central heat/air not confirmed (Quote# ${AT_QUOTE_NO}). Portal product label confirmed DP3 (not HO3 despite BusType=H).`;
  const dontWriteNotes = /Q5113600/.test(priorDontNotes)
    ? priorDontNotes
        .split("\n")
        .filter((line) => !/Q5113600|Gloria DP3 2026-09-13: HVAC/i.test(line))
        .join("\n")
        .trim() + dontAppend
    : [priorDontNotes, dontAppend].filter(Boolean).join("\n").trim();

  await db
    .update(carriers)
    .set({
      agentPortalUrl: AT_LOGIN,
      portalUrl: AT_LOGIN,
      portalLogin: `Jerger/West Point — login ${AT_LOGIN} · rating ${AT_RATING} · resume ${AT_RESUME} · user ${AT_USER} (${AT_AGENCY}) BusType=H — product label confirmed DP3 — no password this handoff`,
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
      "Portal product label confirmed DP3 (not HO3 despite BusType=H URL) — keep Conditional $4090 / Cov A floor 351k",
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
  const lastRow = rows.filter((r) => r.lob === "DP3").slice(-1)[0] ?? rows[rows.length - 1];
  const dont = normalizeDontWriteRows(c2?.dontWriteRows);
  const lastDont = dont.filter((r) => r.lob === "DP3").slice(-1)[0] ?? dont[dont.length - 1];

  return {
    mode,
    quoteId,
    appetiteId: log.id,
    carrierId: AT_ID,
    carrierName: c2?.name,
    usernameDecrypted: userAfter,
    hasPassword: Boolean(c2?.portalPasswordEnc),
    portalLogin: c2?.portalLogin,
    appetiteRowLast: lastRow
      ? {
          id: lastRow.id,
          lob: lastRow.lob,
          roofAge: lastRow.roofAge,
          hvac: lastRow.hvac,
          acceptDecline: lastRow.acceptDecline,
          notes: lastRow.notes.slice(0, 280),
        }
      : null,
    dontWriteLast: lastDont
      ? {
          id: lastDont.id,
          lob: lastDont.lob,
          reason: lastDont.reason.slice(0, 200),
          notes: lastDont.notes.slice(0, 200),
        }
      : null,
    quote: {
      riskOutcome: q2?.riskOutcome,
      nextStep: q2?.nextStep,
      bindable: q2?.bindable,
      quoteNumber: q2?.quoteNumber,
      premium: q2?.premium,
      coverageA: q2?.coverageA,
      bindRequirements: q2?.bindRequirements,
      carrierOpenUrl: q2?.carrierOpenUrl,
      notesHasConfirmedDp3: /confirmed DP3/i.test(q2?.notes || ""),
      notesHasVerify: /VERIFY product/i.test(q2?.notes || ""),
      notes: (q2?.notes || "").slice(0, 280),
    },
    appetiteLog: {
      id: l2?.id,
      result: l2?.result,
      bindable: l2?.bindable,
      quoteNumber: l2?.quoteNumber,
      premium: l2?.premium,
      covATried: l2?.covATried,
      covAForced: l2?.covAForced,
      whyHasConfirmedDp3: /confirmed DP3/i.test(l2?.why || ""),
    },
  };
}

async function createPeoplesTrust(risk: typeof risks.$inferSelect) {
  const [carrier] = await db.select().from(carriers).where(eq(carriers.id, PTI_ID)).limit(1);
  if (!carrier) throw new Error("People's Trust not found");

  const user = writePortalUsername(USER);
  const existingRows = normalizeAppetiteRows(carrier.appetiteRows);
  const gloriaRow = emptyAppetiteRow({
    dateRequested: TODAY,
    lob: "DP3",
    roofAge: "",
    waterHeater: "not reached",
    hvac: "not reached",
    electrical: "",
    claimsHistory: "Loss History required/unspecified — not reached",
    acceptDecline: "",
    notes: [
      "Gloria DP3 incomplete / couldn't finish — NOT UW decline.",
      "Form offered Basic Choice (HO-3 unavailable).",
      `Indication $${INDICATION} only — not bindable; quote# none; Cov A not reached.`,
      "Blocked: Insurance Score Range required (no credit pull; range not picked).",
      "Loss History also required/unspecified.",
      "Don't Write until Insurance Score Range filled.",
    ].join(" "),
  });
  const kept = existingRows.filter(
    (r) =>
      !(
        r.lob === "DP3" &&
        r.dateRequested === TODAY &&
        /People's Trust|Insurance Score Range|Basic Choice|Indication \$3251/i.test(r.notes)
      ),
  );
  const appetiteRows = [...kept, gloriaRow];

  const existingDont = normalizeDontWriteRows(carrier.dontWriteRows);
  const dontRow = emptyDontWriteRow({
    date: TODAY,
    lob: "DP3",
    reason:
      "Don't Write until Insurance Score Range filled — required; no credit pull; range not picked (Loss History also required/unspecified)",
    notes: [
      `Gloria DP3 People's Trust / SLATE incomplete — indication $${INDICATION} notes only (not bindable).`,
      "Form Basic Choice (HO-3 unavailable). Quote# none. Cov A not reached.",
      "NOT a UW decline — go back and fill score range + loss history.",
    ].join(" "),
  });
  const keptDont = existingDont.filter(
    (r) =>
      !(
        r.lob === "DP3" &&
        r.date === TODAY &&
        /Insurance Score Range|Indication \$3251|Gloria DP3 People's Trust/i.test(
          `${r.reason} ${r.notes}`,
        )
      ),
  );
  const dontWriteRows = [...keptDont, dontRow];

  const priorNotes = String(carrier.appetiteNotes || "").trim();
  let appetiteNotes: string;
  if (/Indication \$3251|Gloria DP3 2026-09-13.*People's Trust/i.test(priorNotes)) {
    const stripped = priorNotes
      .split("\n")
      .filter(
        (line) =>
          !/Indication \$3251|Gloria DP3 2026-09-13.*People's Trust|Basic Choice \(HO-3 unavailable\)/i.test(
            line,
          ),
      )
      .join("\n")
      .trim();
    appetiteNotes = [stripped, PTI_APPETITE_NOTE_APPEND].filter(Boolean).join("\n").trim();
  } else {
    appetiteNotes = [priorNotes, PTI_APPETITE_NOTE_APPEND].filter(Boolean).join("\n").trim();
  }

  const priorDontNotes = String((carrier as any).dontWriteNotes || "").trim();
  const dontAppend = `\nGloria DP3 ${TODAY}: Don't Write People's Trust / SLATE until Insurance Score Range filled (indication $${INDICATION} notes only; Loss History also required/unspecified).`;
  const dontWriteNotes = /Indication \$3251|Don't Write People's Trust \/ SLATE until Insurance Score Range/i.test(
    priorDontNotes,
  )
    ? priorDontNotes
        .split("\n")
        .filter(
          (line) =>
            !/Indication \$3251|Don't Write People's Trust \/ SLATE until Insurance Score Range/i.test(
              line,
            ),
        )
        .join("\n")
        .trim() + dontAppend
    : [priorDontNotes, dontAppend].filter(Boolean).join("\n").trim();

  // Same grabables as HO3 — keep portal/login/user/agency; do not invent phones/emails/password
  await db
    .update(carriers)
    .set({
      agentPortalUrl: LOGIN,
      portalUrl: LOGIN,
      website: PORTAL,
      portalLogin: `People's Trust / SLATE — ${PORTAL} · login ${LOGIN} · user ${USER} · ${AGENCY} ${AGENCY_CODE} — no password this handoff`,
      agencyCode: AGENCY_CODE,
      ...user,
      portalPasswordEnc: null,
      portalPasswordIv: null,
      appetiteNotes,
      appetiteRows,
      dontWriteNotes,
      dontWriteRows,
      portalSecretsUpdatedAt: new Date(),
      updatedAt: new Date(),
    } as any)
    .where(eq(carriers.id, PTI_ID));

  const existing = await db
    .select()
    .from(quotes)
    .where(and(eq(quotes.dealId, DEAL), eq(quotes.carrierId, PTI_ID)));

  const [log] = await db
    .insert(quoteAttemptLogs)
    .values({
      tenantId: carrier.tenantId,
      dealId: DEAL,
      carrierId: PTI_ID,
      riskId: risk.id,
      lineOfBusiness: "HO",
      result: "incomplete",
      bindable: false,
      quoteNumber: null,
      premium: null, // indication $3251 notes only — NOT stored as quoted premium
      covATried: null, // Cov A not reached
      why: PTI_NOTE,
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
      snapCoverageA: null, // Cov A not reached
      attemptedAt: new Date(),
    } as any)
    .returning();

  const patch = {
    riskOutcome: "maybe",
    nextStep: "go_back",
    bindable: false,
    quoteNumber: null,
    premium: null,
    coverageA: null,
    notes: PTI_NOTE,
    quoteAttemptLogId: log.id,
    agentStatus: "quoted",
    stub: false,
    carrierOpenUrl: LOGIN,
    bindRequirements: [
      "Insurance Score Range (Above Average / Average / Below Average) — no credit pull offered; range not picked — Don't Write until filled",
      "Loss History required/unspecified",
      "Form Basic Choice only (HO-3 unavailable) — indication $3251 notes only, not bindable",
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
        carrierId: PTI_ID,
        ...patch,
      } as any)
      .returning();
    quoteId = q.id;
    mode = "created";
  }

  const [c2] = await db.select().from(carriers).where(eq(carriers.id, PTI_ID)).limit(1);
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
    mode,
    quoteId,
    appetiteId: log.id,
    carrierId: PTI_ID,
    carrierName: c2?.name,
    portalUrl: c2?.portalUrl,
    agentPortalUrl: c2?.agentPortalUrl,
    website: c2?.website,
    portalLogin: c2?.portalLogin,
    agencyCode: c2?.agencyCode,
    portalUsernameHint: c2?.portalUsernameHint,
    usernameDecrypted: userAfter,
    hasPassword: Boolean(c2?.portalPasswordEnc),
    phone: c2?.phone,
    email: c2?.email,
    appetiteRowsLen: rows.length,
    appetiteRowLast: lastRow
      ? {
          id: lastRow.id,
          lob: lastRow.lob,
          claimsHistory: lastRow.claimsHistory,
          acceptDecline: lastRow.acceptDecline,
          notes: lastRow.notes.slice(0, 280),
        }
      : null,
    dontWriteLast: lastDont
      ? {
          id: lastDont.id,
          lob: lastDont.lob,
          reason: lastDont.reason.slice(0, 220),
          notes: lastDont.notes.slice(0, 200),
        }
      : null,
    quote: {
      riskOutcome: q2?.riskOutcome,
      nextStep: q2?.nextStep,
      bindable: q2?.bindable,
      quoteNumber: q2?.quoteNumber,
      premium: q2?.premium,
      coverageA: q2?.coverageA,
      bindRequirements: q2?.bindRequirements,
      notesHasIndication3251: /\$3251/.test(q2?.notes || ""),
      notesHasBasicChoice: /Basic Choice/i.test(q2?.notes || ""),
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

async function main() {
  const [risk] = await db.select().from(risks).where(eq(risks.dealId, DEAL)).limit(1);
  if (!risk) throw new Error("no risk for Gloria DP3");
  if (risk.id !== RISK_ID) console.warn("risk id changed", risk.id, "expected", RISK_ID);

  const sheet = await ensureSheetPlaceholders();
  const americanTraditions = await updateAmericanTraditions(risk);
  const peoplesTrust = await createPeoplesTrust(risk);

  console.log(
    JSON.stringify(
      {
        dealId: DEAL,
        riskId: risk.id,
        sheet,
        americanTraditions,
        peoplesTrust,
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
