import { eq } from "drizzle-orm";
import { db } from "../src/lib/db";
import { carriers } from "../src/lib/db/schema";

const ID = "ce3cd53d-4981-42d0-8eb3-c2555ea68e75";
const PORTAL = "https://agents.flowinsurance.com";

async function main() {
  await db
    .update(carriers)
    .set({
      agentPortalUrl: PORTAL,
      portalUrl: PORTAL,
      portalLogin: "gary.h@afains.com",
      portalUsernameHint: "gary.h@afains.com",
      portalSecretsUpdatedAt: new Date(),
      updatedAt: new Date(),
    } as any)
    .where(eq(carriers.id, ID));
  const [c] = await db.select().from(carriers).where(eq(carriers.id, ID)).limit(1);
  console.log(
    JSON.stringify({
      name: c.name,
      portalUrl: (c as any).portalUrl,
      agentPortalUrl: (c as any).agentPortalUrl,
      portalLogin: (c as any).portalLogin,
      hint: (c as any).portalUsernameHint,
    }),
  );
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
