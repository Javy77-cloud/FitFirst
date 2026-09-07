import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ColumnsMenu } from "@/components/lists/columns-menu";
import { ColumnSortFilter } from "@/components/lists/funnel-sort";

function source(file: string) {
  return readFileSync(file, "utf8");
}

function emitsBaseUiId(html: string) {
  return /id="base-ui-/.test(html) || /data-base-ui-click-trigger/.test(html);
}

describe("ColumnTable / ColumnsMenu SSR ids", () => {
  it("defers Base UI menu and dialog triggers until after mount", () => {
    expect(source("src/hooks/use-client-mounted.ts")).toMatch(/useClientMounted/);
    expect(source("src/components/lists/columns-menu.tsx")).toMatch(/useClientMounted/);
    expect(source("src/components/lists/funnel-sort.tsx")).toMatch(/useClientMounted/);
    expect(source("src/components/deals/change-owner-dialog.tsx")).toMatch(/useClientMounted/);
    expect(source("src/components/lists/column-table.tsx")).toMatch(
      /useState<PageSizeOption>\(DEFAULT_PAGE_SIZE\)/,
    );
    expect(source("src/components/lists/column-table.tsx")).not.toMatch(
      /useState<PageSizeOption>\(\(\) => \{[\s\S]*typeof window/,
    );
    expect(source("src/components/lists/columns-menu.tsx")).toMatch(/onToggle/);
    expect(source("src/components/lists/columns-menu.tsx")).toMatch(/onReorder/);
    expect(source("src/components/lists/columns-menu.tsx")).toMatch(/onDragStart/);
  });

  it("SSR of ColumnsMenu and column filter does not emit Base UI ids", () => {
    const menu = renderToString(
      createElement(ColumnsMenu, {
        columns: [{ id: "stage", label: "Stage" }],
        visible: ["stage"],
        onToggle() {},
        onReorder() {},
        onReset() {},
      }),
    );
    const filter = renderToString(
      createElement(ColumnSortFilter, {
        label: "Stage",
        active: null,
        filterOptions: ["New", "Quoted"],
        filterValue: "",
        onFilterValue() {},
        onSort() {},
      }),
    );
    expect(menu).toContain("Columns");
    expect(menu).toContain('aria-haspopup="true"');
    expect(filter).toContain("Filter Stage");
    expect(emitsBaseUiId(menu)).toBe(false);
    expect(emitsBaseUiId(filter)).toBe(false);
  });
});
