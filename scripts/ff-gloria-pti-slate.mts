/**
 * Gaya handoff — Gloria Martinez / HO3 · People's Trust / SLATE
 * A) Fill home quote_sheet from Slate third-party RETURN (not invent, not AT).
 * B) Quotes + Appetite: Incomplete / Couldn't finish — NOT UW decline.
 *    Indication HO-3 $1885 note only — NOT bindable premium. Quote# none.
 * C) Add insurance_score_range picklist so Fill can carry it next time.
 * FitFirst Mac mini ONLY. No CloudAgent. No Air.
 */
import { and, eq } from "drizzle-orm";
import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";
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
import { applyExtractedToSheet, fieldIsBlank } from "../src/lib/quote-sheet/apply";
import { applySavedSheetToDeal } from "../src/app/actions/quote-sheet";
import { upsertFieldDef } from "../src/lib/custom-fields/store";
import { parseLayout, allLayoutFieldKeys } from "../src/lib/custom-fields/types";
import { saveLayoutForLine } from "../src/lib/custom-fields/store";
import { DEFAULT_TENANT_ID } from "../src/lib/domain";

const DEAL = "8f4e7b68-2de3-458e-914b-ba60ea3c47aa";
const CARRIER_ID = "67d52980-9167-4d94-8017-23509ded489a"; // People's Trust
const SHEET_ID = "3a8f58a0-d54e-4fdd-abe6-50f4eb5673dd";
const TODAY = "2026-09-13";

const PORTAL = "https://pti.slateinsure.com";
const LOGIN = "https://pti.api.slateinsure.com:2443/Account/Login";
const USER = "javier.g@afains.com";
const AGENCY = "AFAINS LLC dba American Family Agency";
const AGENCY_CODE = "0978-03-00";

const NOTE = [
  "HO3 People's Trust / SLATE — Incomplete / Couldn't finish — NOT a UW decline.",
  "Quote# none. Indication HO-3 $1885 only (not bindable; not stored as quoted premium).",
  "Couldn't finish: required Insurance Score Range (Above Average / Average / Below Average).",
  "Credit authorized but no pull offered; range not picked.",
  `Portal ${PORTAL} · login ${LOGIN} · user ${USER} · agency ${AGENCY} ${AGENCY_CODE} — no password this handoff.`,
  "Slate third-party RETURN (sheet): roof_shape Hip; roof_covering Tile-Clay; roof_year 2017.",
  "Did not overwrite Gaya portal overrides: construction Masonry (not Wood), garage 2 (not 1), pool No (not Yes).",
  "House: 8944 Adriatico LN, YB 2017 masonry 2102sf 2-story Occupied PC3 flood X.",
  "Next: go back into Slate and pick Insurance Score Range.",
].join(" ");

