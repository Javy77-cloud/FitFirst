/**
 * Gaya handoff — Gloria Martinez / HO3 deal 8f4e7b68-2de3-458e-914b-ba60ea3c47aa
 * American Integrity (Grabables / aiiconnect) — Incomplete / Couldn't finish
 * NOT UW decline, NOT portal fail.
 * Quote# QT-21889873 In Process · Customer 20979515 · Premium not developed · Cov A not reached
 * Blocked: Months Occupied (0–3/4–8/9–12) + resided under 2 years Yes/No
 * Address Verify failed Address Not Found; lat/long blank. Insurance Score Neutral.
 * Write/Don't Write: incomplete — no UW factors yet.
 * Optional: Deal Details/sheet months_occupied + resided_under_2_years (blank OK) for end-of-wave Fill.
 * FitFirst Mac mini ONLY. No CloudAgent. No Air.
 */
import { and, eq, sql } from "drizzle-orm";
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
import { emptyAppetiteRow, normalizeAppetiteRows } from "../src/lib/carriers/appetite-rows";
import { decryptSecret } from "../src/lib/secrets/vault";
import { fieldIsBlank } from "../src/lib/quote-sheet/apply";
import { upsertFieldDef } from "../src/lib/custom-fields/store";
import { parseLayout, allLayoutFieldKeys } from "../src/lib/custom-fields/types";
import { saveLayoutForLine } from "../src/lib/custom-fields/store";
import { DEFAULT_TENANT_ID } from "../src/lib/domain";

const DEAL = "8f4e7b68-2de3-458e-914b-ba60ea3c47aa";
const CARRIER_ID = "33333333-3333-4333-8333-333333333309"; // American Integrity
const SHEET_ID = "3a8f58a0-d54e-4fdd-abe6-50f4eb5673dd";
const TODAY = "2026-09-13";

const PORTAL = "https://platform.go.aiiconnect.com/innovation";
const LOGIN = "https://platform.go.aiiconnect.com/login.jsp";
const USER = "AG11068A1"; // Use for New Business — NOT AG5237A1 Citizens takeout / NOT AG5237A2 Do not Write NB
const PRODUCER = "American Family Agency LLC";
const UW_PHONE = "866-904-9044";
const CS_TEXT = "SUPPORT to 813-706-3348";
const UW_TEXT = "UNDERWRITING to 813-706-3348";

const QUOTE_NO = "QT-21889873";
const CUSTOMER_NO = "20979515";
const EFF = "09/14/2026–09/14/2027";

const NOTE = [
  "HO3 American Integrity (Grabables / aiiconnect) — Incomplete / Couldn't finish — NOT a UW decline, NOT a portal fail.",
  `Quote# ${QUOTE_NO} status In Process. Customer ${CUSTOMER_NO}. Premium not developed (portal shows 0). Cov A not reached. Eff ${EFF}.`,
  "Couldn't finish — missing Months Occupied (0–3 / 4–8 / 9–12) and “Has the Insured resided at the risk address for less than 2 years?” Yes/No.",
  "Address Verify failed Address Not Found; lat/long blank. Insurance Score Neutral.",
  `Portal ${PORTAL} · login ${LOGIN} · username ${USER} (Use for New Business) · Producer ${PRODUCER} — no password this handoff.`,
  `Do NOT use AG5237A1 (Citizens takeout) or AG5237A2 (Do not Write NB).`,
  `UW ${UW_PHONE}; Client Services text ${CS_TEXT}; Underwriting text ${UW_TEXT}.`,
  "Write/Don't Write: incomplete — no UW factors yet.",
  "House: 8944 Adriatico LN, YB 2017 masonry 2102sf PC3 flood X Occupied.",
  "Next: go back with Months Occupied + resided-under-2-years answers (blank on sheet — not inventing).",
].join(" ");

const APPETITE_NOTE_APPEND = [
  "",
  `Incomplete (Gloria HO3 ${TODAY}): American Integrity Quote# ${QUOTE_NO} In Process Customer ${CUSTOMER_NO} — not UW decline, not portal fail. Premium not developed; Cov A not reached. Blocked: Months Occupied (0–3/4–8/9–12) + resided under 2 years Yes/No. Address Verify failed Address Not Found; lat/long blank. Insurance Score Neutral. No Write/Don't Write UW factors yet. User ${USER} NB only (not AG5237A1/A2).`,
].join("\n");

