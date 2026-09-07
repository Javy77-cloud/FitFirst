import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { AGENT_DEAL_TAB_LABELS, AGENT_DEAL_TABS, parseAgentDealTab } from "./tabs";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("Deal Details tab", () => {
  it("is first and the default Deal tab", () => {
    expect(AGENT_DEAL_TABS).toEqual(["details", "documents", "markets", "quotes"]);
    expect(AGENT_DEAL_TAB_LABELS.details).toBe("Deal Details");
    expect(parseAgentDealTab(undefined)).toBe("details");
    expect(parseAgentDealTab("")).toBe("details");
    const page = source("src/app/deals/[id]/page.tsx");
    expect(page).toMatch(/DealDetailsPanel/);
    expect(page).toMatch(/defaultValue="details"/);
    expect(page.indexOf('"details"')).toBeLessThan(page.indexOf('"documents"'));
  });

  it("mirrors the lead two-column desk and allows inline add/delete/relabel", () => {
    const panel = source("src/components/custom-fields/deal-details-panel.tsx");
    expect(panel).toMatch(/data-ff-deal-details-layout="two-col"/);
    expect(panel).toMatch(/grid-cols-\[minmax\(0,2fr\)_minmax\(0,3fr\)\]/);
    expect(panel).toMatch(/data-ff-inline-label/);
    expect(panel).toMatch(/Add field/);
    expect(panel).toMatch(/Add section/);
    expect(panel).toMatch(/Delete section/);
    expect(panel).toMatch(/Open field builder/);
  });
});
