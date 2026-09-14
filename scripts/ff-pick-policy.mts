import { db } from "../src/lib/db";
import { policies } from "../src/lib/db/schema";
import { desc } from "drizzle-orm";
async function main() {
  const [row] = await db.select({ id: policies.id, n: policies.policyNumber }).from(policies).orderBy(desc(policies.createdAt)).limit(1);
  console.log(JSON.stringify(row));
}
main().then(() => process.exit(0));
