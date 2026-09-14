import { eq, and, ilike } from "drizzle-orm";
import { db } from "../src/lib/db";
import { carriers, quotes } from "../src/lib/db/schema";

const DEAL = "12aa92aa-3b8d-4211-acf3-fda09d77a194";

async function main() {
  const rows = await db
    .select({
      id: quotes.id,
      notes: quotes.notes,
      quoteNumber: quotes.quoteNumber,
      premium: quotes.premium,
      riskOutcome: quotes.riskOutcome,
      name: carriers.name,
    })
    .from(quotes)
    .innerJoin(carriers, eq(quotes.carrierId, carriers.id))
    .where(and(eq(quotes.dealId, DEAL), ilike(carriers.name, "%Progressive%")));

  for (const row of rows) {
    const isRated = String(row.quoteNumber || "") === "550013376416" || String(row.premium || "").startsWith("700");
    if (isRated) {
      await db
        .update(quotes)
        .set({
          riskOutcome: "maybe",
          nextStep: "go_back",
          bindable: false,
          quoteNumber: "550013376416",
          premium: "700",
          notes:
            "Conditional / Maybe — quote #550013376416, $700/6mo PIF at portal floor 50/100/25 (requested 10/20/10 unavailable; floor accepted for learning DB). WHY CONDITIONAL: Bindable No — FL license required for POS/MVR (MVR = N). Discounts: 3yr Safe-Driver + Homeowner; no lapse. PIP 1k, Comp/Coll 1k, UM/UIM none. Agent 87747. Form PA. Finish: pull FL license/POS-MVR in Progressive to clear bind.",
          updatedAt: new Date(),
        } as any)
        .where(eq(quotes.id, row.id));
      console.log("RATED", row.id);
    } else {
      await db
        .update(quotes)
        .set({
          riskOutcome: "not_accepted",
          nextStep: "go_back",
          bindable: false,
          quoteNumber: null,
          premium: null,
          notes:
            "No quote obtained — no portal access (NordPass). WHY: Progressive credentials rejected after NordPass autofill earlier in the shop; later re-entry succeeded as #550013376416 (see other Progressive row). Kept for history. Form PA.",
          updatedAt: new Date(),
        } as any)
        .where(eq(quotes.id, row.id));
      console.log("LOGIN_FAIL_HISTORY", row.id);
    }
  }
  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
