/**
 * Gaya handoff — Gloria Martinez / DP3 deal 03dccdd7-db06-4c89-9b7a-cf0a2064d044
 * 10358 NW 30th TER, Doral FL 33172
 * Harmony portal https://agency.harmony-ins.com/ — Tailrow + TypTap (no separate Harmony carrier)
 * 1) Tailrow — no_market / no DP3. New-quote HO3 only; TypTap NB not offered; 40060 takeout not used.
 *    Don't Write Tailrow for DP3. Quote# none. Bindable N. Quotes+Appetite + DontWrite.
 * 2) TypTap — no_market / no DP3. TypTap voluntary NB not offered; 40060 takeout not used.
 *    Don't Write TypTap for DP3. Quote# none. Bindable N. Quotes+Appetite + DontWrite.
 * 3) HOC — skip this wave; light appetite note only (no quote invented).
 * FitFirst Mac mini ONLY. No CloudAgent. No Air.
 * Do NOT reopen Gloria HO3 Tailrow Quote# 20-8105778-01 / HO3 appetite+dont rows.
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
const HO3_DEAL = "8f4e7b68-2de3-458e-914b-ba60ea3c47aa";
const TAILROW_ID = "33333333-3333-4333-8333-333333333306";
const TYPTAP_ID = "0c3ec003-aa2d-44b0-89d2-8d85021d942e";
const HOC_ID = "33333333-3333-4333-8333-333333333304";
const TODAY = "2026-09-13";

const PORTAL = "https://agency.harmony-ins.com/";
const AGENCY = "Allegiance HRMY-43432";

const HOUSE =
  "House: 10358 NW 30th TER Doral FL 33172, YB/roof 2006 masonry 1854sf 2-story Tenant PC02 15.3 mi coast Cov A 309000 DP3 landlord.";

const TAILROW_NOTE = [
  "DP3 Tailrow (Harmony) / Allegiance HRMY-43432 — No market / no DP3 product.",
  "New-quote company list is HO3 only — no DP3 on Harmony for Tailrow.",
  "TypTap voluntary NB not offered; 40060 takeout not used.",
  "Don't Write Tailrow for DP3.",
  "Quote# none. Bindable N. No premium. Cov A not reached.",
  `Portal ${PORTAL}. customerservice@tailrow.com; agencysupport@tailrow.com; claims@tailrow.com; marketing@tailrow.com; (844) 954-1110.`,
  "Payments: Tailrow Insurance Exchange PO Box 1510 Ocala FL 34478.",
  "Do NOT reopen Gloria HO3 Quote# 20-8105778-01 (separate HO3 deal).",
  HOUSE,
].join(" ");

const TYPTAP_NOTE = [
  "DP3 TypTap (Harmony) — No market / no DP3 product.",
  "TypTap voluntary NB not offered on this Harmony session; 40060 takeout not used.",
  "New-quote path HO3 only for Tailrow — TypTap not selectable for DP3 NB.",
  "Don't Write TypTap for DP3.",
  "Quote# none. Bindable N. No premium. Cov A not reached.",
  `Portal ${PORTAL} · ${AGENCY}.`,
  HOUSE,
].join(" ");

const HOC_NOTE_APPEND = [
  "",
  `Optional appetite (Gloria DP3 ${TODAY} / Harmony session): Skipped this wave for Homeowners Choice — no voluntary NB; Tailrow/TypTap on Harmony agency.harmony-ins.com have no DP3 (new-quote HO3 only; TypTap NB not offered; 40060 takeout not used). No HOC quote invented.`,
].join("\n");

function snapFromRisk(risk: typeof risks.$inferSelect) {
  return {
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
    snapCoverageA: null as number | null,
  };
}

async function writeNoDp3(opts: {
  carrierId: string;
  label: string;
  note: string;
  lostReason: string;
  appetiteNotesText: string;
  dontReason: string;
  dontNotes: string;
  dontAppend: string;
  portalLogin: string;
  phone?: string | null;
  email?: string | null;
  underwriterEmail?: string | null;
  mailingAddress?: string | null;
  claimsPhone?: string | null;
  customerServicePhone?: string | null;
  risk: typeof risks.$inferSelect;
  keepHo3Marker?: RegExp;
}) {
  const {
    carrierId,
    label,
    note,
    lostReason,
    appetiteNotesText,
    dontReason,
    dontNotes,
    dontAppend,
    portalLogin,
    risk,
    keepHo3Marker,
  } = opts;

  const [carrier] = await db.select().from(carriers).where(eq(carriers.id, carrierId)).limit(1);
  if (!carrier) throw new Error(`${label} not found`);

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
      `Gloria DP3 — no_market / no DP3 product (${label} / Harmony).`,
      "New-quote HO3 only; TypTap voluntary NB not offered; 40060 takeout not used.",
      `Don't Write ${label} for DP3. Quote# none. Bindable N.`,
      keepHo3Marker ? "Do NOT reopen Gloria HO3 Quote# 20-8105778-01." : "",
    ]
      .filter(Boolean)
      .join(" "),
  });
  const keptAppetite = existingRows.filter(
    (r) =>
      !(
        r.lob === "DP3" &&
        r.dateRequested === TODAY &&
        /no DP3 product|Gloria DP3|40060 takeout/i.test(r.notes)
      ),
  );
  // Keep any HO3 rows (e.g. Tailrow under-min) untouched
  const appetiteRows = [...keptAppetite, appetiteRow];

  const existingDont = normalizeDontWriteRows(carrier.dontWriteRows);
  const dontRow = emptyDontWriteRow({
    date: TODAY,
    lob: "DP3",
    reason: dontReason,
    notes: dontNotes,
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
  let appetiteNotes: string;
  if (/Gloria DP3 2026-09-13.*no DP3|No market \(Gloria DP3 2026-09-13\)/i.test(priorNotes)) {
    const stripped = priorNotes
      .split("\n")
      .filter(
        (line) =>
          !/Gloria DP3 2026-09-13|No market \(Gloria DP3 2026-09-13\)|no DP3 product on Harmony/i.test(
            line,
          ),
      )
      .join("\n")
      .trim();
    appetiteNotes = [stripped, appetiteNotesText].filter(Boolean).join("\n").trim();
  } else {
    appetiteNotes = [priorNotes, appetiteNotesText].filter(Boolean).join("\n").trim();
  }

  const priorDontNotes = String((carrier as any).dontWriteNotes || "").trim();
  const dontWriteNotes = new RegExp(`Gloria DP3 ${TODAY}:.*${label}`, "i").test(priorDontNotes)
    ? priorDontNotes
        .split("\n")
        .filter((line) => !new RegExp(`Gloria DP3 ${TODAY}:.*${label}`, "i").test(line))
        .join("\n")
        .trim() +
      "\n" +
      dontAppend
    : [priorDontNotes, dontAppend].filter(Boolean).join("\n").trim();

  const patchCarrier: Record<string, unknown> = {
    agentPortalUrl: PORTAL,
    portalUrl: PORTAL,
    portalLogin,
    appetiteNotes,
    appetiteRows,
    dontWriteNotes,
    dontWriteRows,
    updatedAt: new Date(),
  };
  if (opts.phone != null) patchCarrier.phone = opts.phone;
  if (opts.customerServicePhone != null) patchCarrier.customerServicePhone = opts.customerServicePhone;
  if (opts.claimsPhone != null) patchCarrier.claimsPhone = opts.claimsPhone;
  if (opts.email != null) patchCarrier.email = opts.email;
  if (opts.underwriterEmail != null) patchCarrier.underwriterEmail = opts.underwriterEmail;
  if (opts.mailingAddress != null) patchCarrier.mailingAddress = opts.mailingAddress;

  await db.update(carriers).set(patchCarrier as any).where(eq(carriers.id, carrierId));

  const [log] = await db
    .insert(quoteAttemptLogs)
    .values({
      tenantId: carrier.tenantId,
      dealId: DEAL,
      carrierId,
      riskId: risk.id,
      lineOfBusiness: "HO",
      result: "no_market",
      bindable: false,
      quoteNumber: null,
      premium: null,
      covATried: null,
      why: note,
      ...snapFromRisk(risk),
      attemptedAt: new Date(),
    } as any)
    .returning();

  const existing = await db
    .select()
    .from(quotes)
    .where(and(eq(quotes.dealId, DEAL), eq(quotes.carrierId, carrierId)));

  const patch = {
    riskOutcome: "no_market",
    nextStep: "hard_no",
    bindable: false,
    quoteNumber: null,
    premium: null,
    coverageA: null,
    notes: note,
    quoteAttemptLogId: log.id,
    agentStatus: "quoted",
    stub: false,
    carrierOpenUrl: PORTAL,
    lostReason,
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
        carrierId,
        ...patch,
      } as any)
      .returning();
    quoteId = q.id;
    mode = "created";
  }

  // Sanity: HO3 Tailrow quote must remain untouched when writing Tailrow
  let ho3Untouched: unknown = null;
  if (carrierId === TAILROW_ID) {
    const ho3 = await db
      .select()
      .from(quotes)
      .where(and(eq(quotes.dealId, HO3_DEAL), eq(quotes.carrierId, TAILROW_ID)));
    ho3Untouched = ho3.map((q) => ({
      id: q.id,
      quoteNumber: q.quoteNumber,
      riskOutcome: q.riskOutcome,
      bindable: q.bindable,
    }));
  }

  const [c2] = await db.select().from(carriers).where(eq(carriers.id, carrierId)).limit(1);
  const [q2] = await db.select().from(quotes).where(eq(quotes.id, quoteId)).limit(1);
  const [l2] = await db.select().from(quoteAttemptLogs).where(eq(quoteAttemptLogs.id, log.id)).limit(1);
  const rows = normalizeAppetiteRows(c2?.appetiteRows);
  const dont = normalizeDontWriteRows(c2?.dontWriteRows);
  const lastApp = rows.filter((r) => r.lob === "DP3").slice(-1)[0];
  const lastDont = dont.filter((r) => r.lob === "DP3").slice(-1)[0];
  const ho3AppKept = keepHo3Marker ? rows.some((r) => keepHo3Marker.test(r.notes)) : undefined;
  const ho3DontKept = keepHo3Marker
    ? dont.some((r) => keepHo3Marker.test(`${r.reason} ${r.notes}`))
    : undefined;

  return {
    carrier: label,
    mode,
    quoteId,
    appetiteId: log.id,
    carrierId,
    portalUrl: c2?.portalUrl,
    agentPortalUrl: c2?.agentPortalUrl,
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
    ho3DontRowKept: ho3DontKept,
    ho3QuotesUntouched: ho3Untouched,
    appetiteNotesTail: (c2?.appetiteNotes || "").slice(-300),
    dontWriteNotesTail: String((c2 as any)?.dontWriteNotes || "").slice(-260),
    quote: {
      riskOutcome: q2?.riskOutcome,
      nextStep: q2?.nextStep,
      bindable: q2?.bindable,
      quoteNumber: q2?.quoteNumber,
      premium: q2?.premium,
      lostReason: q2?.lostReason,
      notes: (q2?.notes || "").slice(0, 240),
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

async function optionalHocNote() {
  const [carrier] = await db.select().from(carriers).where(eq(carriers.id, HOC_ID)).limit(1);
  if (!carrier) return { skipped: true, reason: "HOC carrier not found" };

  const priorNotes = String(carrier.appetiteNotes || "").trim();
  let appetiteNotes: string;
  if (/Optional appetite \(Gloria DP3 2026-09-13 \/ Harmony session\)/i.test(priorNotes)) {
    const stripped = priorNotes
      .split("\n")
      .filter(
        (line) =>
          !/Optional appetite \(Gloria DP3 2026-09-13 \/ Harmony session\)|Skipped this wave for Homeowners Choice/i.test(
            line,
          ),
      )
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

  const hocQuotes = await db
    .select()
    .from(quotes)
    .where(and(eq(quotes.dealId, DEAL), eq(quotes.carrierId, HOC_ID)));

  const [c2] = await db.select().from(carriers).where(eq(carriers.id, HOC_ID)).limit(1);
  return {
    skipped: false,
    mode: "appetite_note_only",
    carrierId: HOC_ID,
    carrierName: c2?.name,
    dealHocQuotesCount: hocQuotes.length,
    appetiteNotesTail: String(c2?.appetiteNotes || "").slice(-400),
  };
}

async function main() {
  const [risk] = await db.select().from(risks).where(eq(risks.id, RISK_ID)).limit(1);
  if (!risk || risk.dealId !== DEAL) throw new Error("Gloria DP3 risk missing/mismatch");

  const tailrow = await writeNoDp3({
    carrierId: TAILROW_ID,
    label: "Tailrow",
    note: TAILROW_NOTE,
    lostReason: "Tailrow / Harmony does not write DP3 — new-quote HO3 only",
    appetiteNotesText: `No market (Gloria DP3 ${TODAY}): Tailrow/Harmony does not write DP3 — new-quote HO3 only; TypTap NB not offered; 40060 takeout not used. Quote# none. Bindable N. Do NOT reopen 20-8105778-01.`,
    dontReason:
      "Tailrow / Harmony does not write DP3 / no DP3 product (new-quote HO3 only; TypTap NB not offered; 40060 takeout not used)",
    dontNotes: [
      "Gloria DP3 no_market. Quote# none. Bindable N.",
      "Do NOT reopen Gloria HO3 Quote# 20-8105778-01.",
      `${AGENCY}. Portal ${PORTAL}.`,
    ].join(" "),
    dontAppend: `Gloria DP3 ${TODAY}: Tailrow does not write DP3 / no DP3 product on Harmony (new-quote HO3 only; TypTap NB not offered; 40060 takeout not used).`,
    portalLogin: `Harmony ${PORTAL} · ${AGENCY} — Tailrow new-quote HO3 only (no DP3); TypTap NB not offered; 40060 takeout not used — no password this handoff`,
    phone: "(844) 954-1110",
    customerServicePhone: "(844) 954-1110",
    claimsPhone: "(844) 954-1110",
    underwriterEmail: "agencysupport@tailrow.com",
    email: "customerservice@tailrow.com",
    mailingAddress: "Tailrow Insurance Exchange PO Box 1510 Ocala FL 34478",
    risk,
    keepHo3Marker: /20-8105778-01/,
  });

  const typtap = await writeNoDp3({
    carrierId: TYPTAP_ID,
    label: "TypTap",
    note: TYPTAP_NOTE,
    lostReason: "TypTap / Harmony — TypTap voluntary NB not offered; no DP3 product",
    appetiteNotesText: `No market (Gloria DP3 ${TODAY}): TypTap voluntary NB not offered on Harmony; no DP3 product; 40060 takeout not used. Quote# none. Bindable N.`,
    dontReason:
      "TypTap / Harmony does not write DP3 / TypTap voluntary NB not offered (new-quote HO3 Tailrow only; 40060 takeout not used)",
    dontNotes: [
      "Gloria DP3 no_market. Quote# none. Bindable N.",
      "TypTap voluntary NB not offered; 40060 takeout not used.",
      `Portal ${PORTAL} · ${AGENCY}.`,
    ].join(" "),
    dontAppend: `Gloria DP3 ${TODAY}: TypTap does not write DP3 / TypTap voluntary NB not offered on Harmony (40060 takeout not used).`,
    portalLogin: `Harmony ${PORTAL} · ${AGENCY} — TypTap voluntary NB not offered; no DP3; 40060 takeout not used — no password this handoff`,
    risk,
  });

  const hoc = await optionalHocNote();

  console.log(
    JSON.stringify(
      {
        dealId: DEAL,
        riskId: risk.id,
        harmonySeparateCarrier: false,
        grabables: PORTAL,
        tailrow,
        typtap,
        hoc,
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
