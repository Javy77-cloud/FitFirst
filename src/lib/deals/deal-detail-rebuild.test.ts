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
    expect(page).toMatch(/<h1[^>]*data-ff-deal-title[^>]*>\s*\{visibleDealTitle\}/);
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
    expect(page).not.toMatch(/RecordDeveloperActions/);
    expect(page).not.toMatch(/WidgetHost/);
    expect(page).not.toMatch(/listEnabledMacrosFor/);
    expect(page).not.toMatch(/listVisibleButtons/);
    expect(page).not.toMatch(/listEnabledWidgetsByType/);
    expect(page).not.toMatch(/relatedWidgets/);
    expect(page.indexOf("data-ff-deal-flush-tabs")).toBeLessThan(page.indexOf("banner="));
  });

  it("stacks deal title and tabs with no banner LOB chrome", () => {
    const page = source("src/app/deals/[id]/page.tsx");
    const docs = source("src/components/deal/documents-panel.tsx");
    expect(page).toMatch(/data-ff-deal-title/);
    expect(page).toMatch(/data-ff-deal-topband/);
    expect(page).toMatch(/data-ff-deal-top-left/);
    expect(source("src/components/section-tabs.tsx")).toMatch(/data-ff-deal-right-rail/);
    expect(page).toMatch(/flex w-full/);
    expect(page).toMatch(/min-w-0 flex-1/);
    expect(page).not.toMatch(/lg:w-\[72%\]/);
    expect(source("src/components/section-tabs.tsx")).toMatch(/data-ff-deal-rail-lock=\{ACTIVITY_RAIL_LOCK\}/);
    expect(source("src/components/section-tabs.tsx")).toMatch(/ACTIVITY_RAIL_COLUMNS/);
    expect(source("src/app/globals.css")).toMatch(/width: var\(--ff-activity-rail\) !important;/);
    expect(page).toMatch(/data-ff-deal-quotes-corner/);
    expect(page).toMatch(/data-ff-deal-quotes-corner/);
    expect(page).toMatch(/data-ff-deal-flush-tabs/);
    expect(page).not.toMatch(/DealLineSelector/);
    expect(page).not.toMatch(/RecordDetailLayout/);
    expect(page).not.toMatch(/data-ff-deal-identity/);
    expect(page).not.toMatch(/RelatedRecordNav/);
    expect(page).not.toMatch(/data-ff-deal-top-right/);
    expect(page).toMatch(/toolbar=/);
    expect(page).not.toMatch(/justify-end/);
    expect(page).not.toMatch(/StagePill/);
    expect(page).not.toMatch(/Source ·/);
    expect(page).not.toMatch(/sourceLabel/);
    expect(page.indexOf("data-ff-deal-top-left")).toBeLessThan(page.indexOf("data-ff-deal-title"));
    expect(page.indexOf("data-ff-deal-title")).toBeLessThan(page.indexOf("<SectionTabs"));
    expect(source("src/components/section-tabs.tsx")).toMatch(/data-ff-deal-quotes-corner/);
    expect(page).not.toMatch(/<DealMotivation/);
    expect(page).toMatch(/<DealRailCharts/);
    expect(page.indexOf("<SectionTabs")).toBeLessThan(page.indexOf("<DealRailCharts"));
    expect(page).toMatch(/sidePanel=/);
    expect(page).not.toMatch(/<RecordTags/);
    expect(page.indexOf("data-ff-deal-quick-comms")).toBeLessThan(page.indexOf("<RecordContextRail"));
    expect(page.indexOf("<SectionTabs")).toBeLessThan(page.indexOf("<DocumentsPanel"));
    expect(page.indexOf("<SectionTabs")).toBeLessThan(page.indexOf("<MarketsPanel"));
    expect(docs).not.toMatch(/DealLineSelector/);
    expect(page).toMatch(/panelClassName="mt-0"/);
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
    expect(docs).toMatch(/Document Upload/);
    expect(docs).toMatch(/data-ff-document-upload/);
    expect(docs).not.toMatch(/max-w-3xl/);
    expect(docs).toMatch(/Deal Document Library/);
    expect(docs).toMatch(/ChevronUp/);
    expect(docs).toMatch(/ChevronDown/);
    expect(docs).not.toMatch(/>Upload</);
    expect(docs).not.toMatch(/Deal library/);
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
    expect(gate).toMatch(/I visually reviewed this Risk Profile\./i);
    expect(gate).toMatch(/\{pending \? "Confirming…" : "Confirm"\}/);
    expect(gate).not.toMatch(/Confirm & Request Quotes/);
    expect(gate).not.toMatch(/Approve & Request Quotes/);
    expect(gate).toMatch(/disabled=\{!reviewed \|\| pending\}/);
    expect(gate).toMatch(/action=\{approveMasterSheet\}/);
    expect(gate).not.toMatch(/requestQuotes/);
    expect(gate).not.toMatch(/catch \(/);
    expect(docs).toMatch(/FileActionMenu/);
    expect(page.indexOf("<SectionTabs")).toBeLessThan(page.indexOf("<DocumentsPanel"));
    expect(docs.indexOf("<SourceFileRow")).toBeLessThan(docs.indexOf("<SourceDocsUpload"));
    expect(docs).toMatch(/deal-doc-row flex w-full/);
    expect(upload).toMatch(/Save files/);
    expect(upload).not.toMatch(/>\s*Create\s*</);
    expect(upload).toMatch(/\+ Add another document/);
    expect(upload).toMatch(/deal-doc-filename/);
    expect(upload).toMatch(/FileDeleteIcon/);
    expect(upload).toMatch(/deal-doc-row flex w-full/);
    expect(upload).not.toMatch(/row\.fileName \|\| rows\.length > 1/);
    expect(upload).not.toMatch(/className="ml-0"/);
    expect(upload).not.toMatch(/Add another file/);
    expect(sheet).toMatch(/name=\{fieldKey\}/);
    expect(sheet).toMatch(/Confirm/);
    expect(sheet).toMatch(/Save Risk Profile/);
  });

  it("uses a rich HO sheet with product scaffolds (identity stays on Deal Details)", () => {
    expect(homeFieldCount()).toBeGreaterThanOrEqual(90);
    const home = fieldsForLine("home", "homeowners").map((field) => field.key);
    expect(home).toEqual(expect.arrayContaining([
      "construction",
      "wind_mit_form",
      "four_point_date",
      "coverage_a",
      "new_purchase",
    ]));
    expect(home).not.toContain("applicant_name");
    expect(home).not.toContain("entity_type");
    expect(fieldsForLine("auto").map((field) => field.key)).toEqual(
      expect.arrayContaining(["vin", "driver_1_name", "driver_1_license"]),
    );
    const sheet = source("src/components/deal/master-sheet-compare.tsx");
    expect(sheet).toMatch(/RepeatableUnitBlocks/);
    expect(sheet).toMatch(/kind="vehicle"/);
    expect(sheet).toMatch(/kind="driver"/);
    expect(fieldsForLine("flood").map((field) => field.key)).toContain("flood_zone");
    expect(fieldsForLine("general_liability").map((field) => field.key)).toContain("class_code");
    expect(fieldsForLine("workers_comp").map((field) => field.key)).toContain("coverage_lines");
    expect(fieldsForLine("workers_comp").map((field) => field.key)).toContain("class_code");
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
    expect(body).toMatch(/Request Quotes/);
    expect(body).toMatch(/PaidApiWall/);
    expect(body).toMatch(/dealLine/);
    expect(body).toMatch(/data-ff-markets-empty/);
    expect(body.indexOf("data-ff-markets-empty")).toBeLessThan(body.indexOf("Request Quotes"));
    expect(body.indexOf("Request Quotes")).toBeLessThan(body.indexOf("<MarketsSelectTable"));
    expect(body.indexOf("<MarketsSelectTable")).toBeLessThan(body.lastIndexOf("<ManualCarrierAdd"));
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
    expect(quotes).toMatch(/Go to Markets/);
    expect(quotes).not.toMatch(/Quotes land here after Markets sends them back/);
    expect(quotes).not.toMatch(/border-dashed/);
    expect(quotes.indexOf("sorted.length === 0")).toBeLessThan(quotes.indexOf("<QuotesResultsTable"));
  });

  it("pins quick comms and keeps motivation in the corner", () => {
    const page = source("src/app/deals/[id]/page.tsx");
    expect(page).toMatch(/data-ff-deal-quick-comms/);
    expect(page).toMatch(/QuickCommsBoard/);
    expect(page).toMatch(/DealRailCharts/);
    expect(page).not.toMatch(/DealMotivation/);
    expect(page).not.toMatch(/DealQuoteCloseChart/);
    expect(page).not.toMatch(/Monthly momentum/);
    expect(page).not.toMatch(/Quotes to bound/);
    expect(source("src/components/section-tabs.tsx")).toMatch(/data-ff-deal-quotes-corner/);
    expect(page).not.toMatch(/lg:w-\[72%\]/);
    expect(source("src/components/section-tabs.tsx")).toMatch(/data-ff-deal-rail-lock=\{ACTIVITY_RAIL_LOCK\}/);
    expect(source("src/components/section-tabs.tsx")).toMatch(/ACTIVITY_RAIL_COLUMNS/);
    expect(source("src/app/globals.css")).toMatch(/width: var\(--ff-activity-rail\) !important;/);
    expect(page.indexOf("data-ff-deal-top-left")).toBeLessThan(page.indexOf("<SectionTabs"));
    expect(page.indexOf("<SectionTabs")).toBeLessThan(page.indexOf("<DealRailCharts"));
    expect(page).toMatch(/sidePanel=/);
    expect(source("src/components/section-tabs.tsx")).toMatch(/data-ff-deal-right-rail/);
    expect(source("src/components/section-tabs.tsx")).toMatch(/sidePanel/);
    expect(page).not.toMatch(/RelatedRecordNav/);
    expect(page).not.toMatch(/data-ff-deal-identity/);
    const comms = source("src/components/comms/quick-comms-board.tsx");
    expect(comms).toMatch(/ACTIVITY_KINDS/);
    expect(comms).toMatch(/ACTIVITY_KIND_LABEL/);
    expect(comms).toMatch(/task:|meeting:|call:|email:|sms:/);
    expect(comms).toMatch(/flex-nowrap/);
  });

  it("keeps the deal title and tabs without Developer Hub record chrome", () => {
    const page = source("src/app/deals/[id]/page.tsx");
    expect(page).toMatch(/<h1[^>]*data-ff-deal-title[^>]*>\s*\{visibleDealTitle\}/);
    expect(page).toMatch(/AGENT_DEAL_TABS/);
    expect(page).not.toMatch(/RecordDeveloperActions/);
    expect(page).not.toMatch(/WidgetHost/);
    expect(page).not.toMatch(/Run Macro/);
    expect(page).not.toMatch(/Open property map/);
    expect(page).not.toMatch(/Open related widget/);
    expect(page).not.toMatch(/relatedWidgets/);
    expect(page).toMatch(/<DealDetailsPanel/);
    expect(page).toMatch(/<DocumentsPanel/);
    expect(page).toMatch(/<MarketsPanel/);
    expect(page).toMatch(/<QuotesPanel/);
    expect(page).toMatch(/EditLayoutLink/);
    expect(page).toMatch(/QuickCommsBoard/);
  });

  it("does not add a carrier-history item to the sidebar catalog", () => {
    const nav = source("src/lib/desk/nav-catalog.ts");
    expect(nav).not.toMatch(/carrier-history/);
    const css = source("src/app/globals.css");
    expect(css).toContain("--ff-sidebar: #1d4e89;");
  });
});
