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
    const factors = source("src/components/health/health-factor-list.tsx");
    expect(card).toMatch(/RenewalHealthMeter/);
    expect(card).toMatch(/RenewalCompareDrawer/);
    expect(card).toMatch(/clientHealth=\{card\.clientHealth\}/);
    expect(card).toMatch(/policyHealth=\{card\.policyHealth\}/);
    expect(card).toMatch(/data-ff-client-health-band/);
    expect(card).toMatch(/HealthWhyBadge/);
    expect(card).toMatch(/extraHealth=\{card\.policyHealth\}/);
    expect(card).not.toMatch(/HealthScoreChip/);
    expect(strip).toMatch(/HealthWhyPanel/);
    expect(chip).toMatch(/HealthWhyPanel/);
    expect(source("src/components/health/health-why-popover.tsx")).toMatch(/createPortal/);
    expect(source("src/components/health/health-why-popover.tsx")).toMatch(/document\.body/);
    expect(source("src/app/globals.css")).toMatch(/ff-health-breakdown-portal/);
    expect(source("src/app/globals.css")).toMatch(/overscroll-behavior:\s*contain/);
    expect(board).toMatch(/clientHealth\.why/);
    expect(board).toMatch(/clientHealth\.band/);
    expect(desk).toMatch(/RenewalsHealthStrip/);
    expect(desk).toMatch(/rollupRenewalHealth/);
    expect(strip).toMatch(/data-ff-health-agent-rollups/);
    expect(strip).not.toMatch(/retention/i);
    expect(drawer).toMatch(/data-ff-health-graphs/);
    expect(drawer).toMatch(/HealthFactorList/);
    expect(chip).toMatch(/Talk history|Client health|HealthWhyPanel/);
    expect(factors).toMatch(/Talk history|Client health/);
    expect(chip).not.toMatch(/retention/i);
    expect(factors).not.toMatch(/retention/i);
  });

  it("hosts the 1–5 mini-review after locked moments", () => {
    const host = source("src/components/app-shell.tsx");
    const prompt = source("src/components/health/review-prompt.tsx");
    const pending = source("src/lib/health/pending-review.ts");
    const reviewHost = source("src/components/health/review-prompt-host.tsx");
    expect(host).toMatch(/ExperienceReviewHost/);
    expect(prompt).toMatch(/data-ff-review-star/);
    expect(prompt).toMatch(/10-second pulse/);
    expect(prompt).not.toMatch(/Save rating/);
    expect(pending).toMatch(/renewal_close/);
    expect(pending).toMatch(/logged_call/);
    expect(pending).toMatch(/claim_wrap/);
    expect(pending).toMatch(/moment: "bind"/);
    expect(pending).toMatch(/REVIEW_EVENT/);
    expect(pending).not.toMatch(/logged_email/);
    expect(pending).toMatch(/function asDate/);
    expect(pending).toMatch(/loadPendingReviewPromptUnsafe/);
    expect(reviewHost).toMatch(/try \{/);
    expect(reviewHost).toMatch(/return null;/);
    const write = source("src/app/actions/health-reviews.ts");
    expect(write).toMatch(/Could not save that pulse/);
    expect(write).toMatch(/441 the desk when a Pulse rate is chosen/);
    expect(prompt).toMatch(/Could not save that pulse/);
  });

  it("keeps a cream desk recovery page so RSC throws are not a black Next error screen", () => {
    const pageError = source("src/app/error.tsx");
    expect(pageError).toMatch(/bg-background/);
    expect(pageError).toMatch(/This desk page could not load/);
    expect(pageError).toMatch(/href="\/"/);
  });
});
