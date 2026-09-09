import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { listSelectionActions, type SelectionRecord } from "./selection-actions";

function source(file: string) {
  return readFileSync(file, "utf8");
}

function rec(partial: Partial<SelectionRecord> & { id: string }): SelectionRecord {
  return { label: partial.label ?? partial.id, ...partial };
}

describe("sep7gk — Actions Attach document with deal pre-selected", () => {
  it("exposes Attach document on deals for a single selection", () => {
    const one = listSelectionActions({
      module: "deals",
      selected: [rec({ id: "d1", label: "Gonzalez · HO3" })],
    });
    const action = one.find((item) => item.id === "attach_document");
    expect(action?.enabled).toBe(true);
    expect(action?.label).toBe("Attach document");

    const multi = listSelectionActions({
      module: "deals",
      selected: [rec({ id: "d1" }), rec({ id: "d2" })],
    });
    expect(multi.find((item) => item.id === "attach_document")?.enabled).toBe(false);

    const leads = listSelectionActions({
      module: "leads",
      selected: [rec({ id: "l1" })],
    });
    expect(leads.find((item) => item.id === "attach_document")).toBeUndefined();
  });

  it("Actions menu opens the locked DealDocsUpload dialog", () => {
    const menu = source("src/components/lists/selection-actions-menu.tsx");
    expect(menu).toMatch(/attach_document/);
    expect(menu).toMatch(/DealDocsUpload/);
    expect(menu).toMatch(/lockedDeal/);
    expect(menu).toMatch(/deal-attach-from-actions/);
    expect(menu).toMatch(/setAttachOpen\(true\)/);
  });

  it("DealDocsUpload locks the deal name when lockedDeal is set", () => {
    const upload = source("src/components/deal/deal-docs-upload.tsx");
    expect(upload).toMatch(/lockedDeal/);
    expect(upload).toMatch(/deal-docs-locked-name/);
    expect(upload).toMatch(/data-deal-locked/);
    expect(upload).toMatch(/Attach documents to a deal/);
  });
});