function cellOf(values: Record<string, QuoteSheetFieldValue>, key: string) {
  const c = values[key];
  return {
    key,
    value: c?.value ?? "",
    source: c?.source ?? "",
    status: c?.status ?? "",
    blank: !c || fieldIsBlank(c),
  };
}

async function ensureOccupancyTenureFields() {
  await upsertFieldDef(
    {
      key: "months_occupied",
      label: "Months occupied",
      type: "picklist",
      options: ["0 to 3 months", "4 to 8 months", "9 months or more"],
    },
    "deals",
  );
  await upsertFieldDef(
    {
      key: "resided_under_2_years",
      label: "Resided at risk address under 2 years?",
      type: "picklist",
      options: ["yes", "no"],
    },
    "deals",
  );

  const rows = await db.execute(sql`
    select id, columns from desk_field_layouts
    where tenant_id = ${DEFAULT_TENANT_ID}
      and module = 'deals'
      and line_of_business = 'HO'
    limit 1
  `);
  const row = (rows as any[])[0];
  if (!row) throw new Error("No HO deals layout");
  const raw = row.columns;
  const layout = parseLayout(raw?.columns ? raw : { columns: Array.isArray(raw) ? raw : raw?.columns });
  const existing = new Set(allLayoutFieldKeys(layout));
  const toAdd = ["months_occupied", "resided_under_2_years"].filter((k) => !existing.has(k));
  let addedToLayout = false;
  if (toAdd.length) {
    const details =
      layout.columns
        .flatMap((c) => c.sections.map((s) => ({ col: c, section: s })))
        .find((x) => x.section.id === "details" || /detail|property|occup/i.test(x.section.label)) ?? null;
    const target = details?.section ?? layout.columns[0]?.sections[0];
    if (!target) throw new Error("no layout section to append occupancy tenure fields");
    for (const key of toAdd) target.fieldKeys.push(key);
    await saveLayoutForLine("HO", layout);
    addedToLayout = true;
  }

  const keys = allLayoutFieldKeys(layout);
  return {
    fieldDefs: true,
    addedToLayout,
    addedKeys: toAdd,
    layoutHas: {
      months_occupied: keys.includes("months_occupied"),
      resided_under_2_years: keys.includes("resided_under_2_years"),
    },
  };
}

async function ensureBlankSheetKeys() {
  const [sheet] = await db
    .select()
    .from(quoteSheets)
    .where(and(eq(quoteSheets.dealId, DEAL), eq(quoteSheets.line, "home")))
    .limit(1);
  if (!sheet) throw new Error("no home quote_sheet for Gloria HO3");
  if (sheet.id !== SHEET_ID) console.warn("sheet id changed", sheet.id, "expected", SHEET_ID);

  const values = { ...(sheet.values as Record<string, QuoteSheetFieldValue>) };
  const touched: string[] = [];
  for (const key of ["months_occupied", "resided_under_2_years"] as const) {
    if (!values[key]) {
      values[key] = { value: "", status: "missing", source: "blank" };
      touched.push(key);
    }
    // leave existing blank values alone — do NOT invent answers
  }

  if (touched.length) {
    await db
      .update(quoteSheets)
      .set({ values, updatedAt: new Date() })
      .where(eq(quoteSheets.id, sheet.id));
  }

  const [after] = await db.select().from(quoteSheets).where(eq(quoteSheets.id, sheet.id)).limit(1);
  const vals = (after?.values ?? {}) as Record<string, QuoteSheetFieldValue>;
  return {
    sheetId: sheet.id,
    touchedBlankKeys: touched,
    months_occupied: cellOf(vals, "months_occupied"),
    resided_under_2_years: cellOf(vals, "resided_under_2_years"),
  };
}

