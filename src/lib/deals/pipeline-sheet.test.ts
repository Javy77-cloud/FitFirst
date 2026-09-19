import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  isPipelineGridEditable,
  listStageFilterHref,
  matchNamedRecord,
  nativePicklistOptions,
  pipelineGridControl,
  pipelineListNav,
} from "./pipeline-sheet";
import { isPipelineSheetView, parsePipelineView } from "@/lib/wire/pipeline";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("pipeline list / grid sheet", () => {
  it("treats table bookmarks as List and adds Grid next to Board / Funnel", () => {
    expect(parsePipelineView("table")).toBe("list");
    expect(parsePipelineView("list")).toBe("list");
    expect(parsePipelineView("grid")).toBe("grid");
    expect(isPipelineSheetView("list")).toBe(true);
    expect(isPipelineSheetView("grid")).toBe(true);
    expect(isPipelineSheetView("board")).toBe(false);
    const bar = source("src/components/deals/deal-workspace-bar.tsx");
    expect(bar).toMatch(/\["list", "List"\]/);
    expect(bar).toMatch(/\["grid", "Grid"\]/);
    expect(bar).toMatch(/aria-label=\{isRenewals \? "List Grid Board Funnel" : "Stack Radar"\}/);
    expect(source("src/app/deals/page.tsx")).toMatch(/DealsCommandWorkspace/);
    expect(source("src/components/deals/deals-table.tsx")).toMatch(/data-ff-pipe-mode=\{mode\}/);
  });

  it("navigates List cells to the related record or field destination", () => {
    expect(pipelineListNav({ columnId: "title", dealId: "d1" })).toEqual({
      href: "/deals/d1",
      kind: "deal",
    });
    expect(
      pipelineListNav({
        columnId: "stage",
        dealId: "d1",
        pipelineSlug: "p-c",
        stageSlug: "quote_sent",
        view: "list",
      }),
    ).toEqual({
      href: "/deals?view=list&stage=quote_sent",
      kind: "stage",
    });
    expect(
      pipelineListNav({
        columnId: "stage",
        dealId: "d1",
        stageSlug: "quote_sent",
        view: "list",
      }),
    ).toEqual({
      href: "/deals?view=list&stage=quote_sent",
      kind: "stage",
    });
    expect(
      pipelineListNav({
        columnId: "carrier",
        dealId: "d1",
        raw: "Citizens",
        carriers: [{ id: "c1", name: "Citizens" }],
      }),
    ).toEqual({ href: "/carriers/c1", kind: "carrier" });
    expect(
      pipelineListNav({
        columnId: "assigned",
        dealId: "d1",
        ownerId: "u9",
      }),
    ).toEqual({ href: "/settings/agents/u9", kind: "agent" });
    expect(
      pipelineListNav({
        columnId: "phone",
        dealId: "d1",
        raw: "(321) 555-0144",
      })?.kind,
    ).toBe("tel");
    expect(
      pipelineListNav({
        columnId: "email",
        dealId: "d1",
        raw: "ana@example.com",
      }),
    ).toEqual({ href: "mailto:ana@example.com", kind: "email" });
    expect(
      pipelineListNav({
        columnId: "named_insured",
        dealId: "d1",
        contactId: "ct1",
      }),
    ).toEqual({ href: "/contacts/ct1", kind: "contact" });
    expect(matchNamedRecord("citizens", [{ id: "c1", name: "Citizens" }])?.id).toBe("c1");
  });

  it("sets stage filter only and never forces the book chip to P&C", () => {
    expect(listStageFilterHref({ stageSlug: "gather", view: "list" })).toBe(
      "/deals?view=list&stage=gather",
    );
    expect(
      pipelineListNav({
        columnId: "stage",
        dealId: "life-deal",
        pipelineSlug: "p-c",
        stageSlug: "gather",
        view: "list",
      }),
    ).toEqual({
      href: "/deals?view=list&stage=gather",
      kind: "stage",
    });
    expect(
      pipelineListNav({
        columnId: "stage",
        dealId: "life-deal",
        pipelineSlug: "life",
        stageSlug: "gather",
        view: "list",
      })?.href,
    ).toBe("/deals?view=list&stage=gather");
    expect(
      pipelineListNav({
        columnId: "stage",
        dealId: "life-deal",
        pipelineSlug: "p-c",
        filterPipeline: "life",
        stageSlug: "gather",
        view: "list",
      }),
    ).toEqual({
      href: "/deals?pipeline=life&view=list&stage=gather",
      kind: "stage",
    });
    expect(
      pipelineListNav({
        columnId: "stage",
        dealId: "d1",
        filterPipeline: "p-c",
        pcSub: "home",
        stageSlug: "gather",
        view: "list",
      })?.href,
    ).toBe("/deals?pipeline=p-c&view=list&stage=gather&pcSub=home");
    const table = source("src/components/deals/deals-table.tsx");
    expect(table).toMatch(/attachListProductStageHrefs/);
    expect(table).not.toMatch(/filterPipeline: listFilter\.pipeline/);
    expect(table).not.toMatch(/pipelineSlug: stage\.pipelineSlug,\s*\n\s*stageSlug/);
    expect(source("src/components/deals/deals-table.tsx")).toMatch(/listFilter/);
    expect(source("src/lib/deals/pipeline-sheet.ts")).toMatch(/listStageFilterHref/);
    expect(source("src/lib/deals/pipeline-sheet.ts")).not.toMatch(
      /pipeline: input\.pipelineSlug \|\| undefined/,
    );
  });

  it("keeps system columns read-only in Grid and maps field types to controls", () => {
    expect(isPipelineGridEditable("title")).toBe(false);
    expect(isPipelineGridEditable("picklist_5n3i")).toBe(false);
    expect(isPipelineGridEditable("picklist")).toBe(false);
    expect(isPipelineGridEditable("updated")).toBe(false);
    expect(isPipelineGridEditable("tags")).toBe(false);
    expect(isPipelineGridEditable("stage")).toBe(true);
    expect(isPipelineGridEditable("phone", { key: "phone", label: "Phone", type: "phone" })).toBe(
      true,
    );
    expect(
      isPipelineGridEditable("dwell_pct", { key: "dwell_pct", label: "Formula", type: "formula" }),
    ).toBe(false);
    expect(pipelineGridControl("stage")).toBe("picklist");
    expect(pipelineGridControl("line")).toBe("picklist");
    expect(pipelineGridControl("source")).toBe("picklist");
    expect(pipelineGridControl("assigned")).toBe("picklist");
    expect(pipelineGridControl("value")).toBe("currency");
    expect(pipelineGridControl("notes", { key: "notes", label: "Notes", type: "multi_line" })).toBe(
      "multiline",
    );
    expect(
      pipelineGridControl("plan_type", { key: "plan_type", label: "Plan", type: "picklist" }),
    ).toBe("picklist");
    expect(nativePicklistOptions("line").some((row) => row.value === "HO")).toBe(true);
    expect(nativePicklistOptions("source").some((row) => row.value === "referral")).toBe(true);
  });

  it("persists Grid cells through saveDealPipelineCell and toasts on success", () => {
    const cell = source("src/components/deals/pipeline-grid-cell.tsx");
    expect(cell).toMatch(/saveDealPipelineCell/);
    expect(cell).toMatch(/flashAction\("deal-updated"\)/);
    expect(cell).toMatch(/onBlur/);
    expect(cell).toMatch(/Enter/);
    expect(source("src/app/actions/pipeline-sheet.ts")).toMatch(/export async function saveDealPipelineCell/);
    expect(source("src/app/actions/pipeline-sheet.ts")).toMatch(/writeRecordValues/);
    expect(source("src/components/deals/deal-stage-select.tsx")).toMatch(/toastOnSave/);
    expect(source("src/components/deals/deals-table.tsx")).toMatch(/PipelineGridCell/);
    expect(source("src/components/deals/deals-table.tsx")).toMatch(/PipelineListValue/);
    expect(source("src/components/deals/deals-table.tsx")).toMatch(/toastOnSave/);
  });

  it("keeps Notes one line tall until focus, then expands and saves on blur", () => {
    const cell = source("src/components/deals/pipeline-grid-cell.tsx");
    expect(cell).toMatch(/MultilineNotesCell/);
    expect(cell).toMatch(/data-ff-notes-expanded/);
    expect(cell).toMatch(/onFocus=\{\(\) => setExpanded\(true\)\}/);
    expect(cell).toMatch(/rows=\{expanded \? 2 : 1\}/);
    expect(cell).toMatch(/min-h-\[2\.75rem\]/);
    expect(cell).toMatch(/box-border w-full min-w-0/);
    expect(cell).toMatch(/style=\{\{ width: "100%" \}\}/);
    expect(cell).not.toMatch(/min-w-\[8rem\]/);
    expect(cell).toMatch(/whitespace-nowrap/);
    expect(cell).toMatch(/text-ellipsis/);
    expect(cell).not.toMatch(/rows=\{expanded \? 4 : 1\}/);
    const table = source("src/components/deals/deals-table.tsx");
    expect(table).toMatch(/control === "multiline"/);
    expect(table).toMatch(/mode === "grid" \|\| control === "multiline"/);
    expect(table).toMatch(/DealListProductNotes/);
    expect(source("src/components/deals/deal-list-product-notes.tsx")).toMatch(/saveDealProductListNote/);
    expect(source("src/components/deals/deal-list-product-notes.tsx")).toMatch(
      /data-ff-deal-list-product-notes/,
    );
    expect(source("src/components/deals/deal-list-product-notes.tsx")).toMatch(/sr-only/);
    expect(source("src/components/deals/deal-list-product-notes.tsx")).not.toMatch(
      /uppercase tracking-wide text-muted-foreground/,
    );
  });
});
