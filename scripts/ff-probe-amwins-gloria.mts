import { db } from "../src/lib/db";
import { carriers, quotes, risks, quoteAttemptLogs } from "../src/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";

const DEAL = "8f4e7b68-2de3-458e-914b-ba60ea3c47aa";
const CARRIER = "cbe2e171-1cac-4c49-8204-04787dfcbae3";

async function main() {
  const [c] = await db.select().from(carriers).where(eq(carriers.id, CARRIER)).limit(1);
  console.log("CARRIER_KEYS", Object.keys(c || {}));
  console.log("CARRIER", {
    id: c?.id,
    name: c?.name,
    portalUrl: c?.portalUrl,
    agentPortalUrl: c?.agentPortalUrl,
    website: c?.website,
    portalLogin: c?.portalLogin,
    phone: c?.phone,
    customerServicePhone: c?.customerServicePhone,
    underwriterEmail: c?.underwriterEmail,
    email: c?.email,
    carrierInfo: c?.carrierInfo,
    appetiteNotes: c?.appetiteNotes,
    appetiteRowsLen: Array.isArray(c?.appetiteRows) ? c.appetiteRows.length : null,
    dontWriteRowsLen: Array.isArray((c as any)?.dontWriteRows) ? (c as any).dontWriteRows.length : null,
    portalUsernameHint: c?.portalUsernameHint,
    hasUserEnc: Boolean(c?.portalUsernameEnc),
    hasPassEnc: Boolean(c?.portalPasswordEnc),
  });

  const riskRows = await db.execute(sql`select id, year_built, roof_year, roof_covering, construction, city, county, occupancy, stories, pool, protection_class, miles_to_coast from risks where deal_id = ${DEAL} limit 1`);
  console.log("RISK", riskRows);

  const qs = await db.execute(sql`
    select id, carrier_id, quote_number, premium, bindable, risk_outcome, next_step, agent_status, coverage_a, hurricane_deductible, aop_deductible, left(notes, 120) as notes
    from quotes where deal_id = ${DEAL}
  `);
  console.log("QUOTES", qs);

  const existing = await db
    .select({ id: quotes.id, quoteNumber: quotes.quoteNumber, bindable: quotes.bindable })
    .from(quotes)
    .where(and(eq(quotes.dealId, DEAL), eq(quotes.carrierId, CARRIER)));
  console.log("EXISTING_AMWINS_QUOTE", existing);

  const logs = await db.execute(sql`
    select id, result, bindable, quote_number, premium, left(why, 100) as why
    from quote_attempt_logs where deal_id = ${DEAL} and carrier_id = ${CARRIER}
    order by attempted_at desc limit 5
  `);
  console.log("LOGS", logs);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
