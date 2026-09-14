import { or, ilike, eq, and } from "drizzle-orm";
import { db } from "../src/lib/db";
import { carriers, risks, quotes } from "../src/lib/db/schema";

const DEAL = "8f4e7b68-2de3-458e-914b-ba60ea3c47aa";

const rows = await db
  .select()
  .from(carriers)
  .where(
    or(
      ilike(carriers.name, "%Florida Peninsula%"),
      ilike(carriers.name, "%Peninsula%"),
      ilike(carriers.name, "%FPI%"),
      ilike(carriers.name, "%FPIC%"),
      ilike(carriers.name, "%Edison%"),
    ),
  );

console.log(
  "carriers:",
  JSON.stringify(
    rows.map((c) => ({
      id: c.id,
      name: c.name,
      portalUrl: c.portalUrl,
      agentPortalUrl: c.agentPortalUrl,
      portalLogin: c.portalLogin,
      portalUsernameHint: (c as any).portalUsernameHint,
      phone: c.phone,
      email: c.email,
      dontWriteRowsLen: ((c as any).dontWriteRows as any)?.length ?? 0,
      appetiteRowsLen: ((c as any).appetiteRows as any)?.length ?? 0,
    })),
    null,
    2,
  ),
);

const [risk] = await db.select().from(risks).where(eq(risks.dealId, DEAL)).limit(1);
console.log(
  "risk:",
  JSON.stringify(
    risk
      ? {
          id: risk.id,
          yearBuilt: risk.yearBuilt,
          construction: risk.construction,
          stories: risk.stories,
          occupancy: risk.occupancy,
          protectionClass: risk.protectionClass,
          milesToCoast: risk.milesToCoast,
          city: risk.city,
          county: risk.county,
          coverageA: (risk as any).coverageA,
          roofYear: risk.roofYear,
          roofCovering: risk.roofCovering,
          openingProtection: risk.openingProtection,
          pool: risk.pool,
        }
      : null,
    null,
    2,
  ),
);

for (const c of rows) {
  const qs = await db
    .select()
    .from(quotes)
    .where(and(eq(quotes.dealId, DEAL), eq(quotes.carrierId, c.id)));
  if (qs.length)
    console.log(
      "existing quotes for",
      c.name,
      JSON.stringify(
        qs.map((q) => ({
          id: q.id,
          riskOutcome: q.riskOutcome,
          notes: (q.notes || "").slice(0, 120),
        })),
        null,
        2,
      ),
    );
}
process.exit(0);
