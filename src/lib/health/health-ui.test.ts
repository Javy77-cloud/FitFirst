import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("client health chrome", () => {
  it("enriches the shipped #153 board without a second card face", () => {
    const card = source("src/components/renewals/renewal-card.tsx");
    const desk = source("src/components/renewals/renewals-desk.tsx");
    const strip = source("src/components/renewals/renewals-health-strip.tsx");
    const drawer = source("src/components/renewals/renewal-compare-drawer.tsx");
    const chip = source("src/components/health/health-score-chip.tsx");
    expect(card).toMatch(/RenewalHealthMeter/);
    expect(card).toMatch(/RenewalCompareDrawer/);
    expect(card).not.toMatch(/HealthScoreChip/);
    expect(card).not.toMatch(/card\.clientHealth/);
    expect(desk).toMatch(/RenewalsHealthStrip/);
    expect(desk).toMatch(/rollupRenewalHealth/);
    expect(desk).toMatch(/roleHealthSummary/);
    expect(strip).toMatch(/data-ff-health-agent-rollups/);
    expect(strip).toMatch(/data-ff-health-mix/);
    expect(strip).toMatch(/Why/);
    expect(strip).not.toMatch(/retention/i);
    expect(drawer).toMatch(/data-ff-health-graphs/);
    expect(drawer).toMatch(/HealthFactorList/);
    expect(chip).toMatch(/Client health/);
    expect(chip).toMatch(/Policy health/);
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
