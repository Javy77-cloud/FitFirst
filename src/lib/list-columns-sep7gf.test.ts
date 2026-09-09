import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CORE_FIELDS } from "@/lib/custom-fields/defaults";
import { defaultLayoutForModule } from "@/lib/custom-fields/modules";
import type { FieldLayout } from "@/lib/custom-fields/types";
import { dealsColumnsFromFields } from "@/lib/deals/deal-columns";
import {
  DEALS_LIST_COLUMNS,
  LEADS_LIST_COLUMNS,
  PIPELINE_LIST_COLUMNS,
  allColumnIds,
  dealsListColumnsFromFields,
  leadsListColumnsFromLayout,
  pipelineListColumnsFromLayout,
} from "@/lib/list-columns";
import { TABLE_COLUMNS } from "@/lib/desk/columns";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("sep7gf layout-driven list columns", () => {
  it("drops Coverage value / Assigned / Dependents / preferred language when not on layout", () => {
    const ids = allColumnIds(DEALS_LIST_COLUMNS);
    expect(ids).not.toContain("assigned");
    expect(ids).not.toContain("value");
    expect(ids).not.toContain("premium");
    expect(ids).not.toContain("dependents");
    expect(ids).not.toContain("preferred_language");
    expect(ids).toEqual(
      expect.arrayContaining(["pick", "title", "stage", "tags", "phone", "email", "state"]),
    );
    expect(PIPELINE_LIST_COLUMNS.map((c) => c.id)).not.toContain("coverageA");
    expect((TABLE_COLUMNS.deals ?? []).map((c) => c.key)).not.toContain("assigned");
    expect((TABLE_COLUMNS.leads ?? []).map((c) => c.key)).not.toContain("preferredLanguage");
  });

  it("offers Coverage value only when Edit Layout has coverage_a", () => {
    const layout: FieldLayout = {
      columns: [
        {
          id: "left",
          sections: [{ id: "cov", label: "Coverage", fieldKeys: ["coverage_a", "assigned"] }],
        },
        { id: "right", sections: [] },
      ],
    };
    const keys = dealsColumnsFromFields(CORE_FIELDS, layout).map((c) => c.key);
    expect(keys).toContain("value");
    expect(keys).toContain("assigned");
    expect(keys).toContain("premium");
    expect(pipelineListColumnsFromLayout(layout).map((c) => c.id)).toContain("coverageA");
  });

  it("builds Leads picker from layout + locked name/status/tags/activity", () => {
    expect(LEADS_LIST_COLUMNS.find((c) => c.id === "name")?.locked).toBe(true);
    expect(LEADS_LIST_COLUMNS.find((c) => c.id === "status")?.locked).toBe(true);
    expect(LEADS_LIST_COLUMNS.find((c) => c.id === "timer")?.locked).toBe(true);
    expect(LEADS_LIST_COLUMNS.find((c) => c.id === "tags")?.locked).toBe(true);
    expect(allColumnIds(LEADS_LIST_COLUMNS)).toContain("source");
    expect(allColumnIds(LEADS_LIST_COLUMNS)).toContain("notes");
    expect(allColumnIds(LEADS_LIST_COLUMNS)).not.toContain("preferred_language");
    expect(allColumnIds(LEADS_LIST_COLUMNS)).not.toContain("dependents");
    const empty: FieldLayout = {
      columns: [
        { id: "left", sections: [{ id: "x", label: "X", fieldKeys: [] }] },
        { id: "right", sections: [] },
      ],
    };
    expect(leadsListColumnsFromLayout(empty).map((c) => c.id)).not.toContain("source");
  });

  it("keeps Columns + ⋯ in list chrome (mass-bar / pipeline header)", () => {
    expect(source("src/components/lists/column-table.tsx")).toMatch(/ListColumnsChrome/);
    expect(source("src/components/lists/column-table.tsx")).toMatch(/ColumnsMenu/);
    expect(source("src/components/developer-hub/list-selection.tsx")).toMatch(/data-ff-list-chrome/);
    expect(source("src/components/pipeline/workspace.tsx")).toMatch(/data-ff-list-chrome/);
    expect(source("src/components/deals/deals-table.tsx")).toMatch(/loadLayoutForModule\("deals"\)/);
    expect(source("src/components/deals/deals-table.tsx")).toMatch(
      /dealsListColumnsFromFields\(fields, layout\)/,
    );
    expect(source("src/app/leads/page.tsx")).toMatch(/leadsListColumnsFromLayout/);
  });
});
