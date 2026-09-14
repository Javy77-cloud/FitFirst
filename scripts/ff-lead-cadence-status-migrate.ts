import { sql } from "drizzle-orm";
import { db } from "../src/lib/db";
import { leads } from "../src/lib/db/schema";
import { DEFAULT_TENANT_ID } from "../src/lib/domain";
import { splitLegacyLeadStatus } from "../src/lib/leads/queue";
import { ensureModuleFieldCatalog, saveLayoutForModule } from "../src/lib/custom-fields/store";
import { defaultLayoutForModule } from "../src/lib/custom-fields/modules";
import { eq } from "drizzle-orm";

async function main() {
  await db.execute(sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS cadence text NOT NULL DEFAULT 'none'`);
  console.log("cadence column ready");

  const rows = await db.select().from(leads).where(eq(leads.tenantId, DEFAULT_TENANT_ID));
  let updated = 0;
  for (const row of rows) {
    const hasCadence = (row as any).cadence != null && String((row as any).cadence).length > 0;
    const legacy = splitLegacyLeadStatus(row.status);
    // If status still looks like a cadence value, split it
    const raw = (row.status ?? "").toLowerCase();
    const needsSplit = ["new", "contacted", "warm", "cold", "qualified"].includes(raw) || !hasCadence;
    const nextStatus = needsSplit && ["new", "contacted", "warm", "cold"].includes(raw)
      ? "in_progress"
      : legacy.status === "converted" || row.convertedDealId
        ? "converted"
        : ["nurture", "lost", "in_progress", "converted"].includes(raw)
          ? (raw === "qualified" ? "in_progress" : raw)
          : legacy.status;
    const nextCadence =
      ["new", "contacted", "warm", "cold"].includes(raw)
        ? raw
        : hasCadence && (row as any).cadence !== "none"
          ? (row as any).cadence
          : legacy.cadence;

    await db
      .update(leads)
      .set({
        status: nextStatus,
        cadence: nextCadence,
        updatedAt: new Date(),
      } as any)
      .where(eq(leads.id, row.id));
    updated += 1;
  }
  console.log("updated leads", updated);

  await ensureModuleFieldCatalog("leads");
  await saveLayoutForModule("leads", defaultLayoutForModule("leads"));
  console.log("lead layout reset with cadence+status");
  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
