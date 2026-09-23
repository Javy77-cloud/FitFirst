import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  TERM_START_KIND,
  isRenewalTermStartCandidate,
  isSameUtcDay,
  termStartCompareHref,
  termStartEntityLine,
  termStartKey,
  termStartPrimaryLabel,
  termStartUrgency,
  termStartWhy,
  termYearLabel,
} from "./term-start";
import { PANEL_SIGNAL_KINDS } from "./panel";
import { panelLaneForKind } from "./lanes";

const asOf = new Date("2026-10-01T16:00:00.000Z");

describe("day-of renewal term-start", () => {
  it("registers as an Inbox panel kind", () => {
    expect(PANEL_SIGNAL_KINDS).toContain(TERM_START_KIND);
    expect(panelLaneForKind(TERM_START_KIND)).toBe("inbox");
  });

  it("fires only on the term effective day for renewals", () => {
    const today = new Date("2026-10-01T12:00:00.000Z");
    const yesterday = new Date("2025-10-01T12:00:00.000Z");
    expect(
      isRenewalTermStartCandidate({
        termEffective: today,
        asOf,
        hasPriorTerm: true,
        originalEffectiveDate: yesterday,
      }),
    ).toBe(true);
    expect(
      isRenewalTermStartCandidate({
        termEffective: today,
        asOf,
        hasPriorTerm: false,
        originalEffectiveDate: yesterday,
      }),
    ).toBe(true);
    // Brand-new business (same original effective) — no prior — skip.
    expect(
      isRenewalTermStartCandidate({
        termEffective: today,
        asOf,
        hasPriorTerm: false,
        originalEffectiveDate: today,
      }),
    ).toBe(false);
    expect(
      isRenewalTermStartCandidate({
        termEffective: today,
        asOf,
        hasPriorTerm: false,
        originalEffectiveDate: null,
      }),
    ).toBe(false);
    // Wrong day.
    expect(
      isRenewalTermStartCandidate({
        termEffective: new Date("2026-10-02T12:00:00.000Z"),
        asOf,
        hasPriorTerm: true,
        originalEffectiveDate: yesterday,
      }),
    ).toBe(false);
  });

  it("is idempotent per policy + term day", () => {
    const day = new Date("2026-10-01T12:00:00.000Z");
    const a = termStartKey("pol-1", day);
    const b = termStartKey("pol-1", day);
    const nextYear = termStartKey("pol-1", new Date("2027-10-01T12:00:00.000Z"));
    expect(a).toBe("renewal_term_started:pol-1:2026-10-01");
    expect(a).toBe(b);
    expect(nextYear).toBe("renewal_term_started:pol-1:2027-10-01");
    expect(a).not.toBe(nextYear);
    expect(isSameUtcDay(day, asOf)).toBe(true);
  });

  it("builds Compare deep link and awareness copy", () => {
    expect(termStartCompareHref("pol-9")).toBe("/policies/pol-9/compare");
    expect(termYearLabel(new Date("2026-10-01T12:00:00.000Z"), new Date("2027-10-01T12:00:00.000Z"))).toBe(
      "2026–27",
    );
    expect(termYearLabel(new Date("2026-01-01T12:00:00.000Z"), new Date("2026-12-31T12:00:00.000Z"))).toBe(
      "2026",
    );
    expect(termStartWhy({ carrierName: "Heritage", termLabel: "2026–27" })).toBe(
      "Heritage 2026–27 term started today",
    );
    expect(termStartEntityLine({ insuredName: "Ruiz, Camila", lineOfBusiness: "HO3" })).toBe(
      "Ruiz, Camila · HO3",
    );
    expect(termStartPrimaryLabel()).toBe("Open Compare");
    expect(termStartUrgency()).toBe("medium");
  });

  it("is loaded by the panel sweep and deep-linked from header alerts", () => {
    const loadPanel = readFileSync("src/lib/notifications/load-panel.ts", "utf8");
    const header = readFileSync("src/lib/desk/header-alerts.ts", "utf8");
    const panel = readFileSync("src/lib/notifications/panel.ts", "utf8");
    expect(loadPanel).toMatch(/loadTermStartSignals/);
    expect(header).toMatch(/renewal_term_started/);
    expect(header).toMatch(/\/compare/);
    expect(panel).toMatch(/renewal_term_started/);
    expect(panel).toMatch(/Term started today/);
  });
});
