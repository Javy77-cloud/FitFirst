import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { AGENT_DEAL_TABS } from "./tabs";
import { fieldsForLine, homeFieldCount } from "@/lib/quote-sheet/catalog";
import { defaultProductForLine, productsForLine } from "@/lib/quote-sheet/products";
import { carriersForDealLine } from "./carriers-for-line";
import { resolveDealProduct } from "./deal-line";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("deal detail final rebuild", () => {
  it("keeps Deals as the header module label and the deal name in the page stack", () => {
    const page = source("src/app/deals/[id]/page.tsx");
    expect(page).toMatch(/title="Deals"/);
    expect(page).not.toMatch(/title=\{deal\.title\}/);
    expect(page).not.toMatch(/hideHeaderTitle/);
    expect(page).toMatch(/data-ff-deal-title/);
    expect(page).toMatch(/showBrand=\{false\}/);
    expect(page).toMatch(/utilityChrome/);
    expect(page).toMatch(/<h1[^>]*data-ff-deal-title[^>]*>\s*\{deal\.title\}/);
    expect(page).not.toMatch(/FitFirst/);
    expect(page).toMatch(/recordContext=\{\{/);
    expect(page).not.toMatch(/deal-quick-actions/);
  });

  it("keeps Deal Details first, then Documents, Markets, Quotes — no Quote Sheet", () => {
    expect(AGENT_DEAL_TABS).toEqual(["details", "documents", "markets", "quotes"]);
    const page = source("src/app/deals/[id]/page.tsx");
    expect(page).toMatch(/AGENT_DEAL_TABS/);
    expect(page).toMatch(/DealDetailsPanel/);
    expect(page).toMatch(/defaultValue="details"/);
    expect(page).not.toMatch(/QuoteSheetPanel/);
    expect(page).not.toMatch(/tab=quote-sheet/);
    expect(page).toMatch(/SectionTabs/);
    expect(page).toMatch(/data-ff-deal-flush-tabs/);
    expect(page).toMatch(/-mt-5/);
    expect(page).not.toMatch(/-mt-3/);
    expect(page).not.toMatch(/RecordDetailLayout/);
    expect(page.indexOf("data-ff-deal-flush-tabs")).toBeLessThan(page.lastIndexOf("<RecordDeveloperActions"));
    expect(page.indexOf("data-ff-deal-flush-tabs")).toBeLessThan(page.indexOf("banner="));
  });

  it("stacks deal title and tabs with no banner LOB chrome", () => {
    const page = source("src/app/deals/[id]/page.tsx");
    const docs = source("src/components/deal/documents-panel.tsx");
    expect(page).toMatch(/data-ff-deal-title/);
    expect(page).toMatch(/data-ff-deal-topband/);
    expect(page).toMatch(/data-ff-deal-top-left/);
    expect(page).toMatch(/data-ff-deal-right-rail/);
    expect(page).toMatch(/flex w-full/);
    expect(page).toMatch(/min-w-0 flex-1 space-y-1/);
    expect(page).not.toMatch(/lg:w-\[72%\]/);
    expect(page).toMatch(/w-\[400px\] min-w-\[400px\] max-w-\[400px\] shrink-0 overflow-x-hidden/);
    expect(page).toMatch(/data-ff-deal-quotes-corner/);
    expect(page).toMatch(/flex w-full min-w-0 max-w-full flex-col items-end/);
    expect(page).toMatch(/data-ff-deal-flush-tabs/);
    expect(page).not.toMatch(/DealLineSelector/);
    expect(page).not.toMatch(/RecordDetailLayout/);
    expect(page).not.toMatch(/data-ff-deal-identity/);
    expect(page).not.toMatch(/RelatedRecordNav/);
    expect(page).not.toMatch(/data-ff-deal-top-right/);
    expect(page).not.toMatch(/toolbar=/);
    expect(page).not.toMatch(/justify-end/);
    expect(page).not.toMatch(/StagePill/);
    expect(page).not.toMatch(/Source ·/);
    expect(page).not.toMatch(/sourceLabel/);
    expect(page.indexOf("data-ff-deal-top-left")).toBeLessThan(page.indexOf("data-ff-deal-title"));
    expect(page.indexOf("data-ff-deal-title")).toBeLessThan(page.indexOf("<SectionTabs"));
    expect(page.indexOf("<SectionTabs")).toBeLessThan(page.indexOf("data-ff-deal-right-rail"));
    expect(page.indexOf("data-ff-deal-right-rail")).toBeLessThan(page.indexOf("<SheetHealthToggle"));
    expect(page.indexOf("<SheetHealthToggle")).toBeLessThan(page.indexOf("<DealMotivation"));
    expect(page.indexOf("<DealMotivation")).toBeLessThan(page.indexOf("<RecordTags"));
    expect(page.indexOf("<RecordTags")).toBeLessThan(page.indexOf("data-ff-deal-quick-comms"));
    expect(source("src/components/tags/record-tags.tsx")).toMatch(/AssignRecordTags/);
    expect(source("src/components/tags/record-tags.tsx")).not.toMatch(/Manage tags/);
    expect(source("src/components/tags/record-tags.tsx")).not.toMatch(/Add a tag/);
    expect(source("src/components/tags/record-tags.tsx")).not.toMatch(/Save tags/);
    expect(page.indexOf("data-ff-deal-quick-comms")).toBeLessThan(page.indexOf("<RecordContextRail"));
    expect(page.indexOf("<SectionTabs")).toBeLessThan(page.indexOf("<DocumentsPanel"));
    expect(page.indexOf("<SectionTabs")).toBeLessThan(page.indexOf("<MarketsPanel"));
    expect(docs).not.toMatch(/DealLineSelector/);
    expect(page).toMatch(/panelClassName="mt-3"/);
    expect(docs).toMatch(/data-ff-deal-upload/);
    expect(docs).not.toMatch(/data-ff-deal-upload-split/);
    expect(docs).not.toMatch(/lg:grid-cols-\[minmax\(0,18rem\)/);
    expect(docs).not.toMatch(/grid-cols-/);
  });

  it("locks Documents upload full-width on top with the master sheet below", () => {
    const page = source("src/app/deals/[id]/page.tsx");
    const docs = source("src/components/deal/documents-panel.tsx");
    const upload = source("src/components/deal/source-docs-upload.tsx");
    const sheet = source("src/components/deal/master-sheet-compare.tsx");
    expect(page).not.toMatch(/DealLineSelector/);
    expect(docs).toMatch(/data-ff-deal-docs/);
    expect(docs).toMatch(/flex w-full flex-col/);
    expect(docs).toMatch(/data-ff-deal-upload/);
    expect(docs).toMatch(/data-ff-deal-docs-sheet/);
    expect(docs).toMatch(/className="w-full min-w-0" data-ff-deal-upload/);
    expect(docs).toMatch(/ff-card w-full/);
    expect(docs).not.toMatch(/data-ff-deal-upload-split/);
    expect(docs).not.toMatch(/lg:grid-cols-/);
    expect(docs).not.toMatch(/grid-cols-/);
    expect(docs).not.toMatch(/18rem/);
    expect(docs.indexOf("data-ff-deal-upload")).toBeLessThan(docs.indexOf("data-ff-deal-docs-sheet"));
    expect(docs.indexOf("data-ff-deal-upload")).toBeLessThan(docs.indexOf("<MasterSheetWorkspace"));
    expect(docs).toMatch(/SourceDocsUpload/);
    expect(docs).toMatch(/MasterSheetWorkspace/);
    expect(source("src/components/deal/master-sheet-compare.tsx")).toMatch(/SheetApproveGate/);
    expect(source("src/components/deal/master-sheet-compare.tsx")).toMatch(/persistSheet/);
    const gate = source("src/components/deal/sheet-approve-gate.tsx");
    expect(gate).toMatch(/I visually reviewed this master sheet\./);
    expect(gate).toMatch(/Confirm & request quotes/);
    expect(gate).not.toMatch(/: "Confirm sheet"/);
    expect(gate).not.toMatch(/Approve & request quotes/);
    expect(gate).toMatch(/disabled=\{!reviewed \|\| pending\}/);
    expect(gate).toMatch(/requestQuotes/);
    expect(docs).toMatch(/FileActionMenu/);
    expect(page.indexOf("<SectionTabs")).toBeLessThan(page.indexOf("<DocumentsPanel"));
    expect(docs.indexOf("<SourceFileRow")).toBeLessThan(docs.indexOf("<SourceDocsUpload"));
    expect(docs).toMatch(/deal-doc-row flex w-full/);
    expect(upload).toMatch(/Create/);
    expect(upload).toMatch(/\+ Add another document/);
    expect(upload).toMatch(/deal-doc-filename/);
    expect(upload).toMatch(/FileDeleteIcon/);
    expect(upload).toMatch(/deal-doc-row flex w-full/);
    expect(upload).not.toMatch(/row\.fileName \|\| rows\.length > 1/);
    expect(upload).not.toMatch(/className="ml-0"/);
    expect(upload).not.toMatch(/Add another file/);
    expect(sheet).toMatch(/name=\{fieldKey\}/);
    expect(sheet).toMatch(/Confirm/);
    expect(sheet).toMatch(/Save sheet/);
  });

  it("uses a rich HO sheet with shared applicant core and line scaffolds", () => {
    expect(homeFieldCount()).toBeGreaterThanOrEqual(90);
    const home = fieldsForLine("home", "homeowners").map((field) => field.key);
    expect(home).toEqual(expect.arrayContaining([
      "applicant_name",
      "applicant_phone",
      "applicant_email",
      "applicant_dob",
      "entity_type",
      "construction",
      "wind_mit_form",
      "four_point_date",
      "coverage_a",
    ]));
    expect(fieldsForLine("auto").map((field) => field.key)).toEqual(
      expect.arrayContaining(["vin", "driver_1_name", "driver_1_license"]),
    );
    const sheet = source("src/components/deal/master-sheet-compare.tsx");
    expect(sheet).toMatch(/RepeatableUnitBlocks/);
    expect(sheet).toMatch(/kind="vehicle"/);
    expect(sheet).toMatch(/kind="driver"/);
    expect(fieldsForLine("flood").map((field) => field.key)).toContain("flood_zone");
    expect(fieldsForLine("general_liability").map((field) => field.key)).toContain("class_code");
    expect(fieldsForLine("workers_comp").map((field) => field.key)).toContain("payroll");
    expect(productsForLine("home")).toEqual(["homeowners", "renters", "landlord"]);
    expect(defaultProductForLine("auto")).toBe("auto");
    expect(productsForLine("auto")).toEqual(["auto", "motorcycle", "commercial_auto"]);
  });

  it("filters manual carrier add to writers of this line", () => {
    const options = [
      { id: "ho", name: "Home Co", writtenLines: ["HO"] },
      { id: "flood", name: "Flood Co", writtenLines: ["FLOOD"] },
    ];
    expect(carriersForDealLine(options, "HO").map((row) => row.id)).toEqual(["ho"]);
    expect(carriersForDealLine(options, "FLOOD").map((row) => row.id)).toEqual(["flood"]);
    const markets = source("src/components/deal/markets-panel.tsx");
    const body = markets.slice(markets.indexOf("return ("));
    expect(body).toMatch(/In appetite|marketBucketLabel\("appetite"\)/);
    expect(body).toMatch(/Approve & request quotes/);
    expect(body).toMatch(/PaidApiWall/);
    expect(body).toMatch(/dealLine/);
    expect(body).toMatch(/data-ff-markets-empty/);
    expect(body.indexOf("data-ff-markets-empty")).toBeLessThan(body.indexOf("Approve & request quotes"));
    expect(body.indexOf("Approve & request quotes")).toBeLessThan(body.indexOf("<MarketTable"));
    expect(body.indexOf("<MarketTable")).toBeLessThan(body.lastIndexOf("<ManualCarrierAdd"));
  });

  it("removes in-desk signature from Documents", () => {
    const page = source("src/app/deals/[id]/page.tsx");
    expect(page).not.toMatch(/InDeskEsignPanel/);
    expect(page).not.toMatch(/getLatestInDeskEnvelope/);
    expect(page).not.toMatch(/In-desk signature/);
  });

  it("keeps deal-line helper defaults but drops banner LOB and sheet product chrome", () => {
    expect(resolveDealProduct({})).toBe("homeowners");
    const page = source("src/app/deals/[id]/page.tsx");
    expect(page).not.toMatch(/DealLineSelector/);
    const sheet = source("src/components/deal/master-sheet-compare.tsx");
    expect(sheet).not.toMatch(/data-ff-sheet-product/);
    expect(sheet).not.toMatch(/one product on this deal/);
    expect(sheet).not.toMatch(/SHEET_PRODUCT_LABELS/);
  });

  it("leaves Quotes empty until Markets returns rows", () => {
    const quotes = source("src/components/deal/quotes-panel.tsx");
    expect(quotes).toMatch(/data-ff-deal-quotes-empty/);
    expect(quotes).toMatch(/data-ff-quotes-empty/);
    expect(quotes).not.toMatch(/Quotes land here after Markets sends them back/);
    expect(quotes).not.toMatch(/border-dashed/);
    expect(quotes.indexOf("sorted.length === 0")).toBeLessThan(quotes.indexOf("Quote results"));
  });

  it("pins quick comms and keeps motivation in the corner", () => {
    const page = source("src/app/deals/[id]/page.tsx");
    expect(page).toMatch(/data-ff-deal-quick-comms/);
    expect(page).toMatch(/QuickCommsBoard/);
    expect(page).toMatch(/lg:sticky/);
    expect(page).toMatch(/DealMotivation/);
    expect(page).toMatch(/SheetHealthToggle/);
    expect(page).toMatch(/data-ff-deal-quotes-corner/);
    expect(page).toMatch(/flex w-full min-w-0 max-w-full flex-col items-end/);
    expect(page).not.toMatch(/lg:w-\[72%\]/);
    expect(page).toMatch(/w-\[400px\] min-w-\[400px\] max-w-\[400px\] shrink-0 overflow-x-hidden/);
    expect(page.indexOf("data-ff-deal-quotes-corner")).toBeLessThan(page.indexOf("<SheetHealthToggle"));
    expect(page.indexOf("data-ff-deal-top-left")).toBeLessThan(page.indexOf("<SectionTabs"));
    expect(page.indexOf("<SectionTabs")).toBeLessThan(page.indexOf("data-ff-deal-right-rail"));
    expect(page.indexOf("data-ff-deal-right-rail")).toBeLessThan(page.indexOf("<SheetHealthToggle"));
    expect(page.indexOf("<SheetHealthToggle")).toBeLessThan(page.indexOf("<DealMotivation"));
    expect(page).not.toMatch(/RelatedRecordNav/);
    expect(page).not.toMatch(/data-ff-deal-identity/);
    const comms = source("src/components/comms/quick-comms-board.tsx");
    expect(comms).toMatch(/ACTIVITY_KINDS/);
    expect(comms).toMatch(/ACTIVITY_KIND_LABEL/);
    expect(comms).toMatch(/task:|meeting:|call:|email:|sms:/);
  });

  it("does not add a carrier-history item to the sidebar catalog", () => {
    const nav = source("src/lib/desk/nav-catalog.ts");
    expect(nav).not.toMatch(/carrier-history/);
    const css = source("src/app/globals.css");
    expect(css).toContain("--ff-sidebar: #1d4e89;");
  });
});
