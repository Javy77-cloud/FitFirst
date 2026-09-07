import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DEAL_STAGES } from "@/lib/domain";
import { SEEDED_PIPELINES } from "@/lib/wire/pipeline";
import { DEALS_LIST_COLUMNS, defaultVisibleIds, PIPELINE_LIST_COLUMNS } from "@/lib/list-columns";
import { normalizeDealsVisibleColumns, TABLE_COLUMNS } from "@/lib/desk/columns";
import { matchesDealFilters } from "@/lib/crm/lists";
import {
  dealSearchHaystack,
  dealTitleFromPerson,
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

describe("BH1 — deal titles are First Last / Lob", () => {
  it("names converts and new deals First Last / Home with one slash", () => {
    expect(dealTitleFromPerson("Javier", "Canales", "HO")).toBe("Javier Canales / Home");
    expect(dealTitleFromPerson("Javier", "Canales", "AUTO")).toBe("Javier Canales / Auto");
    expect(formatDealTitle({ firstName: "Elena", lastName: "Ruiz", line: "HO" })).toBe("Elena Ruiz / Home");
    expect(formatDealTitle({ accountName: "Harbor Key Marine LLC", line: "GL" })).toBe(
      "Harbor Key Marine LLC / GL",
    );
    expect(joinDealTitleParts("Javier Canales", "Home")).toBe("Javier Canales / Home");
    expect((dealTitleFromPerson("Javier", "Canales", "HO").match(/\//g) ?? []).length).toBe(1);
    expect(dealTitleFromPerson("Javier", "Canales", "HO")).not.toContain("Javier / Canales");
    expect(dealTitleLobWord("HO")).toBe("Home");
    expect(dealTitleLobWord("FLOOD")).toBe("Flood");
    expect(dealTitleLobWord("AUTO")).toBe("Auto");
    expect(source("src/lib/crm/convert.ts")).toMatch(/formatDealTitle|dealTitleFromPerson/);
    expect(source("src/lib/crm/convert.ts")).not.toMatch(/\$\{lead\.lastName\} · \$\{line\} shop/);
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
    expect(next).toBe("Javier Canales / Auto");
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
    ).toBe("Javier Canales / Home");
    expect(
      dealTitleForRecords({
        lineOfBusiness: "HO",
        title: "Dib · Palm Bay HO3",
        contact: { firstName: "Ana", lastName: "Dib" },
        primaryNamedInsured: "Ana Dib",
      }),
    ).toBe("Ana Dib / Home");
    expect(
      formatDealTitle({
        existingTitle: "Javier Canales Home",
        line: "HO",
      }),
    ).toBe("Javier Canales / Home");
    expect(
      formatDealTitle({
        firstName: "Javier",
        lastName: "Canales",
        existingTitle: "Javier / Canales / Home",
        line: "HO",
      }),
    ).toBe("Javier Canales / Home");
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
      "gather",
      "quotes",
      "review",
      "quote_sent",
      "closed_won",
      "closed_lost",
    ]);
    expect(DEAL_STAGES).toEqual(expect.arrayContaining(["shopping", "quoting", "bound"]));
    const keys = (TABLE_COLUMNS.deals ?? []).map((column) => column.key);
    expect(keys).toEqual(
      expect.arrayContaining(["title", "stage", "line", "source", "tags", "assigned", "value", "phone"]),
    );
    expect(keys).not.toContain("esign");
    expect(keys).not.toContain("comms");
    expect(PIPELINE_LIST_COLUMNS.map((column) => column.id)).toEqual(
      expect.arrayContaining(["title", "insured", "stage", "line", "actions"]),
    );
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
    expect(source("src/lib/deals/retitle.ts")).toMatch(/dealTitleForRecords/);
    expect(source("src/lib/deals/deal-title.ts")).toMatch(/formatDealPersonName/);
  });
});
