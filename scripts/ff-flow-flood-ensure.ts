import { eq, ilike, or } from "drizzle-orm";
import { db } from "../src/lib/db";
import { carriers, deals } from "../src/lib/db/schema";

const FLOOD_DEAL = "fa61a32c-5351-4c43-8f91-2f92ef83b123";

async function main() {
  const [deal] = await db.select().from(deals).where(eq(deals.id, FLOOD_DEAL)).limit(1);
  const tenantId = (deal as any)?.tenantId;
  if (!tenantId) throw new Error("no tenant");
  const rows = await db
    .select()
    .from(carriers)
    .where(or(ilike(carriers.name, "Flow Flood"), ilike(carriers.name, "%Flow%Flood%")));
  let carrier = rows.find((c) => /flow\s*flood/i.test(c.name)) ?? rows[0];
  if (!carrier) {
    const [created] = await db
      .insert(carriers)
      .values({
        tenantId,
        name: "Flow Flood",
        portalStatus: "open",
        appetiteNotes: "First-wave Flood (replaced NFIP 2026-09-10). NordPass login.",
      } as any)
      .returning();
    carrier = created;
    console.log("CREATED", carrier.id);
  } else {
    await db
      .update(carriers)
      .set({
        appetiteNotes: [
          String((carrier as any).appetiteNotes || "").trim(),
          "First-wave Flood (replaced NFIP 2026-09-10). NordPass has username/password.",
        ]
          .filter(Boolean)
          .join("\n"),
        updatedAt: new Date(),
      } as any)
      .where(eq(carriers.id, carrier.id));
    console.log("UPDATED", carrier.id, carrier.name);
  }

  // Mark NFIP carrier note if present
  const nfipRows = await db.select().from(carriers).where(ilike(carriers.name, "NFIP"));
  for (const n of nfipRows) {
    if (/direct/i.test(n.name)) continue;
    await db
      .update(carriers)
      .set({
        appetiteNotes: [
          String((n as any).appetiteNotes || "").trim(),
          "Removed from Flood first-wave 2026-09-10 — replaced by Flow Flood.",
        ]
          .filter(Boolean)
          .join("\n"),
        updatedAt: new Date(),
      } as any)
      .where(eq(carriers.id, n.id));
    console.log("NFIP_NOTED", n.id, n.name);
  }
  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
