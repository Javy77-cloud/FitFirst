import { db } from "../src/lib/db";
import { carriers, quotes, risks, deals } from "../src/lib/db/schema";
import { eq, ilike, or } from "drizzle-orm";

const DEAL = "03dccdd7-db06-4c89-9b7a-cf0a2064d044";
const TAILROW = "33333333-3333-4333-8333-333333333306";
const HOC = "33333333-3333-4333-8333-333333333304";

async function main() {
  const [deal] = await db.select().from(deals).where(eq(deals.id, DEAL)).limit(1);
  const [risk] = await db.select().from(risks).where(eq(risks.dealId, DEAL)).limit(1);
  const carr = await db
    .select({
      id: carriers.id,
      name: carriers.name,
      portalUrl: carriers.portalUrl,
      agentPortalUrl: carriers.agentPortalUrl,
    })
    .from(carriers)
    .where(
      or(
        ilike(carriers.name, "%Tailrow%"),
        ilike(carriers.name, "%TypTap%"),
        ilike(carriers.name, "%Harmony%"),
        ilike(carriers.name, "%Homeowners Choice%"),
        eq(carriers.id, TAILROW),
        eq(carriers.id, HOC),
      ),
    );
  const qs = await db
    .select({
      id: quotes.id,
      carrierId: quotes.carrierId,
      riskOutcome: quotes.riskOutcome,
      quoteNumber: quotes.quoteNumber,
      bindable: quotes.bindable,
      notes: quotes.notes,
      stub: quotes.stub,
    })
    .from(quotes)
    .where(eq(quotes.dealId, DEAL));

  const allC = await db.select({ id: carriers.id, name: carriers.name }).from(carriers);
  const nameById = Object.fromEntries(allC.map((c) => [c.id, c.name]));

  console.log(
    JSON.stringify(
      {
        deal: deal && {
          id: deal.id,
          title: (deal as any).title,
          name: (deal as any).name,
          line: (deal as any).line,
        },
        risk: risk && {
          id: risk.id,
          address: (risk as any).address,
          city: risk.city,
          yearBuilt: risk.yearBuilt,
          occupancy: risk.occupancy,
          coverageA: (risk as any).coverageA,
          roofYear: risk.roofYear,
          construction: risk.construction,
          stories: risk.stories,
          protectionClass: risk.protectionClass,
          milesToCoast: risk.milesToCoast,
          county: risk.county,
          roofCovering: risk.roofCovering,
        },
        carriers: carr,
        dealQuotes: qs.map((q) => ({
          ...q,
          carrierName: nameById[q.carrierId],
          notes: (q.notes || "").slice(0, 160),
        })),
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
