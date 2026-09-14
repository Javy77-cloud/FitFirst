import { eq, ilike, or } from "drizzle-orm";
import { db } from "../src/lib/db";
import { carriers } from "../src/lib/db/schema";

async function main() {
  const rows = await db
    .select()
    .from(carriers)
    .where(
      or(
        ilike(carriers.name, "Beyond Floods"),
        ilike(carriers.name, "%Beyond%Flood%"),
        ilike(carriers.name, "%National%General%"),
        ilike(carriers.name, "%NatGen%"),
        ilike(carriers.name, "%Nations%General%"),
      ),
    );
  for (const c of rows) {
    console.log(JSON.stringify({ id: c.id, name: c.name, agency: (c as any).agencyCode, portal: (c as any).agentPortalUrl }));
  }
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
