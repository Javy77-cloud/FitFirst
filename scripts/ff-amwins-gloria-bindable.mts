/**
 * Gaya handoff — Gloria Martinez / HO3 deal 8f4e7b68-2de3-458e-914b-ba60ea3c47aa
 * Amwins VAVE / Amwins personal lines — Quoted / Bindable Yes (not bound). Form HO3.
 * Submission# / quote# SUB004773160. Premium $2180.42 annual, valid through 10/13/2026.
 * Inspection required Yes. Cov A 433613 accepted no floor.
 * Write/Don't Write: roof WRITE 2017 hip tile; house age WRITE ~9 years. HVAC/WH unknown — not verified.
 * Grabables: personal-lines.amwins.com quote deep-link + agencyservices@afains.com (no password).
 * FitFirst Mac mini ONLY. No CloudAgent. No Air.
 */
import { and, eq } from "drizzle-orm";
import { db } from "../src/lib/db";
import { carriers, quotes, quoteAttemptLogs, risks } from "../src/lib/db/schema";
import { writePortalUsername } from "../src/lib/carriers/secrets";
import { emptyAppetiteRow, normalizeAppetiteRows } from "../src/lib/carriers/appetite-rows";
import { decryptSecret } from "../src/lib/secrets/vault";

const DEAL = "8f4e7b68-2de3-458e-914b-ba60ea3c47aa";
const CARRIER_ID = "cbe2e171-1cac-4c49-8204-04787dfcbae3"; // Amwins
const RISK_ID = "c49fb145-5e00-4abd-ac63-a3d64a2cbb66";
const TODAY = "2026-09-13";

const PORTAL = "https://personal-lines.amwins.com/";
const QUOTE_URL =
  "https://personal-lines.amwins.com/quote/quote?id=SUB004773160#quotes";
const USER = "agencyservices@afains.com";
const SUPPORT_PHONE = "404-751-4400";
const SUPPORT_EMAIL = "digital.customerservice@amwins.com";
const UW_EMAIL = "referralunderwritinggroup.access@amwins.com";
/** Truncated in handoff — do not invent domain/password. */
const WRITER_LIST_NOTE =
  "Writers (Gaya): referralunderwritinggroup.access@amwins.com, morgan.domingue@… (etc.) — stored what fits; no password this handoff.";

const QUOTE_NO = "SUB004773160";
const PREMIUM = "2180.42";
const COV_A = 433613;
const VALID_THROUGH = "10/13/2026";

const NOTE = [
  "HO3 Amwins VAVE / Amwins personal lines (Grabables InstantQuote) — Quoted / Bindable Yes (not bound).",
  `Quote# / Submission# ${QUOTE_NO}. Premium $${PREMIUM} annual, valid through ${VALID_THROUGH}. Inspection required Yes.`,
  "Form HO3. Cov A 433613 accepted no floor. B 43368 C 108404 D 86723 E 300000 F 1000. AOP 2500 HUR 2% ($8672.26).",
  `Portal ${QUOTE_URL} · username ${USER} — no password this handoff.`,
  `Support ${SUPPORT_PHONE} ${SUPPORT_EMAIL}. ${WRITER_LIST_NOTE}`,
  "Write/Don't Write: roof WRITE 2017 hip tile; house age WRITE ~9 years. HVAC/WH unknown — not verified.",
].join(" ");

const APPETITE_NOTE_APPEND = [
  "",
  `Bindable (Gloria HO3 ${TODAY}): Amwins InstantQuote/VAVE Quote# ${QUOTE_NO} $${PREMIUM} annual valid thru ${VALID_THROUGH} — risk accepted / can bind (not bound). Cov A ${COV_A} accepted no floor. Inspection required. Roof WRITE 2017 hip tile; house age WRITE ~9y. HVAC/WH unknown not verified. Grabables ${QUOTE_URL} user ${USER} (no password). Support ${SUPPORT_PHONE} ${SUPPORT_EMAIL}; UW ${UW_EMAIL}.`,
].join("\n");

