import { eq, ilike, or } from "drizzle-orm";
import { db } from "../src/lib/db";
import { carriers, deals, risks, quotes, quoteAttemptLogs } from "../src/lib/db/schema";

const DEAL = "8f4e7b68-2de3-458e-914b-ba60ea3c47aa";

async function main() {
  const [deal] = await db.select().from(deals).where(eq(deals.id, DEAL)).limit(1);
  console.log("DEAL", deal ? { id: deal.id, title: deal.title, lob: deal.lineOfBusiness, form: (deal as any).quotingForm, pni: deal.primaryNamedInsured, property: deal.propertyOneliner } : null);

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
      address: (r as any).address ?? (r as any).street,
    })),
  );

  const sp = await db
    .select()
    .from(carriers)
    .where(
      or(
        ilike(carriers.name, "%Safepoint%"),
        ilike(carriers.name, "%Safe Point%"),
        ilike(carriers.name, "%Manatee%"),
        ilike(carriers.portalUrl, "%safepoint%"),
        ilike(carriers.agentPortalUrl, "%safepoint%"),
      ),
    );
  console.log(
    "SAFEPOINT_CARRIERS",
    sp.map((c) => ({
      id: c.id,
      name: c.name,
      agencyCode: c.agencyCode,
      portalUrl: c.portalUrl,
      agentPortalUrl: c.agentPortalUrl,
      portalLogin: c.portalLogin,
      hint: c.portalUsernameHint,
      hasUser: Boolean(c.portalUsernameEnc),
      hasPw: Boolean(c.portalPasswordEnc),
      phone: c.phone,
      email: c.email,
      active: c.active,
      dontWriteLen: (c.dontWriteRows as any)?.length,
      appetiteLen: (c.appetiteRows as any)?.length,
      appetiteNotes: String(c.appetiteNotes || "").slice(0, 200),
    })),
  );

  const qs = await db.select().from(quotes).where(eq(quotes.dealId, DEAL));
  console.log(
    "QUOTES",
    qs.map((q) => ({
      id: q.id,
      carrierId: q.carrierId,
      riskOutcome: q.riskOutcome,
      nextStep: q.nextStep,
      bindable: q.bindable,
      quoteNumber: q.quoteNumber,
      premium: q.premium,
      notes: (q.notes || "").slice(0, 160),
      stub: q.stub,
      logId: q.quoteAttemptLogId,
    })),
  );

  const logs = await db.select().from(quoteAttemptLogs).where(eq(quoteAttemptLogs.dealId, DEAL));
  console.log(
    "LOGS",
    logs.map((l) => ({
      id: l.id,
      carrierId: l.carrierId,
      result: l.result,
      bindable: l.bindable,
      why: (l.why || "").slice(0, 160),
    })),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
