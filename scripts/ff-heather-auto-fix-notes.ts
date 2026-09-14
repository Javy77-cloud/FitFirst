import { eq } from "drizzle-orm";
import { db } from "../src/lib/db";
import { carriers, quotes } from "../src/lib/db/schema";

const DEAL = "12aa92aa-3b8d-4211-acf3-fda09d77a194";

/** Real reasons from today's shop — not generic no_market copy. */
const FIXES: Record<
  string,
  {
    match: RegExp;
    notes: string;
    riskOutcome?: string;
    nextStep?: string;
    bindable?: boolean;
    quoteNumber?: string | null;
    premium?: string | null;
  }
> = {
  allstate: {
    match: /allstate/i,
    notes:
      "Conditional / Maybe — quote #033262532565070, $3710.18/6mo (Silver defaults). WHY CONDITIONAL: portal requires Convert to New Business before bind; not a hard UW decline. Bind reqs: complete Convert to New Business in Allstate portal. Form PA.",
    riskOutcome: "maybe",
    nextStep: "go_back",
    bindable: false,
    quoteNumber: "033262532565070",
    premium: "3710.18",
  },
  nationwide: {
    match: /nationwide/i,
    notes:
      "Declined / Not accepted — submission #461014264320. WHY DECLINED (portal): placement changed / not eligible on this path (not a login failure). No premium. Form PA. Reopen Nationwide portal with sub # if retrying.",
    riskOutcome: "not_accepted",
    nextStep: "hard_no",
    bindable: false,
    quoteNumber: "461014264320",
  },
  progressive: {
    match: /^progressive$/i,
    notes:
      "Conditional / Maybe — quote #550013376416, $700/6mo PIF at portal floor 50/100/25 (requested 10/20/10 unavailable; floor accepted for learning DB). WHY CONDITIONAL: Bindable No — FL license required for POS/MVR (MVR = N). Discounts: 3yr Safe-Driver + Homeowner; no lapse. PIP 1k, Comp/Coll 1k, UM/UIM none. Agent 87747. Form PA. Finish: pull FL license/POS-MVR in Progressive to clear bind.",
    riskOutcome: "maybe",
    nextStep: "go_back",
    bindable: false,
    quoteNumber: "550013376416",
    premium: "700",
  },
  geico: {
    match: /geico/i,
    notes:
      "No quote obtained — portal access blocked (NOT a UW decline). Quote #564950R3702949 started. WHY: Geico message “Last time you accessed this quote, you were working with a GEICO agent. To continue, call (800) 714-8843.” No premium. User J0008221 on sales.geico.com. Form PA. Retry: phone Geico or agent unlock, then reopen #564950R3702949.",
    riskOutcome: "not_accepted",
    nextStep: "go_back",
    bindable: false,
    quoteNumber: "564950R3702949",
  },
  liberty: {
    match: /liberty/i,
    notes:
      "No quote obtained — portal error (NOT a clear UW decline). WHY: Liberty Mutual System Error kickout mid-shop; no premium captured. Retry after login/session stable. Form PA.",
    riskOutcome: "not_accepted",
    nextStep: "go_back",
    bindable: false,
  },
  general: {
    match: /general/i,
    notes:
      "No quote obtained — no portal access (NordPass). WHY: The General password expired / NordPass login failed; never reached rating. Retry: update NordPass then reopen portal. Form PA.",
    riskOutcome: "not_accepted",
    nextStep: "go_back",
    bindable: false,
  },
  travelers: {
    match: /travelers/i,
    notes:
      "No quote obtained — no portal access (NordPass autofill). WHY: Travelers NordPass entry `afains1` autofill failed; never reached rating. Holding for Javy simultaneous login handoff. Form PA.",
    riskOutcome: "not_accepted",
    nextStep: "go_back",
    bindable: false,
  },
  bristol: {
    match: /bristol/i,
    notes:
      "No quote obtained — carrier portal quoting maintenance. WHY: Bristol West quoting maintenance; skipped per standing rule until clear. Not a UW decline. Form PA.",
    riskOutcome: "not_accepted",
    nextStep: "go_back",
    bindable: false,
  },
};

async function main() {
  const rows = await db
    .select({
      id: quotes.id,
      carrierId: quotes.carrierId,
      notes: quotes.notes,
      riskOutcome: quotes.riskOutcome,
      nextStep: quotes.nextStep,
      quoteNumber: quotes.quoteNumber,
      premium: quotes.premium,
      bindable: quotes.bindable,
      name: carriers.name,
    })
    .from(quotes)
    .innerJoin(carriers, eq(quotes.carrierId, carriers.id))
    .where(eq(quotes.dealId, DEAL));

  console.log(
    "BEFORE",
    rows.map((r) => ({
      name: r.name,
      riskOutcome: r.riskOutcome,
      nextStep: r.nextStep,
      quoteNumber: r.quoteNumber,
      premium: r.premium,
      notes: (r.notes || "").slice(0, 120),
    })),
  );

  for (const row of rows) {
    const fix = Object.values(FIXES).find((f) => f.match.test(row.name));
    if (!fix) {
      console.log("SKIP_NO_FIX", row.name);
      continue;
    }
    const patch: any = {
      notes: fix.notes,
      updatedAt: new Date(),
    };
    if (fix.riskOutcome) patch.riskOutcome = fix.riskOutcome;
    if (fix.nextStep) patch.nextStep = fix.nextStep;
    if (fix.bindable != null) patch.bindable = fix.bindable;
    if (fix.quoteNumber !== undefined) patch.quoteNumber = fix.quoteNumber;
    if (fix.premium !== undefined) patch.premium = fix.premium;
    await db.update(quotes).set(patch).where(eq(quotes.id, row.id));
    console.log("UPDATED", row.name);
  }
  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
