import { eq, and, ilike, or } from "drizzle-orm";
import { db } from "../src/lib/db";
import { carriers, quotes } from "../src/lib/db/schema";

const DEAL = "12aa92aa-3b8d-4211-acf3-fda09d77a194";

async function main() {
  const bw = await db
    .select()
    .from(carriers)
    .where(or(ilike(carriers.name, "%Bristol%"), ilike(carriers.name, "%Bristol West%")));
  const lm = await db
    .select()
    .from(carriers)
    .where(ilike(carriers.name, "%Liberty Mutual%"));
  const bwc = bw[0];
  const lmc = lm[0];
  const [bwq] = await db
    .select()
    .from(quotes)
    .where(and(eq(quotes.dealId, DEAL), eq(quotes.carrierId, bwc.id)));
  const [lmq] = await db
    .select()
    .from(quotes)
    .where(and(eq(quotes.dealId, DEAL), eq(quotes.carrierId, lmc.id)));
  console.log(
    JSON.stringify(
      {
        bristol: {
          carrierId: bwc.id,
          portal: bwc.agentPortalUrl || bwc.portalUrl,
          quoteId: bwq?.id,
          riskOutcome: bwq?.riskOutcome,
          nextStep: bwq?.nextStep,
          bindable: bwq?.bindable,
        },
        liberty: {
          carrierId: lmc.id,
          quoteId: lmq?.id,
          riskOutcome: lmq?.riskOutcome,
          nextStep: lmq?.nextStep,
          bindable: lmq?.bindable,
          premium: lmq?.premium,
        },
      },
      null,
      2,
    ),
  );
  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
