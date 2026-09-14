
import { eq, ilike, or } from "drizzle-orm";
import { db } from "../src/lib/db";
import { carriers } from "../src/lib/db/schema";
import { writePortalUsername } from "../src/lib/carriers/secrets";

const PORTAL = "https://personal-agent.libertymutual.com/start?loginmode=agent";
const USER = "jgarcia20";
const NOTE = "2FA required before quote; Gaya waits for Javy auth. Agency code not visible pre-login.";

async function main() {
  const rows = await db
    .select()
    .from(carriers)
    .where(or(ilike(carriers.name, "%Liberty Mutual%"), ilike(carriers.name, "%Liberty%")));
  if (!rows.length) throw new Error("Liberty Mutual carrier not found");
  const user = writePortalUsername(USER);
  for (const c of rows) {
    const notes = [c.notes, NOTE].filter(Boolean).join("\n");
    await db
      .update(carriers)
      .set({
        agentPortalUrl: PORTAL,
        portalUrl: PORTAL,
        portalLogin: "LM agent",
        ...user,
        // keep existing password enc if any; do not clear
        portalSecretsUpdatedAt: new Date(),
        updatedAt: new Date(),
        ...( "notes" in c ? { notes } : {}),
      } as any)
      .where(eq(carriers.id, c.id));
    console.log(JSON.stringify({ id: c.id, name: c.name, portal: PORTAL, userHint: user.portalUsernameHint }));
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
