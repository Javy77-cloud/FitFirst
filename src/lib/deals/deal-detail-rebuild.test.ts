import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("deal detail rebuild checklist", () => {
  it("drops the standalone source field and issued-quote PDF block", () => {
    const page = source("src/app/deals/[id]/page.tsx");
    const docs = source("src/components/deal/documents-panel.tsx");
    expect(page).not.toMatch(/SourceSelect/);
    expect(page).toMatch(/Source ·/);
    expect(page).not.toMatch(/Save source/);
    expect(docs).not.toMatch(/Issued quote PDFs/);
    expect(docs).toMatch(/SourceDocsUpload/);
    expect(docs).toMatch(/MasterSheetCompare/);
    expect(docs).toMatch(/SheetApproveGate/);
    expect(docs).toMatch(/DeleteUploadedFileButton/);
  });

  it("pins quick comms to the sticky rail and collapses sheet health", () => {
    const page = source("src/app/deals/[id]/page.tsx");
    expect(page).toMatch(/data-ff-deal-quick-comms/);
    expect(page).toMatch(/QuickCommsBoard/);
    expect(page).toMatch(/lg:sticky/);
    expect(page).toMatch(/SheetHealthToggle/);
    expect(page).toMatch(/DealMotivation/);
    expect(page).not.toMatch(/deal-quick-actions/);
    const health = source("src/components/deal/sheet-health-toggle.tsx");
    expect(health).toMatch(/useState\(false\)/);
    expect(health).toMatch(/Sheet health/);
  });

  it("keeps markets as appetite / stretch / skip with a paid wall", () => {
    const markets = source("src/components/deal/markets-panel.tsx");
    expect(markets).toMatch(/Approve & request quotes/);
    expect(markets).toMatch(/Request stretch quotes/);
    expect(markets).toMatch(/ManualCarrierAdd/);
    expect(markets).toMatch(/PaidApiWall/);
    expect(markets).toMatch(/manual/);
  });

  it("does not add a carrier-history item to the sidebar catalog", () => {
    const nav = source("src/lib/desk/nav-catalog.ts");
    expect(nav).not.toMatch(/carrier-history/);
  });
});
