import { eq, ilike, or } from "drizzle-orm";
import { db } from "../src/lib/db";
import { carriers, deals, risks, quotes, quoteAttemptLogs } from "../src/lib/db/schema";

const DEAL = "8f4e7b68-2de3-458e-914b-ba60ea3c47aa";

async function main() {
  const [deal] = await db.select().from(deals).where(eq(deals.id, DEAL)).limit(1);
  console.log("DEAL", deal ? { id: deal.id, title: deal.title, lob: deal.lineOfBusiness, form: (deal as any).quotingForm } : null);

  const riskRows = await db.select().from(risks).where(eq(risks.dealId, DEAL));
  console.log(
    "RISKS",
    riskRows.map((r) => ({
      id: r.id,
      yearBuilt: r.yearBuilt,
      construction: r.construction,
      stories: r.stories,
      occupancy: r.occupancy,
      protectionClass: r.protectionClass,
      milesToCoast: r.milesToCoast,
      city: r.city,
      county: r.county,
      roofYear: r.roofYear,
      roofCovering: r.roofCovering,
      coverageA: (r as any).coverageA,
      sqft: (r as any).squareFeet ?? (r as any).livingArea ?? (r as any).sqFt,
      foundation: (r as any).foundation,
      floodZone: (r as any).floodZone,
      bedrooms: (r as any).bedrooms,
      bathrooms: (r as any).bathrooms,
    })),
  );

  const th = await db
    .select()
    .from(carriers)
    .where(
      or(
        ilike(carriers.name, "%Tower%Hill%"),
        ilike(carriers.name, "Tower Hill%"),
        ilike(carriers.name, "%THIG%"),
      ),
    );
  console.log(
    "TOWER",
    th.map((c) => ({
      id: c.id,
      name: c.name,
      portalUrl: c.portalUrl,
      agentPortalUrl: c.agentPortalUrl,
      portalLogin: c.portalLogin,
      hint: c.portalUsernameHint,
      phone: c.phone,
      email: c.email,
      dontWriteLen: (c.dontWriteRows as any)?.length,
      appetiteLen: (c.appetiteRows as any)?.length,
    })),
  );

  const qs = await db.select().from(quotes).where(eq(quotes.dealId, DEAL));
  console.log(
    "QUOTES",
    qs.map((q) => ({
      id: q.id,
      carrierId: q.carrierId,
      notes: (q.notes || "").slice(0, 100),
      riskOutcome: q.riskOutcome,
      stub: q.stub,
    })),
  );

  const logs = await db.select().from(quoteAttemptLogs).where(eq(quoteAttemptLogs.dealId, DEAL));
  console.log(
    "LOGS",
    logs.map((l) => ({
      id: l.id,
      carrierId: l.carrierId,
      result: l.result,
      why: (l.why || "").slice(0, 100),
    })),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
