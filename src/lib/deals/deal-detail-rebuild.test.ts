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
  it("shows only the deal name in the header and keeps FitFirst off the title", () => {
    const page = source("src/app/deals/[id]/page.tsx");
    expect(page).toMatch(/title=\{deal\.title\}/);
    expect(page).toMatch(/showBrand=\{false\}/);
    expect(page).toMatch(/utilityChrome/);
    expect(page).not.toMatch(/<h1[^>]*>\{deal\.title\}/);
    expect(page).not.toMatch(/FitFirst/);
    expect(page).toMatch(/recordContext=\{\{/);
    expect(page).not.toMatch(/deal-quick-actions/);
  });

  it("keeps three tabs under the name and kills Quote Sheet", () => {
    expect(AGENT_DEAL_TABS).toEqual(["documents", "markets", "quotes"]);
    const page = source("src/app/deals/[id]/page.tsx");
    expect(page).toMatch(/AGENT_DEAL_TABS/);
    expect(page).not.toMatch(/QuoteSheetPanel/);
    expect(page).not.toMatch(/tab=quote-sheet/);
    expect(page).toMatch(/SectionTabs/);
    expect(page.indexOf("SectionTabs")).toBeLessThan(page.indexOf("RecordDetailLayout"));
  });

  it("puts an editable master sheet beside a compact upload on Documents", () => {
    const docs = source("src/components/deal/documents-panel.tsx");
    const upload = source("src/components/deal/source-docs-upload.tsx");
    const sheet = source("src/components/deal/master-sheet-compare.tsx");
    expect(docs).toMatch(/DealLineSelector/);
    expect(docs).toMatch(/SourceDocsUpload/);
    expect(docs).toMatch(/MasterSheetCompare/);
    expect(docs).toMatch(/SheetApproveGate/);
    expect(docs).toMatch(/DeleteUploadedFileButton/);
    expect(docs.indexOf("DealLineSelector")).toBeLessThan(docs.indexOf("SourceDocsUpload"));
    expect(upload).toMatch(/Create/);
    expect(upload).not.toMatch(/Add another file/);
    expect(sheet).toMatch(/name=\{fieldKey\}/);
    expect(sheet).toMatch(/Confirm extracted/);
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
    expect(body.indexOf("Approve & request quotes")).toBeLessThan(body.indexOf("<MarketTable"));
    expect(body.indexOf("<MarketTable")).toBeLessThan(body.indexOf("<ManualCarrierAdd"));
  });

  it("removes in-desk signature from Documents", () => {
    const page = source("src/app/deals/[id]/page.tsx");
    expect(page).not.toMatch(/InDeskEsignPanel/);
    expect(page).not.toMatch(/getLatestInDeskEnvelope/);
    expect(page).not.toMatch(/In-desk signature/);
  });

  it("defaults the deal line selector to Homeowners and swaps the sheet", () => {
    expect(resolveDealProduct({})).toBe("homeowners");
    const selector = source("src/components/deal/deal-line-selector.tsx");
    expect(selector).toMatch(/Line of business\./);
    expect(selector).toMatch(/setDealSheetProduct/);
    const sheet = source("src/components/deal/master-sheet-compare.tsx");
    expect(sheet).not.toMatch(/data-ff-sheet-product/);
    expect(sheet).toMatch(/one product on this deal/);
  });

  it("leaves Quotes empty until Markets returns rows", () => {
    const quotes = source("src/components/deal/quotes-panel.tsx");
    expect(quotes).toMatch(/data-ff-deal-quotes-empty/);
    expect(quotes).toMatch(/Quotes land here after Markets sends them back/);
    expect(quotes.indexOf("sorted.length === 0")).toBeLessThan(quotes.indexOf("Quote results"));
  });

  it("pins quick comms and keeps motivation in the corner", () => {
    const page = source("src/app/deals/[id]/page.tsx");
    expect(page).toMatch(/data-ff-deal-quick-comms/);
    expect(page).toMatch(/QuickCommsBoard/);
    expect(page).toMatch(/lg:sticky/);
    expect(page).toMatch(/DealMotivation/);
    expect(page).toMatch(/SheetHealthToggle/);
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
