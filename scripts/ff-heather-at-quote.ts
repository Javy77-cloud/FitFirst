import { eq } from "drizzle-orm";
import { db } from "../src/lib/db";
import { quotes, quoteAttemptLogs, deals, risks, carriers } from "../src/lib/db/schema";

const DEAL = "5ed997ba-21b5-4a70-bdf8-c78810cc79b1";
const RISK = "a774d033-df6d-4503-918f-31080e7882e3";
const QUOTE_ID = "f2bc97df-d399-4d96-9437-eb108c173c39";
const LOG_ID = "b1ff88f5-38ff-4a6d-b51d-f0a6043635f9";

const note =
  "HO3 American Traditions. $5,133 · #Q5104567. Cov A portal $310,000. Bindable/Accepted. Flood questions answered No; medical payments showed $1,000. Bind-ready.";

async function main() {
  const [risk] = await db.select().from(risks).where(eq(risks.id, RISK));

  await db
    .update(quoteAttemptLogs)
    .set({
      result: "accepted",
      bindable: true,
      quoteNumber: "Q5104567",
      premium: "5133.00",
      covATried: 310097,
      covAForced: 310000,
      why: note,
      snapYearBuilt: risk?.yearBuilt ?? null,
      snapRoofYear: risk?.roofYear ?? null,
      snapRoofCovering: risk?.roofCovering ?? null,
      snapConstruction: risk?.construction ?? null,
      snapOpeningProtection: risk?.openingProtection ?? null,
      snapOccupancy: risk?.occupancy ?? null,
      snapStories: risk?.stories ?? null,
      snapPool: risk?.pool ?? null,
      snapProtectionClass: risk?.protectionClass ?? null,
      snapMilesToCoast: risk?.milesToCoast ?? null,
      snapCity: risk?.city ?? null,
      snapCounty: risk?.county ?? null,
      snapCoverageA: 310000,
      attemptedAt: new Date(),
    })
    .where(eq(quoteAttemptLogs.id, LOG_ID));

  await db
    .update(quotes)
    .set({
      quoteNumber: "Q5104567",
      premium: "5133.00",
      coverageA: 310000,
      bindable: true,
      riskOutcome: "bindable",
      nextStep: "can_bind",
      agentStatus: "new",
      notes: note,
      stub: false,
    })
    .where(eq(quotes.id, QUOTE_ID));

  const rows = await db
    .select({
      name: carriers.name,
      premium: quotes.premium,
      bindable: quotes.bindable,
      quoteNumber: quotes.quoteNumber,
      riskOutcome: quotes.riskOutcome,
    })
    .from(quotes)
    .innerJoin(carriers, eq(carriers.id, quotes.carrierId))
    .where(eq(quotes.dealId, DEAL));

  const priced = rows
    .filter((r) => r.premium != null && Number(r.premium) > 0)
    .sort((a, b) => Number(a.premium) - Number(b.premium));

  const lines = priced.slice(0, 10).map((r, i) => {
    const prem = Number(r.premium).toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
    });
    const tag = r.bindable ? "bindable" : `not bindable (${r.riskOutcome ?? "conditional"})`;
    const qn = r.quoteNumber ? ` · #${r.quoteNumber}` : "";
    return `${i + 1}. ${r.name} · ${prem} · ${tag}${qn}`;
  });

  const header = `Quote results (cheapest first). Home HO3 shop in progress — ${rows.length} markets logged (Cypress skipped). These are shopping quotes — none of them is a policy.\n\n`;
  const footer = `\n\nLatest: American Traditions HO3 #Q5104567 $5,133 Cov A $310,000 — Bindable (flood Qs No; med pay $1,000).`;

  await db
    .update(deals)
    .set({ quoteResultsNote: header + lines.join("\n") + footer, updatedAt: new Date() })
    .where(eq(deals.id, DEAL));

  console.log(JSON.stringify({ ok: true, cheapest: lines.slice(0, 6) }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
