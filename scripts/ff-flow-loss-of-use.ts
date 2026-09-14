import { eq, and, ilike, or } from "drizzle-orm";
import { db } from "../src/lib/db";
import { carriers, quotes, quoteAttemptLogs, risks, quoteSheets, deals } from "../src/lib/db/schema";

const DEAL = "fa61a32c-5351-4c43-8f91-2f92ef83b123";
const SHEET = "01677a46-2b15-4487-959d-2ed92cb4436c";
const NOTE =
  "Flood Flow Flood — Couldn’t finish quote because Loss of Use / ALE was missing (NOT a UW decline). Quote# CFBKXE quoteRef 48fN7CKXqJE72NUJfwNQfQmBUNYTaqB994SggVTP. Coverages set Dwelling $310097 Contents $100000 ded $1000/$1000. Javy set loss_of_use=$31000 — resume. Portal agents.flowinsurance.com user gary.h@afains.com. NordPass.";

async function writeSheet() {
  const [sheet] = await db.select().from(quoteSheets).where(eq(quoteSheets.id, SHEET)).limit(1);
  if (!sheet) throw new Error("no sheet");
  const values = { ...(sheet.values as Record<string, any>) };
  const now = new Date().toISOString();
  values.loss_of_use = { value: "31000", status: "confirmed", source: "agent", updatedAt: now };
  await db.update(quoteSheets).set({ values, updatedAt: new Date() } as any).where(eq(quoteSheets.id, SHEET));
  console.log("SHEET", values.loss_of_use);
}

async function logFlow() {
  const [deal] = await db.select().from(deals).where(eq(deals.id, DEAL)).limit(1);
  if (!deal) throw new Error("no deal");
  const tenantId = (deal as any).tenantId;
  const rows = await db
    .select()
    .from(carriers)
    .where(or(ilike(carriers.name, "Flow Flood"), ilike(carriers.name, "%Flow%Flood%")));
  let carrier = rows.find((c) => /flow\s*flood/i.test(c.name)) ?? rows[0];
  if (!carrier) {
    const [created] = await db.insert(carriers).values({ tenantId, name: "Flow Flood" } as any).returning();
    carrier = created;
  }
  await db
    .update(carriers)
    .set({
      agencyCode: (carrier as any).agencyCode,
      agentPortalUrl: "https://agents.flowinsurance.com",
      portalUrl: "https://agents.flowinsurance.com",
      portalLogin: "gary.h@afains.com",
      updatedAt: new Date(),
    } as any)
    .where(eq(carriers.id, carrier.id));

  const [risk] = await db.select().from(risks).where(eq(risks.dealId, DEAL)).limit(1);
  if (!risk) throw new Error("no risk");
  const existing = await db
    .select()
    .from(quotes)
    .where(and(eq(quotes.dealId, DEAL), eq(quotes.carrierId, carrier.id)));
  const [log] = await db
    .insert(quoteAttemptLogs)
    .values({
      tenantId,
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
    carrierOpenUrl: "https://agents.flowinsurance.com",
  } as any;
  if (existing[0]) {
    await db.update(quotes).set(patch).where(eq(quotes.id, existing[0].id));
    console.log(JSON.stringify({ mode: "updated", quoteId: existing[0].id }));
  } else {
    const [q] = await db
      .insert(quotes)
      .values({
        tenantId,
        dealId: DEAL,
        riskId: risk.id,
        carrierId: carrier.id,
        ...patch,
      } as any)
      .returning();
    console.log(JSON.stringify({ mode: "created", quoteId: q.id }));
  }
}

async function main() {
  await writeSheet();
  await logFlow();
  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
