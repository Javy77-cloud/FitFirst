import { eq, and } from "drizzle-orm";
import { db } from "../src/lib/db";
import { carriers, quotes, risks, quoteSheets } from "../src/lib/db/schema";

const AI = "33333333-3333-4333-8333-333333333309";
const DEAL = "8f4e7b68-2de3-458e-914b-ba60ea3c47aa";

async function main() {
  const [c] = await db.select().from(carriers).where(eq(carriers.id, AI)).limit(1);
  const qs = await db.select().from(quotes).where(and(eq(quotes.dealId, DEAL), eq(quotes.carrierId, AI)));
  const [r] = await db.select().from(risks).where(eq(risks.dealId, DEAL)).limit(1);
  const [s] = await db
    .select()
    .from(quoteSheets)
    .where(and(eq(quoteSheets.dealId, DEAL), eq(quoteSheets.line, "home")))
    .limit(1);
  const vals = (s?.values || {}) as any;
  console.log(
    JSON.stringify(
      {
        carrier: {
          id: c?.id,
          name: c?.name,
          portalUrl: c?.portalUrl,
          agentPortalUrl: c?.agentPortalUrl,
          portalLogin: c?.portalLogin,
          phone: c?.phone,
          customerServicePhone: c?.customerServicePhone,
          underwriterEmail: c?.underwriterEmail,
          hasUser: Boolean(c?.portalUsernameEnc),
          hasPass: Boolean(c?.portalPasswordEnc),
          appetiteNotesTail: (c?.appetiteNotes || "").slice(-240),
          appetiteRowsLen: Array.isArray(c?.appetiteRows) ? (c?.appetiteRows as any[]).length : null,
        },
        quotes: qs.map((q) => ({
          id: q.id,
          quoteNumber: q.quoteNumber,
          premium: q.premium,
          riskOutcome: q.riskOutcome,
          nextStep: q.nextStep,
          bindable: q.bindable,
          notes: (q.notes || "").slice(0, 200),
        })),
        risk: {
          id: r?.id,
          yearBuilt: r?.yearBuilt,
          coverageA: r?.coverageA,
          city: r?.city,
          occupancy: r?.occupancy,
          roofYear: r?.roofYear,
          construction: r?.construction,
        },
        sheet: {
          id: s?.id,
          months_occupied: vals.months_occupied ?? null,
          resided_under_2_years: vals.resided_under_2_years ?? null,
          years_at_address: vals.years_at_address ?? null,
        },
      },
      null,
      2,
    ),
  );
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
