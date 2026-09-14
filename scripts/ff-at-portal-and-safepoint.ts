import { eq } from "drizzle-orm";
import { db } from "../src/lib/db";
import { carriers, quotes, quoteAttemptLogs } from "../src/lib/db/schema";
import { writePortalUsername } from "../src/lib/carriers/secrets";

const AT = "e66c7eef-e6a2-44e5-8255-9fe15b11803d";
const SAFEPOINT_QUOTE = "2409f621-542a-4b89-a5e9-cf5bdb7c6359";
const PORTAL = "https://portal.jergermga.com/Home_Login.asp";
const USER = "AF2668";

async function main() {
  const user = writePortalUsername(USER);
  await db
    .update(carriers)
    .set({
      agentPortalUrl: PORTAL,
      portalUrl: PORTAL,
      portalLogin: "AT agent",
      ...user,
      portalPasswordEnc: null,
      portalPasswordIv: null,
      portalSecretsUpdatedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(carriers.id, AT));

  const safeNote =
    "HO3 Safepoint — No market (retried). Account not in SafePoint tenant; producer password still not in tenant. Fix Safepoint access/NordPass then recheck.";

  await db
    .update(quotes)
    .set({
      riskOutcome: "no_market",
      nextStep: "hard_no",
      bindable: false,
      notes: safeNote,
      agentStatus: "new",
    })
    .where(eq(quotes.id, SAFEPOINT_QUOTE));

  const [q] = await db.select().from(quotes).where(eq(quotes.id, SAFEPOINT_QUOTE));
  if (q?.quoteAttemptLogId) {
    await db
      .update(quoteAttemptLogs)
      .set({
        result: "no_market",
        bindable: false,
        why: safeNote,
        attemptedAt: new Date(),
      })
      .where(eq(quoteAttemptLogs.id, q.quoteAttemptLogId));
  }

  const [c] = await db.select().from(carriers).where(eq(carriers.id, AT));
  console.log(
    JSON.stringify(
      {
        atPortal: c?.agentPortalUrl,
        hint: c?.portalUsernameHint,
        hasUser: Boolean(c?.portalUsernameEnc),
        hasPw: Boolean(c?.portalPasswordEnc),
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
