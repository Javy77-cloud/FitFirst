import { eq } from "drizzle-orm";
import { db } from "../src/lib/db";
import { carriers } from "../src/lib/db/schema";

const CARRIER_ID = "bbb8f6b3-a170-4841-8be2-656c5e89575a";
const AGENT_PORTAL = "https://foragents.travelers.com/Personal";
const SIGNIN = "https://signin.travelers.com/";

async function main() {
  const [before] = await db.select().from(carriers).where(eq(carriers.id, CARRIER_ID));
  if (!before) throw new Error(`Travelers carrier ${CARRIER_ID} not found`);

  await db
    .update(carriers)
    .set({
      agentPortalUrl: AGENT_PORTAL,
      // Keep sign-in on portalUrl when useful (login entry); agent desk uses agentPortalUrl.
      portalUrl: before.portalUrl?.includes("signin.travelers.com")
        ? before.portalUrl
        : before.portalUrl?.trim()
          ? before.portalUrl
          : SIGNIN,
      updatedAt: new Date(),
    })
    .where(eq(carriers.id, CARRIER_ID));

  const [updated] = await db.select().from(carriers).where(eq(carriers.id, CARRIER_ID));
  console.log(
    JSON.stringify(
      {
        id: updated.id,
        name: updated.name,
        portalUrl: updated.portalUrl,
        agentPortalUrl: updated.agentPortalUrl,
        hint: updated.portalUsernameHint,
        hasUser: Boolean(updated.portalUsernameEnc),
        hasPassword: Boolean(updated.portalPasswordEnc),
        before: {
          portalUrl: before.portalUrl,
          agentPortalUrl: before.agentPortalUrl,
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