const APPETITE_NOTE_APPEND = [
  "",
  `Incomplete (Gloria HO3 ${TODAY}): People's Trust / SLATE — not UW decline. Indication HO-3 $1885 (not bindable). Blocked on Insurance Score Range (credit authorized, no pull offered, range not picked). Slate RETURN WRITE roof 2017 Hip Tile-Clay. Quote# none.`,
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

async function fillSheetFromSlate() {
  const [sheet] = await db
    .select()
    .from(quoteSheets)
    .where(and(eq(quoteSheets.dealId, DEAL), eq(quoteSheets.line, "home")))
    .limit(1);
  if (!sheet) throw new Error("no home quote_sheet for Gloria HO3");
  if (sheet.id !== SHEET_ID) console.warn("sheet id changed", sheet.id, "expected", SHEET_ID);

  const before = sheet.values as Record<string, QuoteSheetFieldValue>;

  // Guard: never clobber Gaya portal overrides even if Slate differed
  const protectedBefore = {
    construction: cellOf(before, "construction"),
    exterior: cellOf(before, "exterior"),
    garage_type: cellOf(before, "garage_type"),
    pool: cellOf(before, "pool"),
  };

  const applied = applyExtractedToSheet(
    "home",
    before,
    [
      { fieldKey: "roof_shape", normalizedValue: "Hip", sourceLabel: "slate" },
      { fieldKey: "roof_covering", normalizedValue: "Tile-Clay", sourceLabel: "slate" },
      { fieldKey: "roof_year", normalizedValue: "2017", sourceLabel: "slate" },
      // only if blank — already filled on this deal
      { fieldKey: "stories", normalizedValue: "2", sourceLabel: "slate" },
      { fieldKey: "square_feet", normalizedValue: "2102", sourceLabel: "slate" },
      { fieldKey: "occupancy", normalizedValue: "Occupied", sourceLabel: "slate" },
    ],
    { source: "extracted" },
  );

  const values = { ...applied.values };

  // Ensure insurance_score_range key exists (blank — range was NOT picked)
  if (!values.insurance_score_range) {
    values.insurance_score_range = { value: "", status: "missing", source: "blank" };
  }

  // Re-assert Gaya overrides (defense in depth)
  for (const key of ["construction", "exterior", "garage_type", "pool"] as const) {
    const prev = before[key];
    if (prev && !fieldIsBlank(prev)) values[key] = prev;
  }

  await db
    .update(quoteSheets)
    .set({ values, updatedAt: new Date() })
    .where(eq(quoteSheets.id, sheet.id));

  await applySavedSheetToDeal(DEAL, "home");

  const [afterSheet] = await db
    .select()
    .from(quoteSheets)
    .where(eq(quoteSheets.id, sheet.id))
    .limit(1);
  const after = (afterSheet?.values ?? {}) as Record<string, QuoteSheetFieldValue>;

  return {
    sheetId: sheet.id,
    filledKeys: applied.filledKeys,
    skippedKeys: applied.skippedKeys,
    protectedBefore,
    roof: {
      roof_shape: cellOf(after, "roof_shape"),
      roof_covering: cellOf(after, "roof_covering"),
      roof_year: cellOf(after, "roof_year"),
      year_built: cellOf(after, "year_built"),
      stories: cellOf(after, "stories"),
      square_feet: cellOf(after, "square_feet"),
      occupancy: cellOf(after, "occupancy"),
      primary_heat: cellOf(after, "primary_heat"),
      construction: cellOf(after, "construction"),
      garage_type: cellOf(after, "garage_type"),
      pool: cellOf(after, "pool"),
      insurance_score_range: cellOf(after, "insurance_score_range"),
    },
  };
}

async function ensureInsuranceScoreField() {
  await upsertFieldDef(
    {
      key: "insurance_score_range",
      label: "Insurance score range",
      type: "picklist",
      options: ["Above Average", "Average", "Below Average"],
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
  let addedToLayout = false;
  if (!existing.has("insurance_score_range")) {
    const details =
      layout.columns
        .flatMap((c) => c.sections.map((s) => ({ col: c, section: s })))
        .find((x) => x.section.id === "details") ?? null;
    const target = details?.section ?? layout.columns[0]?.sections[0];
    if (!target) throw new Error("no layout section to append insurance_score_range");
    target.fieldKeys.push("insurance_score_range");
    await saveLayoutForLine("HO", layout);
    addedToLayout = true;
  }
  return { fieldDef: true, addedToLayout, layoutHas: allLayoutFieldKeys(layout).includes("insurance_score_range") };
}

async function writePeoplesTrustQuote(risk: typeof risks.$inferSelect) {
  const [carrier] = await db.select().from(carriers).where(eq(carriers.id, CARRIER_ID)).limit(1);
  if (!carrier) throw new Error("People's Trust not found");

  const user = writePortalUsername(USER);
  const existingRows = normalizeAppetiteRows(carrier.appetiteRows);
  const gloriaRow = emptyAppetiteRow({
    dateRequested: TODAY,
    lob: "HO3",
    roofAge: "WRITE — 2017 (Slate third-party return, ~9y)",
    waterHeater: "not reached",
    hvac: "not reached",
    electrical: "",
    claimsHistory: "",
    acceptDecline: "",
    notes: [
      "Gloria HO3 incomplete / couldn't finish — NOT UW decline.",
      "Indication HO-3 $1885 only — not bindable; quote# none.",
      "Blocked: Insurance Score Range required (Above Average / Average / Below Average); credit authorized, no pull offered, range not picked.",
      "Slate RETURN WRITE: roof Hip / Tile-Clay / 2017.",
      "Do not treat indication as quoted bindable premium.",
    ].join(" "),
  });
  const kept = existingRows.filter(
    (r) => !(r.lob === "HO3" && r.dateRequested === TODAY && /People's Trust|Insurance Score Range|pti.slateinsure/i.test(r.notes)),
  );
  const appetiteRows = [...kept, gloriaRow];

  const priorNotes = String(carrier.appetiteNotes || "").trim();
  const appetiteNotes = priorNotes.includes("Indication HO-3 $1885")
    ? priorNotes
    : [priorNotes, APPETITE_NOTE_APPEND].filter(Boolean).join("\n").trim();

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
      portalSecretsUpdatedAt: new Date(),
      updatedAt: new Date(),
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
      quoteNumber: null,
      premium: null,
      covATried: risk.coverageA ?? 433613,
      why: NOTE,
      snapYearBuilt: risk.yearBuilt ?? 2017,
      snapRoofYear: 2017,
      snapRoofCovering: "Tile-Clay",
      snapConstruction: risk.construction ?? "Masonry",
      snapOpeningProtection: risk.openingProtection ?? null,
      snapOccupancy: risk.occupancy ?? "Occupied",
      snapStories: risk.stories ?? 2,
      snapPool: risk.pool ?? false,
      snapProtectionClass: risk.protectionClass ?? "3",
      snapMilesToCoast: risk.milesToCoast ?? 52.7,
      snapCity: risk.city ?? "Kissimmee",
      snapCounty: risk.county ?? "OSCEOLA",
      snapCoverageA: risk.coverageA ?? 433613,
      attemptedAt: new Date(),
    } as any)
    .returning();

  const patch = {
    riskOutcome: "maybe",
    nextStep: "go_back",
    bindable: false,
    quoteNumber: null,
    premium: null,
    coverageA: risk.coverageA ?? 433613,
    notes: NOTE,
    quoteAttemptLogId: log.id,
    agentStatus: "quoted",
    stub: false,
    carrierOpenUrl: LOGIN,
    bindRequirements: [
      "Insurance Score Range (Above Average / Average / Below Average) — credit authorized, no pull offered, range not picked",
      "Indicative quote only — not bindable yet",
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
    appetiteId: log.id,
    carrierId: CARRIER_ID,
    carrierName: c2?.name,
    portalUrl: c2?.portalUrl,
    agentPortalUrl: c2?.agentPortalUrl,
    website: c2?.website,
    portalLogin: c2?.portalLogin,
    agencyCode: c2?.agencyCode,
    portalUsernameHint: c2?.portalUsernameHint,
    usernameDecrypted: userAfter,
    hasPassword: Boolean(c2?.portalPasswordEnc),
    appetiteRowsLen: rows.length,
    appetiteRowLast: lastRow
      ? {
          id: lastRow.id,
          dateRequested: lastRow.dateRequested,
          lob: lastRow.lob,
          roofAge: lastRow.roofAge,
          acceptDecline: lastRow.acceptDecline,
          notes: lastRow.notes.slice(0, 280),
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
      notes: (q2?.notes || "").slice(0, 240),
    },
    appetiteLog: {
      id: l2?.id,
      result: l2?.result,
      bindable: l2?.bindable,
      quoteNumber: l2?.quoteNumber,
      premium: l2?.premium,
      snapRoofYear: l2?.snapRoofYear,
      snapRoofCovering: l2?.snapRoofCovering,
      snapYearBuilt: l2?.snapYearBuilt,
      why: (l2?.why || "").slice(0, 220),
    },
  };
}

async function main() {
  const field = await ensureInsuranceScoreField();
  const sheet = await fillSheetFromSlate();
  const [risk] = await db.select().from(risks).where(eq(risks.dealId, DEAL)).limit(1);
  if (!risk) throw new Error("no risk for Gloria HO3");
  const quote = await writePeoplesTrustQuote(risk);
  const [riskAfter] = await db.select().from(risks).where(eq(risks.id, risk.id)).limit(1);

  console.log(
    JSON.stringify(
      {
        dealId: DEAL,
        field,
        sheet,
        riskAfter: {
          id: riskAfter?.id,
          yearBuilt: riskAfter?.yearBuilt,
          roofYear: riskAfter?.roofYear,
          roofCovering: riskAfter?.roofCovering,
          construction: riskAfter?.construction,
          occupancy: riskAfter?.occupancy,
          stories: riskAfter?.stories,
          pool: riskAfter?.pool,
        },
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
