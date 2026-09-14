import { eq, ilike, or, and, desc } from "drizzle-orm";
import { db } from "../src/lib/db";
import { carriers, deals, risks, quotes, quoteAttemptLogs } from "../src/lib/db/schema";

const DEAL = "03dccdd7-db06-4c89-9b7a-cf0a2064d044";

async function main() {
  const [deal] = await db.select().from(deals).where(eq(deals.id, DEAL)).limit(1);
  console.log("DEAL", deal ? { id: deal.id, title: deal.title, lob: deal.lineOfBusiness, form: (deal as any).quotingForm, tenantId: deal.tenantId } : null);

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
      address1: (r as any).address1,
      roofYear: r.roofYear,
      roofCovering: r.roofCovering,
      coverageA: (r as any).coverageA,
      sqft: (r as any).squareFeet ?? (r as any).livingArea ?? (r as any).sqFt,
      foundation: (r as any).foundation,
      floodZone: (r as any).floodZone,
    })),
  );

  const th = await db
    .select()
    .from(carriers)
    .where(or(ilike(carriers.name, "%Tower%Hill%"), ilike(carriers.name, "%THIG%")));
  console.log(
    "TOWER",
    th.map((c) => ({
      id: c.id,
      name: c.name,
      tenantId: c.tenantId,
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

  const at = await db
    .select()
    .from(carriers)
    .where(or(ilike(carriers.name, "%American Tradition%"), ilike(carriers.name, "%AMTR%"), ilike(carriers.name, "%West Point%")));
  console.log(
    "AT",
    at.map((c) => ({
      id: c.id,
      name: c.name,
      tenantId: c.tenantId,
      portalUrl: c.portalUrl,
      agentPortalUrl: c.agentPortalUrl,
      portalLogin: (c.portalLogin || "").slice(0, 120),
      hint: c.portalUsernameHint,
      phone: c.phone,
      customerServicePhone: c.customerServicePhone,
      claimsPhone: c.claimsPhone,
      underwriterEmail: c.underwriterEmail,
      email: c.email,
      mailingAddress: c.mailingAddress,
      appetiteLen: (c.appetiteRows as any)?.length,
      dontWriteLen: (c.dontWriteRows as any)?.length,
    })),
  );

  const qs = await db.select().from(quotes).where(eq(quotes.dealId, DEAL));
  console.log(
    "QUOTES",
    qs.map((q) => ({
      id: q.id,
      carrierId: q.carrierId,
      quoteNumber: q.quoteNumber,
      premium: q.premium,
      riskOutcome: q.riskOutcome,
      bindable: q.bindable,
      stub: q.stub,
      notes: (q.notes || "").slice(0, 140),
    })),
  );

  const logs = await db
    .select()
    .from(quoteAttemptLogs)
    .where(eq(quoteAttemptLogs.dealId, DEAL))
    .orderBy(desc(quoteAttemptLogs.attemptedAt));
  console.log(
    "LOGS",
    logs.map((l) => ({
      id: l.id,
      carrierId: l.carrierId,
      result: l.result,
      quoteNumber: l.quoteNumber,
      premium: l.premium,
      why: (l.why || "").slice(0, 120),
    })),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
