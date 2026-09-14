import { eq, and, ilike, or } from "drizzle-orm";
import { db } from "../src/lib/db";
import { carriers, quotes, quoteAttemptLogs, risks, quoteSheets, deals } from "../src/lib/db/schema";

const FLOOD_DEAL = "fa61a32c-5351-4c43-8f91-2f92ef83b123";
const SHEET = "01677a46-2b15-4487-959d-2ed92cb4436c";
const NOTE =
  "Flood Selective — Conditional/not rated #0006347639. Portal agent.selectiveflood.com user A11228GH. Missing effective date (+ property radios). Javy set effective_date=09/11/2026 New business. Continuing Wright; Neptune resume after. Skip Cypress.";

async function writeSheet() {
  const [sheet] = await db.select().from(quoteSheets).where(eq(quoteSheets.id, SHEET)).limit(1);
  if (!sheet) throw new Error("no sheet");
  const values = { ...(sheet.values as Record<string, any>) };
  const now = new Date().toISOString();
  values.effective_date = { value: "09/11/2026", status: "confirmed", source: "agent", updatedAt: now };
  values.effective_date_type = { value: "New business", status: "confirmed", source: "agent", updatedAt: now };
  // Map known sheet facts to Selective radios without inventing
  if (!values.building_type?.value) {
    values.building_type = { value: "Single-family", status: "confirmed", source: "agent", updatedAt: now }; // from flood_occupancy
  }
  if (!values.building_description?.value) {
    values.building_description = {
      value: "Single-family Frame-Stucco on slab, 1 story, ~1228 sqft, built 1979",
      status: "check",
      source: "agent",
      updatedAt: now,
    };
  }
  // live_over_50_pct: primary owner occupancy implied by flood_occupancy Single-family + mailing=risk — still ask? Javy said primary earlier via Gaya packet "owner primary". Use yes as confirmed from shop packet.
  if (!values.live_over_50_pct?.value) {
    values.live_over_50_pct = { value: "yes", status: "confirmed", source: "agent", updatedAt: now };
  }
  // has_garage: unknown — leave blank (do not invent)
  await db.update(quoteSheets).set({ values, updatedAt: new Date() } as any).where(eq(quoteSheets.id, SHEET));
  console.log("SHEET", {
    effective_date: values.effective_date,
    effective_date_type: values.effective_date_type,
    building_type: values.building_type,
    live_over_50_pct: values.live_over_50_pct,
    has_garage: values.has_garage ?? null,
  });
}

async function logSelective() {
  const [deal] = await db.select().from(deals).where(eq(deals.id, FLOOD_DEAL)).limit(1);
  if (!deal) throw new Error("no deal");
  const tenantId = (deal as any).tenantId;
  const rows = await db.select().from(carriers).where(or(ilike(carriers.name, "Selective"), ilike(carriers.name, "%Selective%")));
  let carrier = rows.find((c) => /selective/i.test(c.name)) ?? null;
  if (!carrier) {
    const [created] = await db.insert(carriers).values({ tenantId, name: "Selective" } as any).returning();
    carrier = created;
  }
  const [risk] = await db.select().from(risks).where(eq(risks.dealId, FLOOD_DEAL)).limit(1);
  if (!risk) throw new Error("no risk");
  const existing = await db.select().from(quotes).where(and(eq(quotes.dealId, FLOOD_DEAL), eq(quotes.carrierId, carrier.id)));
  const [log] = await db.insert(quoteAttemptLogs).values({
    tenantId, dealId: FLOOD_DEAL, carrierId: carrier.id, riskId: risk.id,
    line: "flood", result: "maybe", bindable: false, quoteNumber: "0006347639",
    why: NOTE, attemptedAt: new Date(),
  } as any).returning();
  const patch = {
    riskOutcome: "maybe", nextStep: "go_back", bindable: false, quoteNumber: "0006347639",
    notes: NOTE, quoteAttemptLogId: log.id, agentStatus: "quoted", stub: false,
    carrierOpenUrl: "https://agent.selectiveflood.com",
  } as any;
  if (existing[0]) {
    await db.update(quotes).set(patch).where(eq(quotes.id, existing[0].id));
    console.log(JSON.stringify({ mode: "updated", quoteId: existing[0].id, carrier: carrier.name }));
  } else {
    const [q] = await db.insert(quotes).values({
      tenantId, dealId: FLOOD_DEAL, riskId: risk.id, carrierId: carrier.id, ...patch,
    } as any).returning();
    console.log(JSON.stringify({ mode: "created", quoteId: q.id, carrier: carrier.name }));
  }
}

async function main() {
  await writeSheet();
  await logSelective();
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
