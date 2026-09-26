import { createElement } from "react";
import { readFileSync } from "node:fs";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DEAL_STAGES } from "@/lib/domain";
import { SEEDED_PIPELINES } from "@/lib/wire/pipeline";
import { DEALS_LIST_COLUMNS, defaultVisibleIds, PIPELINE_LIST_COLUMNS } from "@/lib/list-columns";
import { normalizeDealsVisibleColumns, TABLE_COLUMNS } from "@/lib/desk/columns";
import { matchesDealFilters } from "@/lib/crm/lists";
import {
  buildDealTitle,
  clientNameFromStoredTitle,
  dealSearchHaystack,
  dealTitleForActiveProduct,
  dealTitleFromPerson,
  displayDealTitle,
  visibleDealTitle,
  dealTitleFormWord,
  dealTitleLobWord,
  formatDealTitle,
  isLegacyShopTitle,
  joinDealTitleParts,
  matchesDealNameSearch,
  parseTitlePerson,
  stripDealTitleLob,
  stripLegacyShopSuffix,
} from "./deal-title";
import { dealTitleForRecords } from "./deal-title";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("deal title is the client name only", () => {
  it("builds a person, a business, a named insured, or a lead — and trims whitespace", () => {
    expect(buildDealTitle({ contact: { firstName: "Gloria", lastName: "Martinez" } })).toBe(
      "Gloria Martinez",
    );
    expect(
      buildDealTitle({
        contact: { firstName: "  Gloria  ", lastName: "  Martinez  " },
        account: { name: "Should Not Win LLC" },
        primaryNamedInsured: "Someone Else",
        lead: { firstName: "Edmerson", lastName: "Vazquez" },
      }),
    ).toBe("Gloria Martinez");
    expect(buildDealTitle({ account: { name: "  Harbor Key Marine LLC  " } })).toBe(
      "Harbor Key Marine LLC",
    );
    expect(buildDealTitle({ accountName: "Harbor Key Marine LLC" })).toBe("Harbor Key Marine LLC");
    expect(
      buildDealTitle({
        accountName: "Harbor Key Marine LLC",
        primaryNamedInsured: "Gloria Martinez",
        lead: { firstName: "Edmerson", lastName: "Vazquez" },
      }),
    ).toBe("Harbor Key Marine LLC");
    expect(buildDealTitle({ primaryNamedInsured: "  Gloria   Martinez  " })).toBe("Gloria Martinez");
    expect(
      buildDealTitle({
        primaryNamedInsured: "Gloria Martinez",
        lead: { firstName: "Edmerson", lastName: "Vazquez" },
      }),
    ).toBe("Gloria Martinez");
    expect(buildDealTitle({ lead: { firstName: " Elena ", lastName: " Ruiz " } })).toBe("Elena Ruiz");
    expect(buildDealTitle({})).toBe("");
    expect(buildDealTitle({ contact: { firstName: "   ", lastName: "" }, lead: { firstName: "Ana", lastName: "Dib" } })).toBe(
      "Ana Dib",
    );
  });

  it("ignores line, form, address, and the active product chip", () => {
    expect(dealTitleFromPerson("Javier", "Canales", "HO")).toBe("Javier Canales");
    expect(dealTitleFromPerson("Javier", "Canales", "AUTO")).toBe("Javier Canales");
    expect(formatDealTitle({ firstName: "Elena", lastName: "Ruiz", line: "HO" })).toBe("Elena Ruiz");
    expect(formatDealTitle({ accountName: "Harbor Key Marine LLC", line: "GL" })).toBe(
      "Harbor Key Marine LLC",
    );
    expect(
      formatDealTitle({
        firstName: "Gloria",
        lastName: "Martinez",
        line: "HO",
        quotingForm: "DP3",
        policySubType: "DP3",
      }),
    ).toBe("Gloria Martinez");
    expect(dealTitleForActiveProduct({ title: "Heather Camirand / HO3", product: "auto" })).toBe(
      "Heather Camirand",
    );
    expect(
      dealTitleForActiveProduct({
        title: "Gloria Martinez / HO3 / HO3 / DP3",
        product: "homeowners",
        label: "HO3 10358 Northwest 30th",
      }),
    ).toBe("Gloria Martinez");
    expect(
      displayDealTitle({
        contact: { firstName: "Gloria", lastName: "Martinez" },
        title: "Gloria Martinez / HO3 / HO3 / DP3",
      }),
    ).toBe("Gloria Martinez");
    expect(clientNameFromStoredTitle("Gloria Martinez / HO3 10358 Northwest 30th")).toBe(
      "Gloria Martinez",
    );
    expect(visibleDealTitle({ title: "Tyler Bhattel / Term Life", lineOfBusiness: "LIFE" })).toBe(
      "Tyler Bhattel",
    );
    const html = renderToString(
      createElement(
        "h1",
        { "data-ff-deal-title": true },
        displayDealTitle({
          contact: { firstName: "Gloria", lastName: "Martinez" },
          title: "Gloria Martinez / HO3 / HO3 / DP3",
          primaryNamedInsured: "Gloria Martinez / HO3 10358 NW 30th TER",
        }),
      ),
    );
    expect(html).toContain("Gloria Martinez");
    expect(html).not.toContain("10358");
    expect(html).not.toContain("HO3");
    expect(html).not.toContain("Northwest");
    expect(html).not.toContain("NW 30th");
    const page = source("src/app/deals/[id]/page.tsx");
    expect(page).toMatch(/displayDealTitle/);
    expect(page).not.toMatch(/dealTitleForActiveProduct/);
    expect(page).toMatch(/pinPropertyAddresses/);
    expect(source("src/lib/crm/convert.ts")).toMatch(/formatDealTitle|dealTitleFromPerson|buildDealTitle/);
    expect(source("src/lib/crm/convert.ts")).not.toMatch(/\$\{lead\.lastName\} · \$\{line\} shop/);
    expect(dealTitleLobWord("HO")).toBe("Homeowners");
    expect(joinDealTitleParts("Javier Canales", "Homeowners")).toBe("Javier Canales / Homeowners");
  });
});