async function main() {
  const [carrier] = await db.select().from(carriers).where(eq(carriers.id, CARRIER_ID)).limit(1);
  if (!carrier) throw new Error("Amwins not found");

  const [risk] = await db.select().from(risks).where(eq(risks.id, RISK_ID)).limit(1);
  if (!risk || risk.dealId !== DEAL) throw new Error("Gloria HO3 risk missing/mismatch");

  const user = writePortalUsername(USER);

  const existingRows = normalizeAppetiteRows(carrier.appetiteRows);
  const gloriaRow = emptyAppetiteRow({
    dateRequested: TODAY,
    lob: "HO3",
    roofAge: "WRITE — 2017 hip tile",
    waterHeater: "unknown — not verified",
    hvac: "unknown — not verified",
    electrical: "",
    claimsHistory: "",
    acceptDecline: "accept",
    notes: [
      "WRITE house age: ~9 years (YB 2017) — no houseAge column on schema; recorded in notes.",
      "WRITE roof: 2017 hip tile.",
      "HVAC: unknown — not verified (do not mark verified).",
      "Water heater: unknown — not verified (do not mark verified).",
      `Bindable quote ${QUOTE_NO} $${PREMIUM} annual; Cov A ${COV_A} accepted no floor; inspection required; valid thru ${VALID_THROUGH}.`,
      "House snap: Kissimmee OSCEOLA YB2017 masonry Tile-Clay hip PC3 Occupied 2-story no pool ~52.7mi coast.",
    ].join(" "),
  });
  const kept = existingRows.filter(
    (r) =>
      !(
        r.lob === "HO3" &&
        r.dateRequested === TODAY &&
        /SUB004773160|Amwins InstantQuote|Gloria HO3.*Amwins/i.test(r.notes)
      ),
  );
  const appetiteRows = [...kept, gloriaRow];

  const priorNotes = String(carrier.appetiteNotes || "").trim();
  let appetiteNotes: string;
  if (/SUB004773160/.test(priorNotes)) {
    const stripped = priorNotes
      .split("\n")
      .filter((line) => !/SUB004773160|Bindable \(Gloria HO3.*Amwins/i.test(line))
      .join("\n")
      .trim();
    appetiteNotes = [stripped, APPETITE_NOTE_APPEND.trim()].filter(Boolean).join("\n").trim();
  } else {
    appetiteNotes = [priorNotes, APPETITE_NOTE_APPEND].filter(Boolean).join("\n").trim();
  }

  await db
    .update(carriers)
    .set({
      agentPortalUrl: PORTAL,
      portalUrl: PORTAL,
      website: PORTAL,
      portalLogin: `Grabables / Amwins InstantQuote (VAVE) — ${QUOTE_URL} · user ${USER} — no password this handoff · Support ${SUPPORT_PHONE} ${SUPPORT_EMAIL}`,
      ...user,
      portalPasswordEnc: null,
      portalPasswordIv: null,
      phone: SUPPORT_PHONE,
      customerServicePhone: SUPPORT_PHONE,
      email: SUPPORT_EMAIL,
      underwriterEmail: UW_EMAIL,
      // do not invent morgan.domingue full address — leave accountManagerEmail alone / note only
      appetiteNotes,
      appetiteRows,
      // no DontWrite rows — WRITE factors only this attempt
      portalSecretsUpdatedAt: new Date(),
      updatedAt: new Date(),
      carrierInfo: [
        "Grabables Amwins InstantQuote / VAVE personal lines",
        QUOTE_URL,
        `username ${USER} (no password this handoff)`,
        `Support ${SUPPORT_PHONE} ${SUPPORT_EMAIL}`,
        `UW ${UW_EMAIL}`,
        WRITER_LIST_NOTE,
        "Inspection required on bindable quotes; Gloria HO3 Cov A accepted with no floor.",
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
      result: "accepted",
      bindable: true,
      quoteNumber: QUOTE_NO,
      premium: PREMIUM,
      covATried: COV_A,
      covAForced: null, // accepted as-requested — no floor
      why: NOTE,
      snapYearBuilt: risk.yearBuilt ?? 2017,
      snapRoofYear: risk.roofYear ?? 2017,
      snapRoofCovering: "hip tile",
      snapConstruction: risk.construction ?? "Masonry",
      snapOpeningProtection: risk.openingProtection ?? null,
      snapOccupancy: risk.occupancy ?? "Occupied",
      snapStories: risk.stories ?? 2,
      snapPool: risk.pool ?? false,
      snapProtectionClass: risk.protectionClass ?? "3",
      snapMilesToCoast: risk.milesToCoast ?? 52.7,
      snapCity: risk.city ?? "Kissimmee",
      snapCounty: risk.county ?? "OSCEOLA",
      snapCoverageA: COV_A,
      attemptedAt: new Date(),
    } as any)
    .returning();

  const patch = {
    riskOutcome: "accepted", // legacy alias → Quotes group Bindable
    nextStep: "can_bind",
    bindable: true,
    quoteNumber: QUOTE_NO,
    premium: PREMIUM,
    coverageA: COV_A,
    hurricaneDeductible: "2%",
    aopDeductible: "2500",
    notes: NOTE,
    quoteAttemptLogId: log.id,
    agentStatus: "waiting_on_inspection",
    stub: false,
    carrierOpenUrl: QUOTE_URL,
    bindRequirements: [
      "Inspection required",
      `Quote valid through ${VALID_THROUGH}`,
      "Not bound yet — bindable only",
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

  console.log(
    JSON.stringify(
      {
        mode,
        dealId: DEAL,
        riskId: risk.id,
        carrierId: CARRIER_ID,
        carrierName: c2?.name,
        quoteId,
        appetiteLogId: log.id,
        portalUrl: c2?.portalUrl,
        agentPortalUrl: c2?.agentPortalUrl,
        website: c2?.website,
        portalLogin: c2?.portalLogin,
        portalUsernameHint: c2?.portalUsernameHint,
        usernameDecrypted: userAfter,
        hasPassword: Boolean(c2?.portalPasswordEnc),
        phone: c2?.phone,
        customerServicePhone: c2?.customerServicePhone,
        email: c2?.email,
        underwriterEmail: c2?.underwriterEmail,
        carrierInfo: c2?.carrierInfo,
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
              notes: lastRow.notes.slice(0, 280),
            }
          : null,
        appetiteNotesTail: (c2?.appetiteNotes || "").slice(-400),
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
          hurricaneDeductible: q2?.hurricaneDeductible,
          aopDeductible: q2?.aopDeductible,
          agentStatus: q2?.agentStatus,
          carrierOpenUrl: q2?.carrierOpenUrl,
          bindRequirements: q2?.bindRequirements,
          notes: (q2?.notes || "").slice(0, 320),
        },
        appetiteLog: {
          id: l2?.id,
          result: l2?.result,
          bindable: l2?.bindable,
          quoteNumber: l2?.quoteNumber,
          premium: l2?.premium,
          covATried: l2?.covATried,
          covAForced: l2?.covAForced,
          snapYearBuilt: l2?.snapYearBuilt,
          snapRoofYear: l2?.snapRoofYear,
          snapRoofCovering: l2?.snapRoofCovering,
          snapCoverageA: l2?.snapCoverageA,
          snapCity: l2?.snapCity,
          snapCounty: l2?.snapCounty,
          why: (l2?.why || "").slice(0, 280),
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
