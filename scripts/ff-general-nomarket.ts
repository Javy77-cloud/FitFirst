import { eq, and } from "drizzle-orm";
import { db } from "../src/lib/db";
import { carriers, quotes, quoteAttemptLogs, risks } from "../src/lib/db/schema";
import { writePortalUsername } from "../src/lib/carriers/secrets";
import { decryptSecret } from "../src/lib/secrets/vault";

const DEAL = "12aa92aa-3b8d-4211-acf3-fda09d77a194";
const CARRIER_ID = "3381e7d5-1f01-4523-8b8d-957aa1cab371";
const PORTAL = "https://www.pgac.com/mars/";
const USER = "090674";
const NOTE =
  "Auto The General — No market: expired password after NordPass login — needs NordPass update. Portal https://www.pgac.com/mars/ user 090674.";

async function main() {
  const [carrier] = await db.select().from(carriers).where(eq(carriers.id, CARRIER_ID));
  if (!carrier) throw new Error("The General carrier not found");

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
  if (!risk) throw new Error("no risk for deal");

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
      result: "no_market",
      bindable: false,
      why: NOTE,
      attemptedAt: new Date(),
    } as any)
    .returning();

  let quoteId: string;
  let mode: string;
  if (existing[0]) {
    await db
      .update(quotes)
      .set({
        riskOutcome: "no_market",
        nextStep: "hard_no",
        bindable: false,
        notes: NOTE,
        quoteAttemptLogId: log.id,
        agentStatus: "new",
        stub: false,
      })
      .where(eq(quotes.id, existing[0].id));
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
        quoteAttemptLogId: log.id,
        riskOutcome: "no_market",
        nextStep: "hard_no",
        bindable: false,
        notes: NOTE,
        stub: false,
        agentStatus: "new",
      } as any)
      .returning();
    quoteId = q.id;
    mode = "created";
  }

  const [c2] = await db.select().from(carriers).where(eq(carriers.id, carrier.id));
  let userAfter: string | null = null;
  if (c2?.portalUsernameEnc && c2?.portalUsernameIv) {
    userAfter = decryptSecret(c2.portalUsernameEnc, c2.portalUsernameIv);
  }

  console.log(
    JSON.stringify(
      {
        carrierId: carrier.id,
        name: carrier.name,
        portal: c2?.agentPortalUrl,
        username: userAfter,
        quoteId,
        mode,
        logId: log.id,
      },
      null,
      2,
    ),
  );
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