describe("BH2 — LOB change retitles the deal", () => {
  it("rebuilds the title from the same person and the new line", () => {
    const next = dealTitleForRecords({
      lineOfBusiness: "AUTO",
      primaryNamedInsured: "Javier Canales",
      title: "Javier Canales Home",
      lead: { firstName: "Javier", lastName: "Canales" },
    });
    expect(next).toBe("Javier Canales");
    expect(source("src/app/actions/quote-sheet.ts")).toMatch(/dealTitleForRecords|formatDealTitle/);
  });
});

describe("BH3 — existing shop titles are rewritten", () => {
  it("kills the Canales - HO shop / Last · HO shop pattern", () => {
    expect(isLegacyShopTitle("Canales - HO shop")).toBe(true);
    expect(isLegacyShopTitle("Ruiz · HO shop")).toBe(true);
    expect(isLegacyShopTitle("Javier Canales / Home")).toBe(false);
    expect(isLegacyShopTitle("Javier / Canales / Home")).toBe(false);
    expect(isLegacyShopTitle("Javier Canales Home")).toBe(false);
    expect(stripLegacyShopSuffix("Canales - HO shop")).toBe("Canales");
    expect(stripDealTitleLob("Javier Canales Home")).toBe("Javier Canales");
    expect(stripDealTitleLob("Javier Canales / Home")).toBe("Javier Canales");
    expect(parseTitlePerson("Javier Canales Home")).toEqual({ firstName: "Javier", lastName: "Canales" });
    expect(parseTitlePerson("Javier Canales / Home")).toEqual({ firstName: "Javier", lastName: "Canales" });
    expect(parseTitlePerson("Javier / Canales / Home")).toEqual({ firstName: "Javier", lastName: "Canales" });
    expect(
      formatDealTitle({
        firstName: "Javier",
        lastName: "Canales",
        existingTitle: "Canales - HO shop",
        line: "HO",
      }),
    ).toBe("Javier Canales");
    expect(
      dealTitleForRecords({
        lineOfBusiness: "HO",
        title: "Dib · Palm Bay HO3",
        contact: { firstName: "Ana", lastName: "Dib" },
        primaryNamedInsured: "Ana Dib",
      }),
    ).toBe("Ana Dib");
    expect(
      formatDealTitle({
        existingTitle: "Javier Canales Home",
        line: "HO",
      }),
    ).toBe("");
    expect(clientNameFromStoredTitle("Javier Canales / Homeowners")).toBe("Javier Canales");
    expect(
      formatDealTitle({
        firstName: "Javier",
        lastName: "Canales",
        existingTitle: "Javier / Canales / Home",
        line: "HO",
      }),
    ).toBe("Javier Canales");
  });
});

