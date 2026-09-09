import { describe, expect, it } from "vitest";
import {
  groupQuotesByRiskOutcome,
  inferQuoteOutcomes,
  RISK_OUTCOME_LABELS,
  syncQuoteOutcomes,
} from "./outcomes";

describe("quote outcomes", () => {
  it("keeps bindable true only for can_bind", () => {
    expect(syncQuoteOutcomes({ riskOutcome: "accepted" })).toEqual({
      riskOutcome: "accepted",
      nextStep: "can_bind",
      bindable: true,
    });
    expect(syncQuoteOutcomes({ riskOutcome: "maybe" }).bindable).toBe(false);
    expect(syncQuoteOutcomes({ riskOutcome: "not_accepted" }).nextStep).toBe("hard_no");
    expect(syncQuoteOutcomes({ riskOutcome: "no_option" }).bindable).toBe(false);
  });

  it("uses exact Quotes-tab labels", () => {
    expect(RISK_OUTCOME_LABELS.accepted).toBe("Accepted");
    expect(RISK_OUTCOME_LABELS.maybe).toBe("Maybe");
    expect(RISK_OUTCOME_LABELS.not_accepted).toBe("Not accepted");
    expect(RISK_OUTCOME_LABELS.no_option).toBe("No option");
  });

  it("infers Rosa-style portal notes", () => {
    expect(inferQuoteOutcomes({ notes: "HO3 · Floor only · Cov A forced $250,400" }).riskOutcome).toBe(
      "maybe",
    );
    expect(inferQuoteOutcomes({ notes: "Portal closed — Harmony takeout only" }).riskOutcome).toBe(
      "no_option",
    );
    expect(inferQuoteOutcomes({ notes: "Skipped — Javy: Cypress will not work" }).riskOutcome).toBe(
      "no_option",
    );
    expect(inferQuoteOutcomes({ notes: "Incomplete — needs Electrical Circuit Amps" }).riskOutcome).toBe(
      "maybe",
    );
    expect(
      inferQuoteOutcomes({ notes: "HO3 · UW age/county · water backup max $5k · $0" }).riskOutcome,
    ).toBe("not_accepted");
    expect(
      inferQuoteOutcomes({ notes: "HO3 Harmony Tailrow · Floor only / hard blocked RCE" }).riskOutcome,
    ).toBe("not_accepted");
    expect(inferQuoteOutcomes({ bindable: true }).riskOutcome).toBe("accepted");
  });

  it("groups Accepted then Maybe then Not accepted then No option", () => {
    const groups = groupQuotesByRiskOutcome(
      [
        { id: "n", riskOutcome: "no_option" },
        { id: "a", riskOutcome: "accepted" },
        { id: "m", riskOutcome: "maybe" },
        { id: "x", riskOutcome: "not_accepted" },
        { id: "m2", riskOutcome: "maybe" },
      ],
      (row) => row.riskOutcome,
    );
    expect(groups.map((g) => g.label)).toEqual([
      "Accepted",
      "Maybe",
      "Not accepted",
      "No option",
    ]);
    expect(groups[1]?.rows.map((r) => r.id)).toEqual(["m", "m2"]);
  });
});
