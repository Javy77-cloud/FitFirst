import { eq, and, ilike, or } from "drizzle-orm";
import { db } from "../src/lib/db";
import { carriers, quotes, quoteAttemptLogs, risks, deals } from "../src/lib/db/schema";
import { captureAutoGapsFromAttemptWhy } from "../src/lib/quote-bot/auto-question-gaps";

const DEAL = "12aa92aa-3b8d-4211-acf3-fda09d77a194";
const PORTAL = "https://agent.thegeneral.com";
const USER = "gary.h@afains.com";

const DAIRYLAND_NOTE =
  "Auto Dairyland — Quoted #371664290. Premium $4,349.58 12-month 11-pay; $1,739.30 PIF 6-month option. Coverages BI 10/20 PD 10k UM stacked/non-stacked rejected PIP $10k/$1k (portal floor vs requested $1k) Comp/Coll $1k lienholder deds $250. Bindable No — leftover: DL number + lienholder report details required; insurance score not found. MVR N (couldn’t order without DL#). Conditional with premium. Form PA. Portal agent.thegeneral.com user gary.h@afains.com. Retrieve-quote/371664290.";

const GENERAL_NOTE =
  "Couldn’t finish quote because External HQ redirected to logged-out sign-in / agency password expired and must be changed. NOT a UW decline. No quote#. Portal agent.thegeneral.com (same Dairyland+General site) user gary.h@afains.com. Reopen after agency password reset. Skip Travelers per Gaya.";

async function ensureCarrier(tenantId: string, name: string, matchers: string[], exact: RegExp) {
  const rows = await db
    .select()
    .from(carriers)
    .where(or(...matchers.map((m) => ilike(carriers.name, m))));
  let carrier = rows.find((c) => exact.test(c.name.trim())) ?? rows[0];
  if (!carrier) {
    const [created] = await db
      .insert(carriers)
      .values({
        tenantId,
        name,
        portalStatus: "open",
        appetiteNotes: "Auto — shared agent.thegeneral.com with The General / Dairyland family.",
      } as any)
      .returning();
    carrier = created;
    console.log("CREATED", name, carrier.id);
  }
  return carrier;
}

async function upsertQuote(opts: {
  carrier: typeof carriers.$inferSelect;
  note: string;
  result: string;
  bindable: boolean;
  quoteNumber: string | null;
  premium: string | null;
  riskOutcome: string;
  nextStep: string;
  portalLogin: string;
}) {
  const carrier = opts.carrier;
  try {
    await db
      .update(carriers)
      .set({
        agentPortalUrl: PORTAL,
        portalUrl: PORTAL,
        portalLogin: opts.portalLogin,
        portalUsernameHint: USER,
        portalSecretsUpdatedAt: new Date(),
        updatedAt: new Date(),
      } as any)
      .where(eq(carriers.id, carrier.id));
  } catch (e) {
    console.log("portal skip", String(e).slice(0, 120));
  }

  const [risk] = await db.select().from(risks).where(eq(risks.dealId, DEAL)).limit(1);
  if (!risk) throw new Error("no risk");
  const existing = await db
    .select()
    .from(quotes)
    .where(and(eq(quotes.dealId, DEAL), eq(quotes.carrierId, carrier.id)));

  try {
    captureAutoGapsFromAttemptWhy({
      why: opts.note,
      shopLine: "auto",
      carrierId: carrier.id,
      carrierName: carrier.name,
      dealId: DEAL,
      url: PORTAL,
      source: "scripts/ff-dairyland-and-general.ts",
    });
  } catch (error) {
    console.log("gap capture skip", String(error).slice(0, 160));
  }

  const [log] = await db
    .insert(quoteAttemptLogs)
    .values({
      tenantId: carrier.tenantId,
      dealId: DEAL,
      carrierId: carrier.id,
      riskId: risk.id,
      line: "auto",
      result: opts.result,
      bindable: opts.bindable,
      quoteNumber: opts.quoteNumber,
      premium: opts.premium,
      why: opts.note,
      attemptedAt: new Date(),
    } as any)
    .returning();

  const patch = {
    riskOutcome: opts.riskOutcome,
    nextStep: opts.nextStep,
    bindable: opts.bindable,
    quoteNumber: opts.quoteNumber,
    premium: opts.premium,
    notes: opts.note,
    quoteAttemptLogId: log.id,
    agentStatus: "quoted",
    stub: false,
    carrierOpenUrl: PORTAL,
  } as any;

  if (existing[0]) {
    await db.update(quotes).set(patch).where(eq(quotes.id, existing[0].id));
    console.log(JSON.stringify({ mode: "updated", carrier: carrier.name, quoteId: existing[0].id, logId: log.id }));
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
    console.log(JSON.stringify({ mode: "created", carrier: carrier.name, quoteId: q.id, logId: log.id }));
  }
}

async function main() {
  const [deal] = await db.select().from(deals).where(eq(deals.id, DEAL)).limit(1);
  if (!deal) throw new Error("no deal");
  const tenantId = (deal as any).tenantId;

  const dairyland = await ensureCarrier(tenantId, "Dairyland", ["Dairyland", "%Dairyland%"], /^dairyland$/i);
  await upsertQuote({
    carrier: dairyland,
    note: DAIRYLAND_NOTE,
    result: "quoted",
    bindable: false,
    quoteNumber: "371664290",
    premium: "4349.58",
    riskOutcome: "maybe",
    nextStep: "go_back",
    portalLogin: USER,
  });

  const general = await ensureCarrier(tenantId, "The General", ["The General", "%The General%"], /^the\s*general$/i);
  await upsertQuote({
    carrier: general,
    note: GENERAL_NOTE,
    result: "no_quote",
    bindable: false,
    quoteNumber: null,
    premium: null,
    riskOutcome: "no_option",
    nextStep: "go_back",
    portalLogin: `${USER} — agency password expired / External HQ`,
  });
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
