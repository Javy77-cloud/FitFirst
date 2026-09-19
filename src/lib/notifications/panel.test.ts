import { describe, expect, it } from "vitest";
import {
  commitmentNudgeUrgency,
  commitmentNudgeWhy,
  groupPanelByUrgency,
  isOvernightDecline,
  isRenewalSilenceWindow,
  isRenewalSilent,
  PANEL_KIND_LABEL,
  PANEL_SIGNAL_KINDS,
  quoteDeclinedUrgency,
  quoteDeclinedWhy,
  renewalSilenceUrgency,
  renewalSilenceWhy,
  sortPanelCards,
  staleDocsUrgency,
  staleDocsWhy,
  type PanelCard,
} from "./panel";

const asOf = new Date("2026-09-19T13:00:00.000Z");

function card(partial: Partial<PanelCard> & Pick<PanelCard, "key" | "urgency">): PanelCard {
  return {
    kind: "quote_declined",
    entityLine: "Client · HO3",
    why: "why",
    primary: { id: "open", label: "Open" },
    href: "/deals/d1",
    entityType: "deal",
    entityId: "d1",
    deadline: null,
    source: "live",
    ...partial,
  };
}

describe("notification panel signals", () => {
  it("rates a decline with no remaining markets as High", () => {
    expect(quoteDeclinedUrgency(0)).toBe("high");
    expect(quoteDeclinedUrgency(3)).toBe("medium");
    expect(
      quoteDeclinedWhy({
        carrierName: "Travelers",
        declinedAt: new Date("2026-09-19T06:14:00.000Z"),
        remainingMarkets: 3,
      }),
    ).toMatch(/Declined by Travelers/);
    expect(
      quoteDeclinedWhy({
        carrierName: "Travelers",
        declinedAt: new Date("2026-09-19T06:14:00.000Z"),
        remainingMarkets: 0,
      }),
    ).toMatch(/no carriers left/);
  });

  it("treats last-18-hour declines as overnight", () => {
    expect(isOvernightDecline(new Date("2026-09-19T02:00:00.000Z"), asOf)).toBe(true);
    expect(isOvernightDecline(new Date("2026-09-18T12:00:00.000Z"), asOf)).toBe(false);
    expect(isOvernightDecline(new Date("2026-09-19T15:00:00.000Z"), asOf)).toBe(false);
  });

  it("flags ~45-day renewals with 7+ days of silence", () => {
    expect(isRenewalSilenceWindow(45)).toBe(true);
    expect(isRenewalSilenceWindow(20)).toBe(false);
    expect(isRenewalSilenceWindow(60)).toBe(false);
    expect(isRenewalSilent(null, asOf)).toBe(true);
    expect(isRenewalSilent(new Date("2026-09-10T13:00:00.000Z"), asOf)).toBe(true);
    expect(isRenewalSilent(new Date("2026-09-18T13:00:00.000Z"), asOf)).toBe(false);
    expect(renewalSilenceUrgency(22)).toBe("high");
    expect(renewalSilenceUrgency(45)).toBe("medium");
    expect(renewalSilenceWhy({ daysUntil: 45, lastOutreachAt: null, asOf })).toMatch(/no outreach/);
  });

  it("names Renewal Autopilot as a live panel kind", () => {
    expect(PANEL_KIND_LABEL.renewal_autopilot).toMatch(/Autopilot/);
    expect(PANEL_SIGNAL_KINDS).toContain("renewal_autopilot");
  });

  it("rates expired and long-quiet docs as High", () => {
    expect(staleDocsUrgency({ expired: true, daysQuiet: 2, daysToExpiry: -3 })).toBe("high");
    expect(staleDocsUrgency({ expired: false, daysQuiet: 4, daysToExpiry: 12 })).toBe("medium");
    expect(staleDocsWhy({ label: "ID card", expired: true, daysQuiet: 3, daysToExpiry: -2 })).toMatch(
      /expired 2 days/,
    );
    expect(staleDocsWhy({ label: "Dec", expired: false, daysQuiet: 5, daysToExpiry: null })).toMatch(
      /5 days without upload/,
    );
  });

  it("nudges promises only when due soon or overdue", () => {
    expect(commitmentNudgeUrgency(new Date("2026-09-19T10:00:00.000Z"), asOf)).toBe("high");
    expect(commitmentNudgeUrgency(new Date("2026-09-21T06:00:00.000Z"), asOf)).toBe("medium");
    expect(commitmentNudgeUrgency(new Date("2026-09-25T13:00:00.000Z"), asOf)).toBeNull();
    expect(commitmentNudgeWhy({ title: "Call Friday", dueAt: new Date("2026-09-18T13:00:00.000Z"), asOf })).toMatch(
      /overdue/,
    );
  });

  it("sorts High → Medium → Low then soonest deadline", () => {
    const sorted = sortPanelCards([
      card({ key: "l", urgency: "low", deadline: new Date("2026-09-20") }),
      card({ key: "h2", urgency: "high", deadline: new Date("2026-09-22") }),
      card({ key: "h1", urgency: "high", deadline: new Date("2026-09-19") }),
      card({ key: "m", urgency: "medium", deadline: new Date("2026-09-21") }),
    ]);
    expect(sorted.map((row) => row.key)).toEqual(["h1", "h2", "m", "l"]);
    const groups = groupPanelByUrgency(sorted);
    expect(groups.high.map((row) => row.key)).toEqual(["h1", "h2"]);
    expect(groups.medium).toHaveLength(1);
    expect(groups.low).toHaveLength(1);
  });
});
