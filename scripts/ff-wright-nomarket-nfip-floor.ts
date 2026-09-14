import { eq, and, ilike, or } from "drizzle-orm";
import { db } from "../src/lib/db";
import { carriers, quotes, quoteAttemptLogs, risks } from "../src/lib/db/schema";

const DEAL = "fa61a32c-5351-4c43-8f91-2f92ef83b123";
const WRIGHT_NOTE =
  "Flood Wright private — no_market/go_back. Portal wrightflood.net NFIP-only path; private not obtained. MFA/user FNC745668. CID 120335 on sheet. Starting Flow Flood. Neptune still best bindable $748.57 #FL6253AM93ORON.";
const NFIP_NOTE =
  "Flood NFIP (Wright WYO incidental) — #09QT5832608799 floor $489 (Bldg ded $1250 / Cont ded $1000). Not first-wave (replaced by Flow Flood). Captured for quote# + learning DB only. Not bound.";

async function upsert(
  carrierName: string,
  match: (n: string) => boolean,
  patchBase: {
    riskOutcome: string;
    nextStep: string;
    bindable: boolean;
    quoteNumber?: string;
    premium?: string;
    notes: string;
    result: string;
    carrierOpenUrl?: string;
  },
) {
  const rows = await db
    .select()
    .from(carriers)
    .where(or(ilike(carriers.name, carrierName), ilike(carriers.name, `%${carrierName}%`)));
  let carrier = rows.find((c) => match(c.name)) ?? rows[0];
  if (!carrier) throw new Error(`${carrierName} not found`);
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
      result: patchBase.result,
      bindable: patchBase.bindable,
      quoteNumber: patchBase.quoteNumber,
      premium: patchBase.premium,
      why: patchBase.notes,
      attemptedAt: new Date(),
    } as any)
    .returning();
  const patch = {
    riskOutcome: patchBase.riskOutcome,
    nextStep: patchBase.nextStep,
    bindable: patchBase.bindable,
    quoteNumber: patchBase.quoteNumber,
    premium: patchBase.premium,
    notes: patchBase.notes,
    quoteAttemptLogId: log.id,
    agentStatus: "quoted",
    stub: false,
    carrierOpenUrl: patchBase.carrierOpenUrl,
  } as any;
  if (existing[0]) {
    await db.update(quotes).set(patch).where(eq(quotes.id, existing[0].id));
    console.log(JSON.stringify({ mode: "updated", carrier: carrier.name, quoteId: existing[0].id }));
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
    console.log(JSON.stringify({ mode: "created", carrier: carrier.name, quoteId: q.id }));
  }
}

async function main() {
  await upsert("Wright", (n) => /^wright$/i.test(n.trim()) || /wright/i.test(n), {
    riskOutcome: "not_accepted",
    nextStep: "go_back",
    bindable: false,
    notes: WRIGHT_NOTE,
    result: "no_market",
    carrierOpenUrl: "https://wrightflood.net",
  });
  await upsert("NFIP", (n) => /^nfip$/i.test(n.trim()), {
    riskOutcome: "maybe",
    nextStep: "go_back",
    bindable: false,
    quoteNumber: "09QT5832608799",
    premium: "489",
    notes: NFIP_NOTE,
    result: "maybe",
    carrierOpenUrl: "https://wrightflood.net/praesidium/Flood",
  });
  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
