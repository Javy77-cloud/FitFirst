import { eq } from "drizzle-orm";
import { db } from "../src/lib/db";
import { carriers, quotes, quoteAttemptLogs } from "../src/lib/db/schema";
import { writePortalUsername } from "../src/lib/carriers/secrets";

const AI = "33333333-3333-4333-8333-333333333309";
const AI_QUOTE = "bde3fa48-895f-4938-a22b-ac752103efb2";
const PORTAL =
  "https://platform.go.aiiconnect.com/login.jsp?rq=COUserStartPage";
const USER = "AG11068A1";

const carrierNote =
  "Guidewire; login returns blank after NordPass autofill — needs Javy credential fix.";

const quoteNote =
  "HO3 American Integrity — No market. Guidewire login returns blank after NordPass autofill (no credentials typed). Needs Javy credential fix before retry.";

async function main() {
  const user = writePortalUsername(USER);
  await db
    .update(carriers)
    .set({
      agentPortalUrl: PORTAL,
      portalUrl: PORTAL,
      portalLogin: "AIC agent",
      ...user,
      portalPasswordEnc: null,
      portalPasswordIv: null,
      portalSecretsUpdatedAt: new Date(),
      carrierInfo: carrierNote,
      updatedAt: new Date(),
    })
    .where(eq(carriers.id, AI));

  const [existing] = await db.select().from(quotes).where(eq(quotes.id, AI_QUOTE));
  const mode = existing ? "updated" : "created";

  await db
    .update(quotes)
    .set({
      riskOutcome: "no_market",
      nextStep: "hard_no",
      bindable: false,
      notes: quoteNote,
      agentStatus: "new",
    })
    .where(eq(quotes.id, AI_QUOTE));

  const [q] = await db.select().from(quotes).where(eq(quotes.id, AI_QUOTE));
  let logId = q?.quoteAttemptLogId ?? null;
  if (logId) {
    await db
      .update(quoteAttemptLogs)
      .set({
        result: "no_market",
        bindable: false,
        why: quoteNote,
        attemptedAt: new Date(),
      })
      .where(eq(quoteAttemptLogs.id, logId));
  }

  const [c] = await db.select().from(carriers).where(eq(carriers.id, AI));
  console.log(
    JSON.stringify(
      {
        carrierId: c?.id ?? AI,
        portal: c?.agentPortalUrl ?? null,
        hasUser: Boolean(c?.portalUsernameEnc),
        quoteId: q?.id ?? AI_QUOTE,
        logId,
        [mode]: true,
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
