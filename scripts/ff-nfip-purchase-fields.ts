import { eq, and, ilike, or } from "drizzle-orm";
import { db } from "../src/lib/db";
import { carriers, quotes, quoteAttemptLogs, risks, quoteSheets, deals } from "../src/lib/db/schema";

const DEAL = "fa61a32c-5351-4c43-8f91-2f92ef83b123";
const SHEET = "01677a46-2b15-4487-959d-2ed92cb4436c";
const NOTE =
  "Flood NFIP (Wright WYO) — Conditional/not rated #09QT5832608799. Portal wrightflood.net/praesidium/Flood Agency 745668. Missing purchase/prior-owner NFIP radios — Javy: purchased_within_last_year=Yes; prior_owner_nfip_at_closing=No. Rehit Wright private with CID 120335 meanwhile.";

async function writeSheet() {
  const [sheet] = await db.select().from(quoteSheets).where(eq(quoteSheets.id, SHEET)).limit(1);
  if (!sheet) throw new Error("no sheet");
  const values = { ...(sheet.values as Record<string, any>) };
  const now = new Date().toISOString();
  values.purchased_within_last_year = { value: "yes", status: "confirmed", source: "agent", updatedAt: now };
  values.prior_owner_nfip_at_closing = { value: "no", status: "confirmed", source: "agent", updatedAt: now };
  await db.update(quoteSheets).set({ values, updatedAt: new Date() } as any).where(eq(quoteSheets.id, SHEET));
  console.log("SHEET", {
    purchased_within_last_year: values.purchased_within_last_year,
    prior_owner_nfip_at_closing: values.prior_owner_nfip_at_closing,
  });
}

async function logNfif() {
  const [deal] = await db.select().from(deals).where(eq(deals.id, DEAL)).limit(1);
  if (!deal) throw new Error("no deal");
  const tenantId = (deal as any).tenantId;
  const rows = await db
    .select()
    .from(carriers)
    .where(or(ilike(carriers.name, "NFIP"), ilike(carriers.name, "%NFIP%"), ilike(carriers.name, "Wright")));
  let carrier =
    rows.find((c) => /^nfip$/i.test(c.name.trim())) ??
    rows.find((c) => /nfip/i.test(c.name)) ??
    null;
  if (!carrier) {
    const [created] = await db.insert(carriers).values({ tenantId, name: "NFIP" } as any).returning();
    carrier = created;
    console.log("CREATED_NFIP", carrier.id);
  }
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
      quoteNumber: "09QT5832608799",
      why: NOTE,
      attemptedAt: new Date(),
    } as any)
    .returning();
  const patch = {
    riskOutcome: "maybe",
    nextStep: "go_back",
    bindable: false,
    quoteNumber: "09QT5832608799",
    notes: NOTE,
    quoteAttemptLogId: log.id,
    agentStatus: "quoted",
    stub: false,
    carrierOpenUrl: "https://wrightflood.net/praesidium/Flood",
  } as any;
  if (existing[0]) {
    await db.update(quotes).set(patch).where(eq(quotes.id, existing[0].id));
    console.log(JSON.stringify({ mode: "updated", quoteId: existing[0].id, carrier: carrier.name }));
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
    console.log(JSON.stringify({ mode: "created", quoteId: q.id, carrier: carrier.name }));
  }
}

async function main() {
  await writeSheet();
  await logNfif();
  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
