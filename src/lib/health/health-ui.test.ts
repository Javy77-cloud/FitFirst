import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("client health chrome", () => {
  it("feeds locked dig-in into #153 cards and the compare drawer", () => {
    const card = source("src/components/renewals/renewal-card.tsx");
    const desk = source("src/components/renewals/renewals-desk.tsx");
    const strip = source("src/components/renewals/renewals-health-strip.tsx");
    const drawer = source("src/components/renewals/renewal-compare-drawer.tsx");
    const board = source("src/lib/renewal/board-data.ts");
    const chip = source("src/components/health/health-score-chip.tsx");
    expect(card).toMatch(/RenewalHealthMeter/);
    expect(card).toMatch(/RenewalCompareDrawer/);
    expect(card).toMatch(/clientHealth=\{card\.clientHealth\}/);
    expect(card).toMatch(/policyHealth=\{card\.policyHealth\}/);
    expect(card).toMatch(/data-ff-client-health-band/);
    expect(card).not.toMatch(/HealthScoreChip/);
    expect(board).toMatch(/clientHealth\.why/);
    expect(board).toMatch(/clientHealth\.band/);
    expect(desk).toMatch(/RenewalsHealthStrip/);
    expect(desk).toMatch(/rollupRenewalHealth/);
    expect(strip).toMatch(/data-ff-health-agent-rollups/);
    expect(strip).not.toMatch(/retention/i);
    expect(drawer).toMatch(/data-ff-health-graphs/);
    expect(drawer).toMatch(/HealthFactorList/);
    expect(chip).toMatch(/Talk history|Client health/);
    expect(chip).not.toMatch(/retention/i);
  });

  it("hosts the 1–5 mini-review after locked moments", () => {
    const host = source("src/components/app-shell.tsx");
    const prompt = source("src/components/health/review-prompt.tsx");
    const pending = source("src/lib/health/pending-review.ts");
    expect(host).toMatch(/ExperienceReviewHost/);
    expect(prompt).toMatch(/data-ff-review-star/);
    expect(pending).toMatch(/renewal_close/);
    expect(pending).toMatch(/logged_call/);
    expect(pending).toMatch(/claim_wrap/);
    expect(pending).toMatch(/moment: "bind"/);
    expect(pending).toMatch(/REVIEW_EVENT/);
    expect(pending).not.toMatch(/logged_email/);
  });
});