async function writeAmericanIntegrity(risk: typeof risks.$inferSelect) {
  const [carrier] = await db.select().from(carriers).where(eq(carriers.id, CARRIER_ID)).limit(1);
  if (!carrier) throw new Error("American Integrity not found");

  const user = writePortalUsername(USER);

  // Appetite: incomplete note only — acceptDecline blank; NO DontWrite rows (no UW factors yet)
  const existingRows = normalizeAppetiteRows(carrier.appetiteRows);
  const gloriaRow = emptyAppetiteRow({
    dateRequested: TODAY,
    lob: "HO3",
    roofAge: "not reached",
    waterHeater: "not reached",
    hvac: "not reached",
    electrical: "",
    claimsHistory: "",
    acceptDecline: "",
    notes: [
      "Gloria HO3 incomplete / couldn't finish — NOT UW decline, NOT portal fail.",
      `Quote# ${QUOTE_NO} In Process · Customer ${CUSTOMER_NO}. Premium not developed; Cov A not reached.`,
      "Blocked: Months Occupied (0–3/4–8/9–12) + resided under 2 years Yes/No — blank on sheet, not inventing.",
      "Address Verify failed Address Not Found; lat/long blank. Insurance Score Neutral.",
      "Write/Don't Write incomplete — no UW factors yet.",
      `User ${USER} (NB). Do not use AG5237A1 / AG5237A2.`,
    ].join(" "),
  });
  const kept = existingRows.filter(
    (r) =>
      !(
        r.lob === "HO3" &&
        r.dateRequested === TODAY &&
        /QT-21889873|American Integrity|Months Occupied|resided under 2/i.test(r.notes)
      ),
  );
  const appetiteRows = [...kept, gloriaRow];

  const priorNotes = String(carrier.appetiteNotes || "").trim();
  let appetiteNotes: string;
  if (/QT-21889873/.test(priorNotes)) {
    const stripped = priorNotes
      .split("\n")
      .filter((line) => !/QT-21889873|Incomplete \(Gloria HO3.*American Integrity/i.test(line))
      .join("\n")
      .trim();
    appetiteNotes = [stripped, APPETITE_NOTE_APPEND.trim()].filter(Boolean).join("\n").trim();
  } else {
    appetiteNotes = [priorNotes, APPETITE_NOTE_APPEND].filter(Boolean).join("\n").trim();
  }

  await db
    .update(carriers)
    .set({
      agentPortalUrl: LOGIN,
      portalUrl: LOGIN,
      website: PORTAL,
      portalLogin: `Grabables / AIC — ${PORTAL} · login ${LOGIN} · user ${USER} (Use for New Business; NOT AG5237A1 Citizens takeout; NOT AG5237A2 Do not Write NB) · Producer ${PRODUCER} — no password this handoff`,
      ...user,
      portalPasswordEnc: null,
      portalPasswordIv: null,
      phone: UW_PHONE,
      customerServicePhone: "813-706-3348",
      underwriterEmail: null, // text UNDERWRITING to 813-706-3348 — no email this handoff
      email: null,
      appetiteNotes,
      appetiteRows,
      // intentionally leave dontWriteRows untouched — no UW Don't Write factors yet
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
    .where(eq(carriers.id, CARRIER_ID));

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
      result: "incomplete",
      bindable: false,
      quoteNumber: QUOTE_NO,
      premium: null, // not developed — do not store 0 as a priced premium
      covATried: null, // Cov A not reached
      why: NOTE,
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
    notes: NOTE,
    quoteAttemptLogId: log.id,
    agentStatus: "quoted",
    stub: false,
    carrierOpenUrl: PORTAL,
    bindRequirements: [
      "Months Occupied (0–3 / 4–8 / 9–12) — blank on sheet, not inventing",
      "Has the Insured resided at the risk address for less than 2 years? Yes/No — blank on sheet, not inventing",
      "Address Verify failed Address Not Found (lat/long blank) — may need re-verify on resume",
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

  return {
    mode,
    quoteId,
    appetiteLogId: log.id,
    carrierId: CARRIER_ID,
    carrierName: c2?.name,
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
    appetiteRowLast: lastRow
      ? {
          id: lastRow.id,
          dateRequested: lastRow.dateRequested,
          lob: lastRow.lob,
          acceptDecline: lastRow.acceptDecline,
          notes: lastRow.notes.slice(0, 280),
        }
      : null,
    appetiteNotesTail: (c2?.appetiteNotes || "").slice(-360),
    dontWriteRowsLen: Array.isArray((c2 as any)?.dontWriteRows)
      ? ((c2 as any).dontWriteRows as unknown[]).length
      : null,
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

async function main() {
  const fields = await ensureOccupancyTenureFields();
  const sheet = await ensureBlankSheetKeys();
  const [risk] = await db.select().from(risks).where(eq(risks.dealId, DEAL)).limit(1);
  if (!risk) throw new Error("no risk for Gloria HO3");
  const quote = await writeAmericanIntegrity(risk);

  console.log(
    JSON.stringify(
      {
        dealId: DEAL,
        riskId: risk.id,
        fields,
        sheet,
        quote,
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
