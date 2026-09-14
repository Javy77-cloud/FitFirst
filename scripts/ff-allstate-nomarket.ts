import { eq, and } from "drizzle-orm";
import { db } from "../src/lib/db";
import {
  carriers,
  quotes,
  quoteAttemptLogs,
  risks,
  quoteSheets,
} from "../src/lib/db/schema";
import { decryptSecret } from "../src/lib/secrets/vault";
import { writePortalUsername } from "../src/lib/carriers/secrets";

const DEAL = "12aa92aa-3b8d-4211-acf3-fda09d77a194";
const ALLSTATE = "4848e59a-0a78-4d69-8364-cb1c8a3ef037";
const PORTAL = "https://iaadvisorpro.allstate.com";
const EXPECTED_USER = "SFL2M50G";
const NOTE =
  "holding — gender+occupation blank, not inventing; household trimmed to Heather only.";

async function main() {
  const [carrier] = await db.select().from(carriers).where(eq(carriers.id, ALLSTATE));
  if (!carrier) throw new Error("Allstate carrier not found");

  let keepUser = false;
  let decrypted: string | null = null;
  if (carrier.portalUsernameEnc && carrier.portalUsernameIv) {
    try {
      decrypted = decryptSecret(carrier.portalUsernameEnc, carrier.portalUsernameIv);
      if (decrypted === EXPECTED_USER) keepUser = true;
    } catch {
      // fall through — re-write if decrypt fails
    }
  }

  const portalPatch: Record<string, unknown> = {
    agentPortalUrl: PORTAL,
    portalUrl: PORTAL,
    updatedAt: new Date(),
  };

  if (keepUser) {
    // keep existing encrypted username cols as-is
  } else {
    Object.assign(portalPatch, writePortalUsername(EXPECTED_USER));
    portalPatch.portalSecretsUpdatedAt = new Date();
  }

  await db.update(carriers).set(portalPatch as any).where(eq(carriers.id, ALLSTATE));

  const [risk] = await db.select().from(risks).where(eq(risks.dealId, DEAL)).limit(1);
  if (!risk) throw new Error("no risk for deal");

  // Trim auto quote sheet household to Heather only (clear slots 1+)
  const [sheet] = await db
    .select()
    .from(quoteSheets)
    .where(and(eq(quoteSheets.dealId, DEAL), eq(quoteSheets.line, "auto")));
  let sheetId: string | null = sheet?.id ?? null;
  if (sheet) {
    const values = { ...(sheet.values as Record<string, any>) };
    const suffixes = [
      "name",
      "dob",
      "gender",
      "occupation",
      "relationship",
      "status",
      "license",
      "ssn",
      "marital_status",
      "education",
    ];
    for (const i of [1, 2, 3, 4, 5]) {
      for (const s of suffixes) {
        const key = `household_${i}_${s}`;
        if (key in values) delete values[key];
      }
      // also wipe any other household_i_* keys
      for (const key of Object.keys(values)) {
        if (key.startsWith(`household_${i}_`)) delete values[key];
      }
    }
    // ensure gender/occupation stay blank (do not invent)
    for (const k of [
      "gender",
      "occupation",
      "insured_gender",
      "insured_occupation",
      "named_insured_gender",
      "named_insured_occupation",
      "driver_1_gender",
      "driver_1_occupation",
    ]) {
      if (values[k] && String(values[k]?.value ?? "").trim()) {
        // leave existing if present; task says blank / not inventing — only clear if we would invent
      }
      // if missing, leave missing (do not invent)
    }
    await db
      .update(quoteSheets)
      .set({ values, updatedAt: new Date() })
      .where(eq(quoteSheets.id, sheet.id));
  }

  const existing = await db
    .select()
    .from(quotes)
    .where(and(eq(quotes.dealId, DEAL), eq(quotes.carrierId, ALLSTATE)));

  const [log] = await db
    .insert(quoteAttemptLogs)
    .values({
      tenantId: carrier.tenantId,
      dealId: DEAL,
      carrierId: ALLSTATE,
      riskId: risk.id,
      line: "auto",
      result: "no_market",
      bindable: false,
      why: NOTE,
      attemptedAt: new Date(),
    } as any)
    .returning();

  let quoteId: string;
  let mode: string;
  if (existing[0]) {
    await db
      .update(quotes)
      .set({
        riskOutcome: "no_market",
        nextStep: "hard_no",
        bindable: false,
        notes: NOTE,
        quoteAttemptLogId: log.id,
        agentStatus: "new",
        stub: false,
      })
      .where(eq(quotes.id, existing[0].id));
    quoteId = existing[0].id;
    mode = "updated";
  } else {
    const [q] = await db
      .insert(quotes)
      .values({
        tenantId: carrier.tenantId,
        dealId: DEAL,
        riskId: risk.id,
        carrierId: ALLSTATE,
        quoteAttemptLogId: log.id,
        riskOutcome: "no_market",
        nextStep: "hard_no",
        bindable: false,
        notes: NOTE,
        stub: false,
        agentStatus: "new",
      } as any)
      .returning();
    quoteId = q.id;
    mode = "created";
  }

  const [c2] = await db.select().from(carriers).where(eq(carriers.id, ALLSTATE));
  let userAfter: string | null = null;
  if (c2?.portalUsernameEnc && c2?.portalUsernameIv) {
    userAfter = decryptSecret(c2.portalUsernameEnc, c2.portalUsernameIv);
  }

  const [sheet2] = sheetId
    ? await db.select().from(quoteSheets).where(eq(quoteSheets.id, sheetId))
    : [null];
  const v2 = (sheet2?.values ?? {}) as Record<string, any>;
  const hh = [1, 2, 3].map((i) => v2[`household_${i}_name`]?.value ?? null);

  console.log(
    JSON.stringify(
      {
        carrierId: ALLSTATE,
        portal: c2?.agentPortalUrl,
        portalUrl: c2?.portalUrl,
        usernameKept: keepUser,
        username: userAfter,
        hint: c2?.portalUsernameHint,
        quoteId,
        logId: log.id,
        riskId: risk.id,
        sheetId,
        mode,
        riskOutcome: "no_market",
        nextStep: "hard_no",
        bindable: false,
        notes: NOTE,
        householdNames: hh,
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
