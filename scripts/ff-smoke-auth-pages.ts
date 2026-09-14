import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { DEFAULT_TENANT_ID } from "@/lib/domain";

async function main() {
  const rows = await db
    .select({ id: users.id, email: users.email, name: users.name, role: users.role })
    .from(users)
    .where(eq(users.tenantId, DEFAULT_TENANT_ID));
  console.log(JSON.stringify(rows.filter((r) => /javy|admin/i.test(r.email) || /javy/i.test(r.name)), null, 2));
  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
