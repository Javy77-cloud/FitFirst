import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: () => undefined, replace: () => undefined, push: () => undefined }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/deals/deal-1",
}));
import { DealDetailsPanel } from "@/components/custom-fields/deal-details-panel";
import { FieldControl } from "@/components/custom-fields/field-control";
import { MarketsPanel } from "@/components/deal/markets-panel";
import { MasterSheetCompare } from "@/components/deal/master-sheet-compare";
import { parseLayout } from "@/lib/custom-fields/types";
import { asList } from "@/lib/safe-list";

describe("Deal page sparse arrays", () => {
  it("normalizes missing columns / sections / fieldKeys so .map never throws", () => {
    const sparse = {
      columns: [{ id: "left" }, { id: "right", sections: [{ id: "s1", label: "X" }] }],
    };
    const layout = parseLayout(sparse);
    expect(() => {
      asList(layout.columns).map((column) =>
        asList(column.sections).map((section) => asList(section.fieldKeys).map((key) => key)),
      );
    }).not.toThrow();
    expect(layout.columns[0].sections).toEqual([]);
    expect(layout.columns[1].sections[0].fieldKeys).toEqual([]);
    expect(parseLayout(null).columns).toHaveLength(2);
    expect(parseLayout({}).columns[0].sections).toEqual([]);
  });

  it("renders Deal Details and Documents with sparse/missing layout arrays", () => {
    const sparseLayout = {
      columns: [{ id: "left" }, { id: "right", sections: [{ id: "addr", label: "Address" }] }],
    } as never;
    expect(() =>
      renderToString(
        createElement(DealDetailsPanel, {
          dealId: "deal-1",
          line: "HO",
          layout: sparseLayout,
          fields: undefined as never,
          values: {},
        }),
      ),
    ).not.toThrow();

    expect(() =>
      renderToString(
        createElement(MasterSheetCompare, {
          dealId: "deal-1",
          line: "home",
          fields: undefined as never,
          values: {},
          product: "homeowners",
        }),
      ),
    ).not.toThrow();

    expect(() =>
      renderToString(
        createElement(FieldControl, {
          field: { key: "occupancy", label: "Occupancy", type: "picklist" },
          value: "",
          values: {},
          name: "occupancy",
        }),
      ),
    ).not.toThrow();

    expect(() =>
      renderToString(
        createElement(MarketsPanel, {
          dealId: "deal-1",
          matches: undefined as never,
          carriers: undefined as never,
        }),
      ),
    ).not.toThrow();
  });
});
