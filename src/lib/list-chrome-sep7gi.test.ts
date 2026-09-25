import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("sep7gi remove Edit Layout from list chrome", () => {
  it("drops Edit Layout from ListMassBar (Deals/Pipeline and other CRM lists)", () => {
    const mass = source("src/components/developer-hub/list-selection.tsx");
    expect(mass).toMatch(/data-testid="list-selection-bar"/);
    expect(mass).toMatch(/data-ff-list-chrome/);
    expect(mass).not.toMatch(/EditLayoutLink/);
    expect(mass).not.toMatch(/isFieldLayoutModule/);
    expect(mass).not.toMatch(/edit-layout-link/);
  });

  it("keeps Edit Layout inside the Deal Details Pipeline section (not the tab row)", () => {
    const page = source("src/app/deals/[id]/page.tsx");
    const panel = source("src/components/custom-fields/deal-details-panel.tsx");
    expect(page).toMatch(/id === "details"[\s\S]*<DealDetailsPanel/);
    expect(panel).toMatch(/data-ff-deal-section="pipeline"/);
    expect(panel).toMatch(/data-ff-pipeline-edit-layout/);
    expect(panel).toMatch(/<EditLayoutLink module="deals" line=\{line\} \/>/);
    expect(page).not.toMatch(/toolbar=\{activeTab === "details"/);
    expect(page).not.toMatch(/EditLayoutLink/);
  });

  it("keeps Columns / ⋯ list chrome placement", () => {
    expect(source("src/components/developer-hub/list-selection.tsx")).toMatch(/data-ff-list-chrome/);
    expect(source("src/components/lists/column-table.tsx")).toMatch(/ListColumnsChrome/);
    expect(source("src/components/pipeline/workspace.tsx")).toMatch(/data-ff-list-chrome/);
  });
});
