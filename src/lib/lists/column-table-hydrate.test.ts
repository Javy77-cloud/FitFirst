import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ColumnsMenu } from "@/components/lists/columns-menu";
import { ColumnTable } from "@/components/lists/column-table";
import { ColumnSortFilter } from "@/components/lists/funnel-sort";
import { TagChips } from "@/components/tags/tag-chips";
import { tagSortText } from "@/lib/tags/module-tags";

function source(file: string) {
  return readFileSync(file, "utf8");
}

function emitsBaseUiId(html: string) {
  return /id="base-ui-/.test(html) || /data-base-ui-click-trigger/.test(html);
}

describe("ColumnTable / ColumnsMenu SSR ids", () => {
  it("list rows stamp tags via tagSortText, not by walking chip children", () => {
    expect(source("src/components/deals/deals-table.tsx")).toMatch(/tags: tagSortText\(deal\.tags\)/);
    expect(source("src/app/leads/page.tsx")).toMatch(/tags: tagSortText\(lead\.tags\)/);
    expect(source("src/app/contacts/page.tsx")).toMatch(/tags: tagSortText\(c\.tags\)/);
    expect(source("src/app/policies/page.tsx")).toMatch(/tags: tagSortText\(policy\.tags\)/);
    expect(source("src/components/lists/column-table.tsx")).not.toMatch(/isValidElement/);
  });

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

  it("SSR tags cells use explicit sort text for data-sort / data-sheet-cell", () => {
    const tags = ["high-risk"];
    const html = renderToString(
      createElement(ColumnTable, {
        moduleId: "deals",
        columns: [{ id: "tags", label: "Tags" }],
        initialVisible: ["tags"],
        rows: [
          {
            key: "deal-1",
            cells: { tags: createElement(TagChips, { tags }) },
            sort: { tags: tagSortText(tags) },
          },
        ],
      }),
    );
    expect(html).toContain('data-sheet-col="tags"');
    expect(html).toContain('data-sort="High Risk"');
    expect(html).toContain('data-sheet-cell="High Risk"');
    expect(html).toContain("High Risk");
    expect(html).not.toMatch(/data-sheet-col="tags"[^>]*data-sort=""/);
  });

  it("SSR and CSR agree on empty attrs when a chip cell has no sort key", () => {
    const html = renderToString(
      createElement(ColumnTable, {
        moduleId: "deals",
        columns: [{ id: "tags", label: "Tags" }],
        initialVisible: ["tags"],
        rows: [
          {
            key: "deal-1",
            cells: { tags: createElement(TagChips, { tags: ["high-risk"] }) },
          },
        ],
      }),
    );
    expect(html).toMatch(/data-sheet-col="tags"[^>]*data-sort=""/);
    expect(html).toContain('data-sheet-cell=""');
    expect(html).toContain("High Risk");
  });
});
