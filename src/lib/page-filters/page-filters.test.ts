import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { defaultPageFilters } from "./defaults";
import { pageFilterFields } from "./fields";
import { matchesPageFilters } from "./match";
import {
  enabledPageFilters,
  mergeLiveOptions,
  normalizePageFilterModule,
  pageFilterParamKeys,
  resolvePageFilters,
  seedPageFilter,
} from "./prefs";
import { PAGE_FILTER_MODULES } from "./types";

describe("page filter modules", () => {
  it("keys contacts, businesses, policies, and carriers (accounts alias)", () => {
    expect([...PAGE_FILTER_MODULES]).toEqual(["contacts", "businesses", "policies", "carriers"]);
    expect(normalizePageFilterModule("accounts")).toBe("businesses");
    expect(normalizePageFilterModule("business")).toBe("businesses");
    expect(normalizePageFilterModule("policies")).toBe("policies");
    expect(normalizePageFilterModule("deals")).toBeNull();
  });

  it("defaults keep today’s chips — policy types, written months, 30/60/90, lapse", () => {
    const policies = defaultPageFilters("policies");
    expect(policies.map((row) => row.fieldKey)).toEqual([
      "status",
      "line",
      "written",
      "renewal",
      "attention",
    ]);
    const renewal = policies.find((row) => row.fieldKey === "renewal");
    expect(renewal?.options.map((option) => option.value)).toEqual(["30", "60", "90"]);
    expect(renewal?.options.map((option) => option.color)).toEqual(["#EAB308", "#F97316", "#BF0A30"]);
    expect(policies.find((row) => row.fieldKey === "attention")?.options[0]?.value).toBe("lapse");
    expect(defaultPageFilters("contacts").map((row) => row.fieldKey)).toEqual(["status", "source"]);
    expect(defaultPageFilters("businesses").map((row) => row.fieldKey)).toEqual(["status", "industry"]);
    expect(defaultPageFilters("carriers").map((row) => row.fieldKey)).toEqual([
      "status",
      "line",
      "business",
      "portal",
    ]);
  });

  it("Title Cases default labels", () => {
    expect(defaultPageFilters("policies").find((row) => row.fieldKey === "written")?.options[0]?.label).toBe(
      "This Month",
    );
    expect(defaultPageFilters("businesses")[0]?.options.find((row) => row.value === "not_a_client")?.label).toBe(
      "Not A Client",
    );
  });

  it("keep / delete / clear / enable: stored list wins, empty is a clear", () => {
    const kept = resolvePageFilters("carriers", [
      { id: "carriers-status", label: "Status", fieldKey: "status", enabled: false, options: [] },
    ]);
    expect(kept).toHaveLength(1);
    expect(kept[0]?.enabled).toBe(false);
    expect(enabledPageFilters(kept)).toEqual([]);
    expect(resolvePageFilters("carriers", [])).toEqual([]);
    expect(resolvePageFilters("carriers", null).map((row) => row.fieldKey)).toEqual(
      defaultPageFilters("carriers").map((row) => row.fieldKey),
    );
  });

  it("matches remapped fields and multi-value LOB", () => {
    expect(
      matchesPageFilters({ status: "Active", line: ["HO", "FLOOD"] }, { status: "Active", line: "flood" }),
    ).toBe(true);
    expect(matchesPageFilters({ status: "Active" }, { status: "Pending" })).toBe(false);
    expect(matchesPageFilters({ amBest: "A+" }, { amBest: "A+" })).toBe(true);
  });

  it("available fields include sheet columns plus special keys", () => {
    const policyKeys = pageFilterFields("policies").map((row) => row.key);
    expect(policyKeys).toEqual(expect.arrayContaining(["status", "line", "written", "renewal", "attention", "carrier"]));
    const carrierKeys = pageFilterFields("carriers").map((row) => row.key);
    expect(carrierKeys).toEqual(expect.arrayContaining(["status", "line", "business", "portal", "amBest"]));
    const extra = pageFilterFields("businesses", [{ id: "naics", label: "NAICS" }]);
    expect(extra.map((row) => row.key)).toContain("naics");
  });

  it("seeds a new filter from defaults or a blank column field", () => {
    const renewal = seedPageFilter("policies", "renewal");
    expect(renewal.fieldKey).toBe("renewal");
    expect(renewal.options).toHaveLength(3);
    const custom = seedPageFilter("carriers", "amBest");
    expect(custom.fieldKey).toBe("amBest");
    expect(custom.label).toBe("AM Best Rating");
    expect(custom.options).toEqual([]);
  });

  it("merges live option values without dupes", () => {
    const [status] = mergeLiveOptions(defaultPageFilters("businesses"), {
      status: ["client", "vip"],
    });
    expect(status?.options.some((row) => row.value === "vip")).toBe(true);
    expect(status?.options.filter((row) => row.value === "client")).toHaveLength(1);
  });

  it("param keys follow enabled fieldKeys for URL compat", () => {
    expect(pageFilterParamKeys(defaultPageFilters("businesses"))).toEqual(["status", "industry"]);
  });
});

describe("Zoho plug points", () => {
  it("Business + Carriers wire PageFiltersBar; Policies + Contacts stay off this lane", () => {
    const accounts = readFileSync("src/app/accounts/page.tsx", "utf8");
    const carriers = readFileSync("src/app/carriers/page.tsx", "utf8");
    const policies = readFileSync("src/app/policies/page.tsx", "utf8");
    const contacts = readFileSync("src/app/contacts/page.tsx", "utf8");
    expect(accounts).toMatch(/PageFiltersBar/);
    expect(carriers).toMatch(/PageFiltersBar/);
    expect(policies).not.toMatch(/PageFiltersBar/);
    expect(contacts).not.toMatch(/PageFiltersBar/);
    expect(policies).toMatch(/SavedFiltersBar/);
    expect(contacts).toMatch(/SavedFiltersBar/);
  });
});

describe("client boundary", () => {
  it("does not re-export the DB store from the client barrel", () => {
    const barrel = readFileSync("src/lib/page-filters/index.ts", "utf8");
    const bar = readFileSync("src/components/filters/page-filters-bar.tsx", "utf8");
    const configure = readFileSync("src/components/filters/configure-page-filters.tsx", "utf8");
    expect(barrel).not.toMatch(/from ["']\.\/store["']/);
    expect(bar).not.toMatch(/page-filters\/store/);
    expect(configure).not.toMatch(/page-filters\/store/);
    expect(configure).toMatch(/@\/app\/actions\/page-filters/);
  });
});
