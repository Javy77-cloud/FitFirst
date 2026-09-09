import { describe, expect, it } from "vitest";
import {
  bindRequirementChips,
  quoteNeedsBindRecheckAlert,
  groupQuotesByRiskOutcome,
  groupQuotesBySection,
  inferQuoteOutcomes,
  normalizeRiskOutcome,
  parseCovATriedForced,
  RISK_OUTCOME_LABELS,
  shortReasonLabel,
  shortRiskChips,
  syncQuoteOutcomes,
} from "./outcomes";

describe("quote outcomes", () => {
  it("keeps bindable true only for can_bind", () => {
    expect(syncQuoteOutcomes({ riskOutcome: "bindable" })).toEqual({
      riskOutcome: "bindable",
      nextStep: "can_bind",
      bindable: true,
    });
    expect(syncQuoteOutcomes({ riskOutcome: "conditional" }).bindable).toBe(false);
    expect(syncQuoteOutcomes({ riskOutcome: "declined" }).nextStep).toBe("hard_no");
    expect(syncQuoteOutcomes({ riskOutcome: "no_market" }).bindable).toBe(false);
  });

  it("uses exact Quotes-tab labels", () => {
    expect(RISK_OUTCOME_LABELS.bindable).toBe("Bindable");
    expect(RISK_OUTCOME_LABELS.conditional).toBe("Conditional");
    expect(RISK_OUTCOME_LABELS.declined).toBe("Declined");
    expect(RISK_OUTCOME_LABELS.no_market).toBe("No market");
  });

  it("normalizes legacy sep7de values", () => {
    expect(normalizeRiskOutcome("accepted")).toBe("bindable");
    expect(normalizeRiskOutcome("maybe")).toBe("conditional");
    expect(normalizeRiskOutcome("not_accepted")).toBe("declined");
    expect(normalizeRiskOutcome("no_option")).toBe("no_market");
    expect(normalizeRiskOutcome("bindable")).toBe("bindable");
  });

  it("infers Rosa-style portal notes", () => {
    expect(inferQuoteOutcomes({ notes: "HO3 · Floor only · Cov A forced $250,400" }).riskOutcome).toBe(
      "conditional",
    );
    expect(inferQuoteOutcomes({ notes: "Portal closed — Harmony takeout only" }).riskOutcome).toBe(
      "no_market",
    );
    expect(inferQuoteOutcomes({ notes: "Skipped — Javy: Cypress will not work" }).riskOutcome).toBe(
      "no_market",
    );
    expect(inferQuoteOutcomes({ notes: "Incomplete — needs Electrical Circuit Amps" }).riskOutcome).toBe(
      "conditional",
    );
    expect(
      inferQuoteOutcomes({ notes: "HO3 · UW age/county · water backup max $5k · $0" }).riskOutcome,
    ).toBe("declined");
    expect(
      inferQuoteOutcomes({ notes: "HO3 Harmony Tailrow · Floor only / hard blocked RCE" }).riskOutcome,
    ).toBe("declined");
    expect(inferQuoteOutcomes({ bindable: true }).riskOutcome).toBe("bindable");
  });

  it("groups Bindable then Conditional then Declined then No market", () => {
    const groups = groupQuotesByRiskOutcome(
      [
        { id: "n", riskOutcome: "no_market" },
        { id: "a", riskOutcome: "bindable" },
        { id: "m", riskOutcome: "conditional" },
        { id: "x", riskOutcome: "declined" },
        { id: "m2", riskOutcome: "maybe" },
      ],
      (row) => row.riskOutcome,
    );
    expect(groups.map((g) => g.label)).toEqual([
      "Bindable",
      "Conditional",
      "Declined",
      "No market",
    ]);
    expect(groups[1]?.rows.map((r) => r.id)).toEqual(["m", "m2"]);
  });

  it("stacks Declined / No market in one Quotes section", () => {
    const groups = groupQuotesBySection(
      [
        { id: "n", riskOutcome: "no_market" },
        { id: "a", riskOutcome: "bindable" },
        { id: "m", riskOutcome: "conditional" },
        { id: "x", riskOutcome: "declined" },
      ],
      (row) => row.riskOutcome,
    );
    expect(groups.map((g) => g.key)).toEqual(["bindable", "conditional", "declined_no_market"]);
    expect(groups[2]?.rows.map((r) => r.id)).toEqual(["n", "x"]);
    expect(groups[2]?.collapseByDefault).toBe(true);
    expect(groups[1]?.collapseByDefault).toBe(false);
  });

  it("parses Cov A forced from notes and prefers coverage_a", () => {
    expect(
      parseCovATriedForced({
        coverageA: 250400,
        notes: "HO3 · Floor only · Cov A forced $250,400",
      }),
    ).toEqual({ tried: null, forced: 250400, forcedNoted: true });
  });

  it("builds short risk chips without dumping notes", () => {
    expect(shortRiskChips("HO3 · Floor only · Cov A forced $250,400", ["No flood"])).toEqual([
      "No flood",
      "Floor only",
    ]);
  });

  it("builds plain-English bind requirement chips for agents", () => {
    const chips = bindRequirementChips({
      notes: "HO3 · Floor only · Cov A forced $250,400 · 4-point needed · mitigation form",
    });
    expect(chips).toEqual(
      expect.arrayContaining([
        "Four-point inspection required",
        "Mitigation form needed",
        "Floor-only quote — not bindable yet",
        "Minimum Coverage A $250,400",
      ]),
    );
  });

  it("short reason label stays scannable", () => {
    expect(
      shortReasonLabel({
        notes: "HO3 · Floor only · Cov A forced $250,400",
        riskOutcome: "conditional",
      }),
    ).toMatch(/Floor|Coverage|follow-up/i);
  });
});

  it("bind recheck alert for bindable or concrete follow-up notes", () => {
    expect(quoteNeedsBindRecheckAlert({ riskOutcome: "conditional" })).toBe(false);
    expect(quoteNeedsBindRecheckAlert({ riskOutcome: "declined" })).toBe(false);
    expect(quoteNeedsBindRecheckAlert({ riskOutcome: "conditional", notes: "HO3 · Floor only" })).toBe(
      false,
    );
    expect(quoteNeedsBindRecheckAlert({ riskOutcome: "bindable" })).toBe(true);
    expect(quoteNeedsBindRecheckAlert({ bindable: true })).toBe(true);
    expect(quoteNeedsBindRecheckAlert({ nextStep: "can_bind" })).toBe(true);
    expect(
      quoteNeedsBindRecheckAlert({
        riskOutcome: "declined",
        notes:
          "HO3 · UW age/county · homes 10yr+ / 40yr need 4pt+photos in 15 days · water backup max $5k · $0",
      }),
    ).toBe(true);
    expect(
      quoteNeedsBindRecheckAlert({
        riskOutcome: "conditional",
        notes: "HO3 · Quoted UW not bindable · Cov A forced $250,000",
      }),
    ).toBe(true);
  });
