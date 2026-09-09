import { describe, expect, it } from "vitest";
import {
  AGENT_STATUSES,
  AGENT_STATUS_LABELS,
  bindRequirementChips,
  minCoverageANotMetAmount,
  quoteNeedsBindRecheckAlert,
  groupQuotesByRiskOutcome,
  groupQuotesBySection,
  inferQuoteOutcomes,
  normalizeAgentStatus,
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
      requestedCoverageA: 250380,
    });
    expect(chips).toEqual(
      expect.arrayContaining([
        "Four-point inspection required",
        "Wind mitigation form needed",
        "Indicative quote only — not bindable yet",
      ]),
    );
    expect(chips.join(" ")).not.toMatch(/Floor-only quote/);
    expect(chips.join(" ")).not.toMatch(/Minimum Coverage A/);
    expect(chips.filter((c) => /mitigation/i.test(c))).toHaveLength(1);
  });

  it("Ovation-like: asked meets forced floor → indicative only, not Minimum Cov A", () => {
    const chips = bindRequirementChips({
      notes: "HO3 · Floor only · Cov A forced $250,400",
      requestedCoverageA: 250380,
    });
    expect(chips).toContain("Indicative quote only — not bindable yet");
    expect(chips.some((c) => /Minimum Coverage A/i.test(c))).toBe(false);
    expect(chips.some((c) => /Floor-only quote/i.test(c))).toBe(false);
  });

  it("under min Cov A: one Minimum Coverage A not met chip, no floor-only", () => {
    const chips = bindRequirementChips({
      notes: "HO3 · Floor only · Cov A forced $317,000",
      requestedCoverageA: 250000,
    });
    expect(chips).toContain("Minimum Coverage A $317,000 not met");
    expect(chips.some((c) => /Floor-only quote|Indicative quote only/i.test(c))).toBe(false);
  });

  it("parses min Cov A not-met floor for override UI", () => {
    expect(
      minCoverageANotMetAmount({
        notes: "HO3 · Floor only · Cov A forced $317,000",
        requestedCoverageA: 250000,
      }),
    ).toBe(317000);
    expect(
      minCoverageANotMetAmount({
        notes: "HO3 · Floor only · Cov A forced $250,400",
        requestedCoverageA: 250380,
      }),
    ).toBeNull();
  });

  it("mitigation form → Wind mitigation form needed", () => {
    const chips = bindRequirementChips({
      notes: "Needs mitigation form and wind mit",
    });
    expect(chips).toContain("Wind mitigation form needed");
    expect(chips.filter((c) => /mitigation/i.test(c))).toHaveLength(1);
  });

  it("agent status labels: Quoted / Send / Review / Bound / Pending inspection / Won / Lost", () => {
    expect(AGENT_STATUS_LABELS.new).toBe("Quoted");
    expect(AGENT_STATUS_LABELS.sent_to_client).toBe("Send");
    expect(AGENT_STATUS_LABELS.client_reviewing).toBe("Review");
    expect(AGENT_STATUS_LABELS.bound).toBe("Bound");
    expect(AGENT_STATUS_LABELS.waiting_on_inspection).toBe("Pending inspection");
    expect(AGENT_STATUS_LABELS.won).toBe("Won");
    expect(AGENT_STATUS_LABELS.dead).toBe("Lost");
    expect(AGENT_STATUSES).toEqual([
      "new",
      "sent_to_client",
      "client_reviewing",
      "bound",
      "waiting_on_inspection",
      "won",
      "dead",
    ]);
    expect(normalizeAgentStatus("quoted")).toBe("new");
    expect(normalizeAgentStatus("lost")).toBe("dead");
    expect(normalizeAgentStatus("bound")).toBe("bound");
    expect(normalizeAgentStatus("won")).toBe("won");
  });

  it("short reason label stays scannable", () => {
    expect(
      shortReasonLabel({
        notes: "HO3 · Floor only · Cov A forced $250,400",
        riskOutcome: "conditional",
      }),
    ).toMatch(/Indicative|Coverage|follow-up|Floor/i);
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
});
