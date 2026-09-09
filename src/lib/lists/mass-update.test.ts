import { describe, expect, it } from "vitest";
import {
  dealStagePatch,
  isManualBindStage,
  isMassUpdateColumn,
  massUpdateAppliesTo,
  massUpdateColumnsFromVisible,
  massUpdateSellingAgencyOptions,
  massUpdateStatusOptions,
  normalizeMassUpdateColumnId,
  selectAllMode,
} from "./mass-update";
import type { ListColumn } from "@/lib/list-columns";

describe("mass update", () => {
  it("keeps Bound off the deal status menu — bind is signature-only", () => {
    const values = massUpdateStatusOptions("deals").map((row) => row.value);
    expect(values).not.toContain("bound");
    expect(values).not.toContain("closed_won");
    expect(isManualBindStage("bound")).toBe(true);
    expect(dealStagePatch("quote_sent").pipelineStage).toBe("quote_sent");
  });

  it("select-all has visible-page and all-matching states", () => {
    const visible = ["a", "b"];
    const matching = ["a", "b", "c", "d"];
    expect(selectAllMode(visible, matching, [])).toBe("none");
    expect(selectAllMode(visible, matching, ["a"])).toBe("partial");
    expect(selectAllMode(visible, matching, ["a", "b"])).toBe("page");
    expect(selectAllMode(visible, matching, ["a", "b", "c", "d"])).toBe("matching");
  });

  it("offers the same fields on every CRM list", () => {
    expect(massUpdateAppliesTo("deals", "status")).toBe(true);
    expect(massUpdateAppliesTo("leads", "follow_up_template")).toBe(true);
    expect(massUpdateAppliesTo("contacts", "source")).toBe(true);
    expect(massUpdateAppliesTo("policies", "owner")).toBe(true);
    expect(massUpdateAppliesTo("deals", "custom")).toBe(true);
  });
});

describe("sep7gj mass update matches visible list columns", () => {
  const dealsColumns: ListColumn[] = [
    { id: "pick", label: "", locked: true },
    { id: "title", label: "Deal", locked: true },
    { id: "stage", label: "Stage", locked: true },
    { id: "source", label: "Source" },
    { id: "assigned", label: "Assigned" },
    { id: "tags", label: "Tags", locked: true },
    { id: "selling_agency", label: "Selling Agency", defaultOn: false },
    { id: "notes", label: "Notes", defaultOn: false },
    { id: "updated", label: "Updated", defaultOn: false },
  ];

  it("Mass Update fields = visible columns minus pick/title/tags/updated", () => {
    const visible = ["pick", "title", "stage", "source", "selling_agency", "tags"];
    const fields = massUpdateColumnsFromVisible(dealsColumns, visible);
    expect(fields.map((field) => field.id)).toEqual(["stage", "source", "selling_agency"]);
    expect(fields.map((field) => field.label)).toContain("Selling Agency");
  });

  it("when Columns visibility changes, Mass Update choices update", () => {
    const withAgency = massUpdateColumnsFromVisible(dealsColumns, [
      "pick",
      "title",
      "stage",
      "selling_agency",
    ]);
    const withoutAgency = massUpdateColumnsFromVisible(dealsColumns, ["pick", "title", "stage", "source"]);
    expect(withAgency.map((field) => field.id)).toEqual(["stage", "selling_agency"]);
    expect(withoutAgency.map((field) => field.id)).toEqual(["stage", "source"]);
    expect(withoutAgency.some((field) => field.id === "selling_agency")).toBe(false);
  });

  it("does not invent fields that are not visible columns", () => {
    const fields = massUpdateColumnsFromVisible(dealsColumns, ["pick", "title", "notes"]);
    expect(fields.map((field) => field.id)).toEqual(["notes"]);
    expect(fields.some((field) => field.id === "source")).toBe(false);
    expect(fields.some((field) => field.id === "assigned")).toBe(false);
  });

  it("stage stays mass-editable when it is a visible locked column", () => {
    expect(isMassUpdateColumn({ id: "stage", label: "Stage" })).toBe(true);
    expect(isMassUpdateColumn({ id: "title", label: "Deal" })).toBe(false);
    expect(isMassUpdateColumn({ id: "pick", label: "" })).toBe(false);
    expect(isMassUpdateColumn({ id: "tags", label: "Tags" })).toBe(false);
  });

  it("maps legacy owner/status onto deal column ids and offers Selling Agency picklist", () => {
    expect(normalizeMassUpdateColumnId("owner", "deals")).toBe("assigned");
    expect(normalizeMassUpdateColumnId("status", "deals")).toBe("stage");
    expect(massUpdateSellingAgencyOptions().map((row) => row.value)).toContain("AFA");
  });

  it("applies the same visible-column filter on Leads Mass Update", () => {
    const leadsColumns: ListColumn[] = [
      { id: "pick", label: "", locked: true },
      { id: "name", label: "Name", locked: true },
      { id: "status", label: "Status", locked: true },
      { id: "source", label: "Source" },
      { id: "timer", label: "Response", locked: true },
      { id: "notes", label: "Notes", defaultOn: false },
      { id: "tags", label: "Tags", locked: true },
    ];
    const fields = massUpdateColumnsFromVisible(leadsColumns, [
      "pick",
      "name",
      "status",
      "source",
      "timer",
      "tags",
      "notes",
    ]);
    expect(fields.map((field) => field.id)).toEqual(["status", "source", "notes"]);
  });
});
