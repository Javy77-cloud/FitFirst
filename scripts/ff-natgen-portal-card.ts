import { eq } from "drizzle-orm";
import { db } from "../src/lib/db";
import { carriers } from "../src/lib/db/schema";

const ID = "49c35c9c-fe01-4443-8bf9-3342e327031f";

async function main() {
  await db
    .update(carriers)
    .set({
      agentPortalUrl: "https://natgen.beyondfloods.com",
      portalUrl: "https://natgen.beyondfloods.com",
      portalLogin: "scott.l@afains.com / Agency 9026706 — agent portal only, not public QQ",
      portalUsernameHint: "scott.l@afains.com",
      agencyCode: "9026706",
      portalSecretsUpdatedAt: new Date(),
      updatedAt: new Date(),
    } as any)
    .where(eq(carriers.id, ID));
  const [c] = await db.select().from(carriers).where(eq(carriers.id, ID)).limit(1);
  console.log(
    JSON.stringify({
      name: c.name,
      agencyCode: (c as any).agencyCode,
      portal: (c as any).agentPortalUrl,
      login: (c as any).portalLogin,
    }),
  );
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
