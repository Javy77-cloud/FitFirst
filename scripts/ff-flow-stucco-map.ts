import { eq, and, ilike, or } from "drizzle-orm";
import { db } from "../src/lib/db";
import { carriers, quotes, quoteSheets } from "../src/lib/db/schema";

const DEAL = "fa61a32c-5351-4c43-8f91-2f92ef83b123";
const SHEET = "01677a46-2b15-4487-959d-2ed92cb4436c";
const NOTE =
  "Flood Flow Flood — Couldn’t finish quote because Construction Type has no Frame-Stucco match (NOT a UW decline). Quote# CFBKXE. Javy approved mapping Frame-Stucco → portal Stucco. ALE $31000; Dwelling $310097 Contents $100k ded $1k/$1k. Occupancy Primary/Owner Single-family; dwelling Single-family. Resuming with Stucco.";

async function main() {
  const [sheet] = await db.select().from(quoteSheets).where(eq(quoteSheets.id, SHEET)).limit(1);
  const values = { ...(sheet!.values as Record<string, any>) };
  const now = new Date().toISOString();
  values.flow_construction_portal = {
    value: "Stucco",
    status: "confirmed",
    source: "agent",
    updatedAt: now,
  };
  await db.update(quoteSheets).set({ values, updatedAt: new Date() } as any).where(eq(quoteSheets.id, SHEET));

  const rows = await db
    .select()
    .from(carriers)
    .where(or(ilike(carriers.name, "Flow Flood"), ilike(carriers.name, "%Flow%Flood%")));
  const carrier = rows.find((c) => /flow\s*flood/i.test(c.name)) ?? rows[0];
  const existing = await db
    .select()
    .from(quotes)
    .where(and(eq(quotes.dealId, DEAL), eq(quotes.carrierId, carrier.id)));
  if (existing[0]) {
    await db
      .update(quotes)
      .set({ notes: NOTE, quoteNumber: "CFBKXE", riskOutcome: "maybe", nextStep: "go_back", updatedAt: new Date() } as any)
      .where(eq(quotes.id, existing[0].id));
    console.log("UPDATED", existing[0].id);
  }
  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
