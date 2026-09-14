import { eq, and, ilike, or } from "drizzle-orm";
import { db } from "../src/lib/db";
import { carriers, quotes, quoteAttemptLogs, risks, quoteSheets } from "../src/lib/db/schema";

const DEAL = "fa61a32c-5351-4c43-8f91-2f92ef83b123";
const SHEET = "01677a46-2b15-4487-959d-2ed92cb4436c";
const NOTE =
  "Flood Flow Flood — Couldn’t finish quote because Construction Type / Occupancy / Dwelling Type were blank on portal (NOT a UW decline). Quote# CFBKXE quoteRef 48fN7CKXqJE72NUJfwNQfQmBUNYTaqB994SggVTP. ALE $31000 + Dwelling $310097 Contents $100000 ded $1000/$1000 saved. Resuming with sheet maps: construction_type=Frame-Stucco; occupancy=Primary/Owner Single-family; dwelling_type/building_type=Single-family. Portal agents.flowinsurance.com gary.h@afains.com.";

async function main() {
  const [sheet] = await db.select().from(quoteSheets).where(eq(quoteSheets.id, SHEET)).limit(1);
  if (!sheet) throw new Error("no sheet");
  const values = { ...(sheet.values as Record<string, any>) };
  const now = new Date().toISOString();
  // Ensure mappings exist on sheet without inventing beyond known facts
  if (!values.construction_type?.value) {
    values.construction_type = { value: "Frame-Stucco", status: "confirmed", source: "agent", updatedAt: now };
  }
  if (!values.building_type?.value) {
    values.building_type = { value: "Single-family", status: "confirmed", source: "agent", updatedAt: now };
  }
  if (!values.dwelling_type?.value) {
    values.dwelling_type = {
      value: "Single-family",
      status: "confirmed",
      source: "agent",
      updatedAt: now,
    };
  }
  if (!values.flood_occupancy?.value) {
    values.flood_occupancy = { value: "Single-family", status: "confirmed", source: "agent", updatedAt: now };
  }
  // Occupancy use for Flow: primary owner — live_over_50_pct already yes
  if (!values.occupancy_use?.value) {
    values.occupancy_use = {
      value: "Primary / Owner",
      status: "confirmed",
      source: "agent",
      updatedAt: now,
    };
  }
  await db.update(quoteSheets).set({ values, updatedAt: new Date() } as any).where(eq(quoteSheets.id, SHEET));

  const rows = await db
    .select()
    .from(carriers)
    .where(or(ilike(carriers.name, "Flow Flood"), ilike(carriers.name, "%Flow%Flood%")));
  const carrier = rows.find((c) => /flow\s*flood/i.test(c.name)) ?? rows[0];
  if (!carrier) throw new Error("Flow Flood missing");
  const [risk] = await db.select().from(risks).where(eq(risks.dealId, DEAL)).limit(1);
  if (!risk) throw new Error("no risk");
  const existing = await db
    .select()
    .from(quotes)
    .where(and(eq(quotes.dealId, DEAL), eq(quotes.carrierId, carrier.id)));
  const [log] = await db
    .insert(quoteAttemptLogs)
    .values({
      tenantId: carrier.tenantId,
      dealId: DEAL,
      carrierId: carrier.id,
      riskId: risk.id,
      line: "flood",
      result: "maybe",
      bindable: false,
      quoteNumber: "CFBKXE",
      why: NOTE,
      attemptedAt: new Date(),
    } as any)
    .returning();
  const patch = {
    riskOutcome: "maybe",
    nextStep: "go_back",
    bindable: false,
    quoteNumber: "CFBKXE",
    notes: NOTE,
    quoteAttemptLogId: log.id,
    agentStatus: "quoted",
    stub: false,
  } as any;
  if (existing[0]) {
    await db.update(quotes).set(patch).where(eq(quotes.id, existing[0].id));
    console.log(JSON.stringify({ mode: "updated", quoteId: existing[0].id }));
  } else {
    const [q] = await db
      .insert(quotes)
      .values({
        tenantId: carrier.tenantId,
        dealId: DEAL,
        riskId: risk.id,
        carrierId: carrier.id,
        ...patch,
      } as any)
      .returning();
    console.log(JSON.stringify({ mode: "created", quoteId: q.id }));
  }
  console.log("MAPS", {
    construction_type: values.construction_type?.value,
    building_type: values.building_type?.value,
    dwelling_type: values.dwelling_type?.value,
    flood_occupancy: values.flood_occupancy?.value,
    occupancy_use: values.occupancy_use?.value,
  });
  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
