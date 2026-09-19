import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("sep7gl — remove list Attach documents panel; keep Actions", () => {
  it("drops DealDocsUpload from every Deals/Pipeline list filter view (shared page)", () => {
    const page = source("src/app/deals/page.tsx");
    expect(page).not.toMatch(/DealDocsUpload/);
    expect(page).not.toMatch(/deal-docs-upload/);
    expect(page).not.toMatch(/deal-attach-slot/);
    expect(page).not.toMatch(/listDealLookup/);
    expect(page).not.toMatch(/listPartyTypeahead/);
    // One page drives All / P&C / Health / Life / Won / Lost / Archived filters
    expect(page).toMatch(/loadDealPipelineDesk/);
    expect(page).toMatch(/DealWorkspaceBar/);
  });

  it("keeps Today's Activity as a floating corner bubble", () => {
    const page = source("src/app/deals/page.tsx");
    expect(page).not.toMatch(/deal-upload-activity/);
    expect(page).not.toMatch(/deal-today-slot/);
    expect(page).toMatch(/<TodayActivityCorner/);
    expect(source("src/components/deals/today-activity-strip.tsx")).toMatch(/deal-today-chips/);
    expect(source("src/components/desk/today-activity-corner.tsx")).toMatch(/data-ff-today-activity-corner/);
  });

  it("keeps Actions → Attach document with locked deal (sep7gk)", () => {
    const menu = source("src/components/lists/selection-actions-menu.tsx");
    expect(menu).toMatch(/attach_document/);
    expect(menu).toMatch(/DealDocsUpload/);
    expect(menu).toMatch(/lockedDeal/);
    expect(menu).toMatch(/deal-attach-from-actions/);
  });

  it("keeps DealDocsUpload component for Actions / detail flows", () => {
    const upload = source("src/components/deal/deal-docs-upload.tsx");
    expect(upload).toMatch(/lockedDeal/);
    expect(upload).toMatch(/Attach documents to a deal/);
    expect(upload).toMatch(/data-testid="deal-docs-upload"/);
  });
});