describe("BH4 — search matches first, last, or LOB", () => {
  it("finds Javier Canales Home by first name even if the title lags", () => {
    const lagging = {
      title: "Canales - HO shop",
      firstName: "Javier",
      lastName: "Canales",
      lineOfBusiness: "HO",
    };
    expect(matchesDealNameSearch("Javier", lagging)).toBe(true);
    expect(matchesDealNameSearch("Canales", lagging)).toBe(true);
    expect(matchesDealNameSearch("Home", lagging)).toBe(true);
    expect(matchesDealNameSearch("HO", lagging)).toBe(true);
    expect(matchesDealNameSearch("miami", lagging)).toBe(false);
    expect(dealSearchHaystack(lagging)).toMatch(/Javier/);
    expect(dealSearchHaystack(lagging)).toMatch(/Home/);
    expect(
      matchesDealFilters(
        {
          title: "Javier Canales / Home",
          pipelineStage: "shopping",
          lineOfBusiness: "HO",
          state: "FL",
          insured: "Javier Canales",
          firstName: "Javier",
          lastName: "Canales",
        },
        { q: "Javier" },
      ),
    ).toBe(true);
  });
});

describe("BH5 — pipeline / deals table has no Contact column", () => {
  it("drops Contact from the deals table and does not require it", () => {
    const keys = (TABLE_COLUMNS.deals ?? []).map((column) => column.key);
    expect(keys).not.toContain("contact");
    expect(keys[0]).toBe("title");
    expect(keys[1]).toBe("stage");
    expect(DEALS_LIST_COLUMNS.find((column) => column.id === "contact")).toBeUndefined();
    expect(defaultVisibleIds(DEALS_LIST_COLUMNS)).not.toContain("contact");
    expect(normalizeDealsVisibleColumns(["pick", "title", "contact", "stage"])).toEqual([
      "pick",
      "title",
      "stage",
    ]);
    expect(source("src/components/deals/deals-table.tsx")).not.toMatch(/contact: contact \?/);
    expect(source("src/lib/list-columns.ts")).not.toMatch(/lock: \["title", "contact"/);
  });
});

describe("BH6 — stages, filters, and other columns stay", () => {
  it("does not change pipeline stages or remaining deal columns", () => {
    expect(SEEDED_PIPELINES.find((board) => board.slug === "p-c")?.stages.map((s) => s.slug)).toEqual([
      "gathering",
      "markets",
      "quote_review",
      "quote_sent",
      "bound",
      "policy_issued",
      "closed_won",
      "closed_lost",
    ]);
    expect(DEAL_STAGES).toEqual(
      expect.arrayContaining(["gathering", "markets", "quote_review", "bound", "policy_issued", "closed_won"]),
    );
    const keys = (TABLE_COLUMNS.deals ?? []).map((column) => column.key);
    expect(keys).toEqual(
      expect.arrayContaining(["title", "stage", "tags", "phone"]),
    );
    expect(keys).not.toContain("assigned");
    expect(keys).not.toContain("value");
    expect(keys).not.toContain("premium");
    expect(keys).not.toContain("preferred_language");
    expect(keys).not.toContain("esign");
    expect(keys).not.toContain("comms");
    expect(PIPELINE_LIST_COLUMNS.map((column) => column.id)).toEqual(
      expect.arrayContaining(["title", "stage", "tags", "actions"]),
    );
    expect(PIPELINE_LIST_COLUMNS.map((column) => column.id)).not.toContain("coverageA");
    expect(source("src/components/deals/deal-workspace-bar.tsx")).toMatch(/deal-line-filters/);
    expect(source("src/components/deals/deal-workspace-bar.tsx")).toMatch(/deal-closed-filters/);
  });
});

describe("sep7bq — First Last / Lob backfill", () => {
  it("ships an additive retitle migrate that joins first and last with a space", () => {
    const sql = source("drizzle/0088_stage_title_picklists.sql");
    expect(sql).toMatch(/concat_ws\(' ',/);
    expect(sql).toMatch(/concat_ws\(' \/ '/);
    expect(sql).toMatch(/NOT IN \('Home'/);
    expect(sql).not.toMatch(/DROP TABLE/);
    expect(sql).not.toMatch(/db:seed/);
    expect(source("scripts/regenerate-deal-titles.ts")).toMatch(/buildDealTitle/);
    expect(source("scripts/regenerate-deal-titles.ts")).toMatch(/deal\.title_updated/);
    expect(source("scripts/regenerate-deal-titles.ts")).toMatch(/Owner request \(Javy\)/);
    expect(source("src/lib/deals/retitle.ts")).not.toMatch(/dealTitleForRecords/);
    expect(source("src/lib/deals/retitle.ts")).not.toMatch(/title: next/);
    expect(source("src/lib/deals/deal-title.ts")).toMatch(/formatDealPersonName/);
  });
});

describe("sep7 — Deal Details applicant rename retitles even when lead differs", () => {
  it("lets a linked contact win, then the named insured, then the lead", () => {
    expect(
      formatDealTitle({
        firstName: "Gloria",
        lastName: "Martinez",
        primaryNamedInsured: "Edmerson Vazquez",
        existingTitle: "Edmerson Vazquez / Homeowners",
        lead: { firstName: "Edmerson", lastName: "Vazquez" },
        contact: { firstName: "Edmerson", lastName: "Vazquez" },
        line: "HO",
      }),
    ).toBe("Edmerson Vazquez");
    expect(
      dealTitleForRecords({
        lineOfBusiness: "HO",
        firstName: "Gloria",
        lastName: "Martinez",
        primaryNamedInsured: "Gloria Martinez",
        title: "Edmerson Vazquez / Homeowners",
        lead: { firstName: "Edmerson", lastName: "Vazquez" },
      }),
    ).toBe("Gloria Martinez");
    expect(
      formatDealTitle({
        firstName: "Gloria",
        lastName: "Martinez",
        lead: { firstName: "Edmerson", lastName: "Vazquez" },
        line: "HO",
      }),
    ).toBe("Gloria Martinez");
    expect(source("src/app/actions/custom-fields.ts")).toMatch(/buildDealTitle/);
    expect(source("src/app/actions/custom-fields.ts")).toMatch(/leadId \/ contactId are intentionally not touched/);
  });
});


describe("sep13 — deal title uses deepest cascade form label", () => {
  it("prefers HO3 / DP3 / Term Life over generic Homeowners", () => {
    expect(dealTitleFormWord("HO3")).toBe("HO3");
    expect(dealTitleFormWord("DP3")).toBe("DP3");
    expect(dealTitleFormWord("Term Life")).toBe("Term Life");
    expect(dealTitleFormWord("homeowners")).toBeNull();
    expect(dealTitleLobWord("HO", "DP3")).toBe("DP3");
    expect(dealTitleLobWord("HO", "HO3")).toBe("HO3");
    expect(dealTitleLobWord("HO", "Term Life")).toBe("Term Life");
    expect(dealTitleLobWord("HO")).toBe("Homeowners");
    expect(
      formatDealTitle({
        firstName: "Gloria",
        lastName: "Martinez",
        line: "HO",
        quotingForm: "DP3",
        policySubType: "DP3",
      }),
    ).toBe("Gloria Martinez");
    expect(
      formatDealTitle({
        firstName: "Gloria",
        lastName: "Martinez",
        line: "HO",
        quotingForm: "HO3",
      }),
    ).toBe("Gloria Martinez");
    expect(
      formatDealTitle({
        firstName: "Tyler",
        lastName: "Bhattel",
        line: "LIFE",
        policySubType: "Term Life",
      }),
    ).toBe("Tyler Bhattel");
    expect(source("src/app/actions/custom-fields.ts")).toMatch(/quotingForm: form\.id/);
    expect(source("src/components/custom-fields/deal-details-panel.tsx")).toMatch(
      /data-ff-pipeline-strip/,
    );
    expect(source("src/components/custom-fields/insurance-cascade-control.tsx")).toMatch(/Policy form/);
    expect(source("src/components/custom-fields/deal-details-panel.tsx")).not.toMatch(
      /data-ff-insurance-quote-request/,
    );
    expect(source("src/components/custom-fields/record-layout-form.tsx")).toMatch(
      /data-ff-pipeline-strip/,
    );
  });
});
