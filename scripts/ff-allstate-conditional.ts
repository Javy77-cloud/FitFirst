import { eq, and, ilike, or } from "drizzle-orm";
import { db } from "../src/lib/db";
import { carriers, quotes, quoteAttemptLogs, risks } from "../src/lib/db/schema";
import { writePortalUsername } from "../src/lib/carriers/secrets";

const DEAL = "12aa92aa-3b8d-4211-acf3-fda09d77a194";
const PORTAL = "https://iaadvisorpro.allstate.com";
const USER = "SFL2M50G";
const QUOTE_NO = "033262532565070";
const PREMIUM = "3710.18";
const NOTE =
  "Auto Allstate — Conditional: quote #033262532565070 premium $3710.18/6mo (Silver defaults; packet coverages not applied). Portal Why: Convert to New Business required. MVR Y; incidents returned — rates may have changed. Collision/Comp without Lease/Loan Gap. No conversion done. Form PA. User SFL2M50G.";

async function main() {
  const rows = await db
    .select()
    .from(carriers)
    .where(or(ilike(carriers.name, "Allstate"), ilike(carriers.name, "%Allstate%")));
  const carrier =
    rows.find((c) => /^allstate$/i.test(c.name.trim())) ??
    rows.find((c) => /^allstate\b/i.test(c.name.trim())) ??
    rows[0];
  if (!carrier) throw new Error("Allstate not found");

  const user = writePortalUsername(USER);
  await db
    .update(carriers)
    .set({
      agentPortalUrl: PORTAL,
      portalUrl: PORTAL,
      ...user,
      portalPasswordEnc: null,
      portalPasswordIv: null,
      portalSecretsUpdatedAt: new Date(),
      updatedAt: new Date(),
    })
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
      tenantId: carrier.tenantId,
      dealId: DEAL,
      carrierId: carrier.id,
      riskId: risk.id,
      line: "auto",
      result: "quoted",
      bindable: false,
      premium: PREMIUM,
      quoteNumber: QUOTE_NO,
      why: NOTE,
      attemptedAt: new Date(),
    } as any)
    .returning();

  const patch = {
    riskOutcome: "maybe",
    nextStep: "go_back",
    bindable: false,
    premium: PREMIUM,
    quoteNumber: QUOTE_NO,
    notes: NOTE,
    quoteAttemptLogId: log.id,
    agentStatus: "quoted",
    stub: false,
    carrierOpenUrl: PORTAL,
  } as any;

  let quoteId: string;
  let mode: string;
  if (existing[0]) {
    await db.update(quotes).set(patch).where(eq(quotes.id, existing[0].id));
    quoteId = existing[0].id;
    mode = "updated";
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
    quoteId = q.id;
    mode = "created";
  }
  console.log(JSON.stringify({ carrier: carrier.name, quoteId, mode, logId: log.id, premium: PREMIUM }, null, 2));
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
