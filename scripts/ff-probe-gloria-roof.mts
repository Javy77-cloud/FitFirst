import { db } from "../src/lib/db";
import { risks } from "../src/lib/db/schema";
import { eq } from "drizzle-orm";
const DEAL = "8f4e7b68-2de3-458e-914b-ba60ea3c47aa";
async function main() {
  const [risk] = await db.select().from(risks).where(eq(risks.dealId, DEAL)).limit(1);
  const keys = Object.keys(risk || {}).filter((k) => /roof|shape|hvac|electric|plumb|resident/i.test(k));
  const pick: Record<string, unknown> = {};
  for (const k of keys) pick[k] = (risk as any)[k];
  console.log(JSON.stringify({ id: risk?.id, yearBuilt: risk?.yearBuilt, construction: risk?.construction, sqft: (risk as any).squareFeet ?? (risk as any).livingArea, protectionClass: risk?.protectionClass, occupancy: risk?.occupancy, floodZone: (risk as any).floodZone, coverageA: (risk as any).coverageA, pick }, null, 2));
}
main().catch((e)=>{console.error(e);process.exit(1)});
