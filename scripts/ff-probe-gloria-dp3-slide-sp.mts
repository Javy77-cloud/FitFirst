import { db } from "../src/lib/db";
import { carriers, quotes, quoteAttemptLogs, risks, quoteSheets, deals } from "../src/lib/db/schema";
import { eq, and, ilike, desc, or } from "drizzle-orm";

const DEAL = "03dccdd7-db06-4c89-9b7a-cf0a2064d044";
const SLIDE = "09af41b8-86b6-4d8a-80fd-7d7ba605709d";
const SAFEPOINT = "544cec59-3bf9-4cd3-85f6-7fe81724a45a";

async function main() {
  const [deal] = await db.select().from(deals).where(eq(deals.id, DEAL)).limit(1);
  console.log("DEAL", JSON.stringify({ id: deal?.id, name: (deal as any)?.name, title: (deal as any)?.title, line: (deal as any)?.line, status: (deal as any)?.status }, null, 2));

  const riskRows = await db.select().from(risks).where(eq(risks.dealId, DEAL));
  console.log("RISKS", JSON.stringify(riskRows.map(r => ({
    id: r.id, yearBuilt: r.yearBuilt, city: r.city, county: r.county, construction: r.construction,
    roofYear: r.roofYear, roofCovering: r.roofCovering, occupancy: r.occupancy, stories: r.stories,
    pool: r.pool, protectionClass: r.protectionClass, milesToCoast: r.milesToCoast, address: (r as any).address1 || (r as any).street
  })), null, 2));

  for (const id of [SLIDE, SAFEPOINT]) {
    const [c] = await db.select().from(carriers).where(eq(carriers.id, id)).limit(1);
    console.log("CARRIER", id, JSON.stringify({
      id: c?.id, name: c?.name,
      portalUrl: c?.portalUrl, agentPortalUrl: c?.agentPortalUrl, portalLogin: c?.portalLogin,
      appetiteNotesTail: String(c?.appetiteNotes || "").slice(-500),
      dontWriteNotesTail: String((c as any)?.dontWriteNotes || "").slice(-500),
      appetiteRowsLen: Array.isArray(c?.appetiteRows) ? (c?.appetiteRows as any[]).length : 0,
      dontWriteRowsLen: Array.isArray(c?.dontWriteRows) ? (c?.dontWriteRows as any[]).length : 0,
      lastAppetite: Array.isArray(c?.appetiteRows) ? (c?.appetiteRows as any[]).slice(-2) : null,
      lastDont: Array.isArray(c?.dontWriteRows) ? (c?.dontWriteRows as any[]).slice(-2) : null,
    }, null, 2));
  }

  const qs = await db.select().from(quotes).where(eq(quotes.dealId, DEAL));
  console.log("DEAL QUOTES", JSON.stringify(qs.map(q => ({
    id: q.id, carrierId: q.carrierId, quoteNumber: q.quoteNumber, premium: q.premium,
    bindable: q.bindable, riskOutcome: q.riskOutcome, nextStep: q.nextStep, agentStatus: q.agentStatus,
    notes: (q.notes || "").slice(0, 200), lostReason: q.lostReason
  })), null, 2));

  const slideQ = qs.filter(q => q.carrierId === SLIDE);
  const spQ = qs.filter(q => q.carrierId === SAFEPOINT);
  console.log("SLIDE_QUOTES", slideQ.length, "SAFEPOINT_QUOTES", spQ.length);

  const logs = await db.select().from(quoteAttemptLogs).where(eq(quoteAttemptLogs.dealId, DEAL)).orderBy(desc(quoteAttemptLogs.attemptedAt));
  console.log("LOGS", JSON.stringify(logs.map(l => ({
    id: l.id, carrierId: l.carrierId, result: l.result, quoteNumber: l.quoteNumber,
    bindable: l.bindable, lob: l.lineOfBusiness, why: (l.why || "").slice(0, 180), attemptedAt: l.attemptedAt
  })), null, 2));

  const sheets = await db.select().from(quoteSheets).where(eq(quoteSheets.dealId, DEAL));
  console.log("SHEETS", sheets.map(s => ({ id: s.id, line: s.line })));
}
main().catch(e => { console.error(e); process.exit(1); });
