import { eq, and, ilike, or } from "drizzle-orm";
import { db } from "../src/lib/db";
import { carriers, quotes, quoteAttemptLogs, risks, quoteSheets, deals } from "../src/lib/db/schema";

const FLOOD_DEAL = "fa61a32c-5351-4c43-8f91-2f92ef83b123";
const SHEET = "01677a46-2b15-4487-959d-2ed92cb4436c";
const CID = "120335";
const NOTE =
  "Flood Wright — Conditional/blocked. Portal wrightflood.net user FNC745668. Why: Flood zone X rejected as invalid; community number required. FEMA CIS: West Melbourne City CID 120335 (FIRM panel 12009C0584G). MFA used. Continuing NFIP + Neptune resume.";

async function writeSheet() {
  const [sheet] = await db.select().from(quoteSheets).where(eq(quoteSheets.id, SHEET)).limit(1);
  if (!sheet) throw new Error("no sheet");
  const values = { ...(sheet.values as Record<string, any>) };
  const now = new Date().toISOString();
  values.community_number = { value: CID, status: "confirmed", source: "fema-cis", updatedAt: now };
  await db.update(quoteSheets).set({ values, updatedAt: new Date() } as any).where(eq(quoteSheets.id, SHEET));
  console.log("SHEET", values.community_number);
}

async function logWright() {
  const [deal] = await db.select().from(deals).where(eq(deals.id, FLOOD_DEAL)).limit(1);
  if (!deal) throw new Error("no deal");
  const tenantId = (deal as any).tenantId;
  const rows = await db.select().from(carriers).where(or(ilike(carriers.name, "Wright"), ilike(carriers.name, "%Wright%Flood%")));
  let carrier = rows.find((c) => /^wright$/i.test(c.name.trim())) ?? rows.find((c) => /wright/i.test(c.name)) ?? null;
  if (!carrier) {
    const [created] = await db.insert(carriers).values({ tenantId, name: "Wright" } as any).returning();
    carrier = created;
  }
  const [risk] = await db.select().from(risks).where(eq(risks.dealId, FLOOD_DEAL)).limit(1);
  if (!risk) throw new Error("no risk");
  const existing = await db.select().from(quotes).where(and(eq(quotes.dealId, FLOOD_DEAL), eq(quotes.carrierId, carrier.id)));
  const [log] = await db.insert(quoteAttemptLogs).values({
    tenantId, dealId: FLOOD_DEAL, carrierId: carrier.id, riskId: risk.id,
    line: "flood", result: "maybe", bindable: false, why: NOTE, attemptedAt: new Date(),
  } as any).returning();
  const patch = {
    riskOutcome: "maybe", nextStep: "go_back", bindable: false, notes: NOTE,
    quoteAttemptLogId: log.id, agentStatus: "quoted", stub: false,
    carrierOpenUrl: "https://wrightflood.net",
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
  await logWright();
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
