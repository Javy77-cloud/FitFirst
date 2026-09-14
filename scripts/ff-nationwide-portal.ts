import { eq, ilike, or } from "drizzle-orm";
import { db } from "../src/lib/db";
import { carriers } from "../src/lib/db/schema";
import { writePortalUsername } from "../src/lib/carriers/secrets";
import { decryptSecret } from "../src/lib/secrets/vault";

const PORTAL = "https://agentcenter.nationwide.com/home";
const USER = "AJG4GC";

async function main() {
  const rows = await db
    .select()
    .from(carriers)
    .where(or(ilike(carriers.name, "Nationwide"), ilike(carriers.name, "%Nationwide%")));
  if (!rows.length) throw new Error("Nationwide not found");
  const carrier =
    rows.find((c) => /^nationwide$/i.test(c.name.trim())) ??
    rows.find((c) => /^nationwide\b/i.test(c.name.trim())) ??
    rows[0];

  const user = writePortalUsername(USER);
  await db
    .update(carriers)
    .set({
      agentPortalUrl: PORTAL,
      portalUrl: PORTAL,
      ...user,
      portalPasswordEnc: null,
      portalPasswordIv: null,
      portalSecretsUpdatedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(carriers.id, carrier.id));

  const [c2] = await db.select().from(carriers).where(eq(carriers.id, carrier.id));
  let userAfter: string | null = null;
  if (c2?.portalUsernameEnc && c2?.portalUsernameIv) {
    userAfter = decryptSecret(c2.portalUsernameEnc, c2.portalUsernameIv);
  }
  console.log(
    JSON.stringify(
      {
        carrierId: carrier.id,
        name: carrier.name,
        candidates: rows.map((r) => r.name),
        portal: c2?.agentPortalUrl,
        username: userAfter,
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
