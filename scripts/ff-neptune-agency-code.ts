import { eq, ilike, or } from "drizzle-orm";
import { db } from "../src/lib/db";
import { carriers } from "../src/lib/db/schema";

async function main() {
  const rows = await db
    .select()
    .from(carriers)
    .where(or(ilike(carriers.name, "Neptune"), ilike(carriers.name, "%Neptune%")));
  const carrier = rows.find((c) => /^neptune$/i.test(c.name.trim())) ?? rows[0];
  if (!carrier) throw new Error("Neptune carrier not found");
  const [updated] = await db
    .update(carriers)
    .set({
      agencyCode: "064296",
      agentPortalUrl: carrier.agentPortalUrl || "https://neptuneflood.com/agent-hub",
      portalUrl: carrier.portalUrl || "https://neptuneflood.com/agent-hub",
      portalLogin: carrier.portalLogin || "javier.g@afains.com",
      updatedAt: new Date(),
    } as any)
    .where(eq(carriers.id, carrier.id))
    .returning();
  console.log(
    JSON.stringify({
      id: updated.id,
      name: updated.name,
      agencyCode: (updated as any).agencyCode,
      agentPortalUrl: (updated as any).agentPortalUrl,
      portalLogin: (updated as any).portalLogin,
    }),
  );
  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
