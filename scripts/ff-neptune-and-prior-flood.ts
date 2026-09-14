import { eq, and, ilike, or, sql } from "drizzle-orm";
import { db } from "../src/lib/db";
import { carriers, quotes, quoteAttemptLogs, risks, quoteSheets, deals } from "../src/lib/db/schema";

const FLOOD_DEAL = "fa61a32c-5351-4c43-8f91-2f92ef83b123";
const SHEET = "01677a46-2b15-4487-959d-2ed92cb4436c";
const NOTE =
  "Flood Neptune — Conditional #FL6253AM93ORON. Preliminary $552.32 at portal defaults $250k building / $100k contents / $5k ded (requested $310097 / $100000 / $1k not applied). Bindable No. Prior flood losses = No (Javy). Portal neptuneflood.com/agent-hub user javier.g@afains.com. Floor/defaults accepted for learning DB.";

async function writePrior() {
  const [sheet] = await db.select().from(quoteSheets).where(eq(quoteSheets.id, SHEET)).limit(1);
  if (!sheet) throw new Error("no sheet");
  const values = { ...(sheet.values as Record<string, any>) };
  values.prior_flood_losses = {
    value: "no",
    status: "confirmed",
    source: "agent",
    updatedAt: new Date().toISOString(),
  };
  await db
    .update(quoteSheets)
    .set({ values, updatedAt: new Date() } as any)
    .where(eq(quoteSheets.id, SHEET));
  console.log("SHEET_PRIOR", values.prior_flood_losses);
}

async function logNeptune() {
  const [deal] = await db.select().from(deals).where(eq(deals.id, FLOOD_DEAL)).limit(1);
  if (!deal) throw new Error("no deal");
  const tenantId = (deal as any).tenantId;
  const rows = await db
    .select()
    .from(carriers)
    .where(or(ilike(carriers.name, "Neptune"), ilike(carriers.name, "%Neptune%")));
  let carrier = rows.find((c) => /^neptune$/i.test(c.name.trim())) ?? rows[0];
  if (!carrier) {
    const [created] = await db.insert(carriers).values({ tenantId, name: "Neptune" } as any).returning();
    carrier = created;
  }
  const [risk] = await db.select().from(risks).where(eq(risks.dealId, FLOOD_DEAL)).limit(1);
  if (!risk) throw new Error("no risk");
  const existing = await db
    .select()
    .from(quotes)
    .where(and(eq(quotes.dealId, FLOOD_DEAL), eq(quotes.carrierId, carrier.id)));
  const [log] = await db
    .insert(quoteAttemptLogs)
    .values({
      tenantId,
      dealId: FLOOD_DEAL,
      carrierId: carrier.id,
      riskId: risk.id,
      line: "flood",
      result: "maybe",
      bindable: false,
      quoteNumber: "FL6253AM93ORON",
      premium: "552.32",
      why: NOTE,
      attemptedAt: new Date(),
    } as any)
    .returning();
  const patch = {
    riskOutcome: "maybe",
    nextStep: "go_back",
    bindable: false,
    quoteNumber: "FL6253AM93ORON",
    premium: "552.32",
    notes: NOTE,
    quoteAttemptLogId: log.id,
    agentStatus: "quoted",
    stub: false,
    carrierOpenUrl: "https://neptuneflood.com/agent-hub",
  } as any;
  if (existing[0]) {
    await db.update(quotes).set(patch).where(eq(quotes.id, existing[0].id));
    console.log(JSON.stringify({ mode: "updated", quoteId: existing[0].id, logId: log.id, carrier: carrier.name }));
  } else {
    const [q] = await db
      .insert(quotes)
      .values({
        tenantId,
        dealId: FLOOD_DEAL,
        riskId: risk.id,
        carrierId: carrier.id,
        ...patch,
      } as any)
      .returning();
    console.log(JSON.stringify({ mode: "created", quoteId: q.id, logId: log.id, carrier: carrier.name }));
  }
}

async function main() {
  await writePrior();
  await logNeptune();
  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
