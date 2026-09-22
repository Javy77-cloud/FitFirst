import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { radarDesk } from "@/lib/deals/radar-glance";
import { stackMidLine } from "@/lib/desk/stack-mid";
import { leadSourceGlance } from "@/lib/leads/source-glance";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("activity board and radar glance", () => {
  it("keeps a stack center line to two cues", () => {
    expect(stackMidLine(["4 days silent", "Next quote", "extra"])).toBe("4 days silent · Next quote");
    expect(stackMidLine(["", null, "Chase the first call"])).toBe("Chase the first call");
  });

  it("names the leading sources without listing the whole catalog", () => {
    const glance = leadSourceGlance([
      "referral",
      "referral",
      "referral",
      "facebook",
      "website",
      "google",
      null,
    ]);
    expect(glance.total).toBe(7);
    expect(glance.leader?.label).toBe("Referral");
    expect(glance.top.map((row) => row.label)).toEqual(["Referral", "Facebook", "Google"]);
    expect(glance.top).toHaveLength(3);
  });

  it("counts heat, silence bands, and a real touch trend", () => {
    const glance = radarDesk([
      { heat: "hot", silenceDays: 1, spark: [0, 1, 2], phase: "quotes", quoteSent: true },
      { heat: "cold", silenceDays: 16, spark: [2, 1, 0], phase: "docs" },
      { heat: "cooling", silenceDays: 5, spark: [1, 1, 1], phase: "quotes" },
      { heat: "near_cold", silenceDays: 9, spark: [0, 0, 1] },
    ]);
    expect(glance.total).toBe(4);
    expect(glance.counts).toEqual({ hot: 1, cooling: 1, near_cold: 1, cold: 1 });
    expect(glance.medianSilence).toBe(7);
    expect(glance.silence.map((band) => [band.id, band.count])).toEqual([
      ["talking", 1],
      ["week", 1],
      ["quiet", 1],
      ["silent", 1],
    ]);
    expect(glance.trend).toEqual([3, 3, 4]);
    expect(glance.touches).toBe(10);
    const month = Array.from({ length: 30 }, (_, index) => (index < 16 ? 10 : 1));
    const monthGlance = radarDesk([{ heat: "hot", silenceDays: 1, spark: month }]);
    expect(monthGlance.trend).toHaveLength(30);
    expect(monthGlance.touches).toBe(14);
    expect(glance.quoteSent).toBe(1);
    expect(glance.phases.find((row) => row.phase === "quotes")?.count).toBe(2);
  });

  it("uses the 320px Quick Comms board and drops the Comms word and the thin strip", () => {
    const panel = source("src/components/desk/standard-activity-panel.tsx");
    const leads = source("src/app/leads/page.tsx");
    const deals = source("src/components/deals/deals-command-workspace.tsx");
    const renewals = source("src/components/renewals/renewals-filtered-views.tsx");
    const stack = source("src/components/leads/leads-priority-stack.tsx");
    const css = source("src/app/globals.css");
    expect(panel).toMatch(/QuickCommsBoard/);
    expect(panel).toMatch(/data-ff-deal-rail-lock=\{ACTIVITY_RAIL_LOCK\}/);
    expect(panel).toMatch(/ACTIVITY_RAIL_ASIDE_CLASS/);
    expect(panel).toMatch(/rows\[0\]\?\.id/);
    expect(panel).not.toMatch(/>Comms</);
    expect(leads).toMatch(/data-ff-leads-list-layout="list-rail"/);
    expect(leads).toMatch(/LeadQuickComms/);
    expect(leads).toMatch(/ActivityGlyph/);
    expect(deals).toMatch(/StandardActivityShell/);
    expect(renewals).toMatch(/StandardActivityShell/);
    expect(renewals).toMatch(/surface="renewals-list"/);
    expect(deals).toMatch(/surface="deals-list"/);
    expect(stack).toMatch(/ActivityGlyph/);
    expect(stack).not.toMatch(/StackQuickComms|>Comms</);
    expect(source("src/components/deals/deals-host-list.tsx")).toMatch(/ActivityGlyph/);
    expect(source("src/components/deals/deals-host-list.tsx")).not.toMatch(/>Comms</);
    expect(source("src/components/renewals/renewals-host-list.tsx")).toMatch(/ActivityGlyph/);
    expect(css).toMatch(/--ff-activity-rail: 400px/);
    expect(css).toMatch(/grid-template-columns: minmax\(0, 1fr\) var\(--ff-activity-rail\)/);
    expect(source("src/components/deals/deals-command-workspace.tsx")).toMatch(/surface="deals-stack"/);
    expect(renewals).toMatch(/surface="renewals-stack"/);
    expect(source("src/components/deals/priority-stack.tsx")).toMatch(/ActivityGlyph/);
    expect(source("src/components/renewals/renewals-priority-stack.tsx")).toMatch(/ActivityGlyph/);
    expect(css).toMatch(/--ff-inbox-open-edge: var\(--ff-red\)/);
    expect(css).toMatch(/\.ff-inbox-detail \{[\s\S]*border-left: 4px solid var\(--ff-inbox-open-edge\)/);
    expect(css).toMatch(/\.ff-inbox-row\.is-selected \{[^}]*var\(--ff-inbox-open-edge\)/);
    expect(css).not.toMatch(/ff-radar-strip/);
    expect(css).not.toMatch(/ff-list-comms/);
    expect(css).toMatch(/ff-radar-banner/);
    expect(css).toMatch(/ff-radar-bars/);
    expect(css).toMatch(/\.ff-inbox-row\.is-read \{[^}]*#f1efeb/);
    expect(css).toMatch(/\.ff-inbox-row\.is-unread \{[^}]*#fff/);
    expect(css).toMatch(/\.ff-inbox-row:hover \{[^}]*box-shadow/);
    expect(css).not.toMatch(/\.ff-inbox-row\.is-read:hover \{[^}]*background/);
    expect(css).toMatch(/\.ff-inbox-row\.is-selected \{[^}]*#dae8fb/);
  });
});
