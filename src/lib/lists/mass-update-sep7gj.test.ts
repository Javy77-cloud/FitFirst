import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("sep7gj wiring — Mass Update follows Columns picker catalog", () => {
  it("ColumnTable reports available columns into list selection", () => {
    const table = source("src/components/lists/column-table.tsx");
    expect(table).toMatch(/ListVisibleColumnsReporter/);
    expect(table).toMatch(/setVisibleColumns/);
  });

  it("ListMassBar builds Mass Update fields from the full column catalog", () => {
    const bar = source("src/components/developer-hub/list-selection.tsx");
    expect(bar).toMatch(/massUpdateColumnsFromCatalog/);
    expect(bar).toMatch(/setVisibleColumns/);
    expect(bar).not.toMatch(/massUpdateColumnsFromVisible\(/);
    expect(bar).not.toMatch(/MASS_UPDATE_FIELDS\.map/);
  });

  it("Mass Update menu renders catalog column labels, not the fixed legacy set", () => {
    const menu = source("src/components/lists/mass-update.tsx");
    expect(menu).toMatch(/fields\?: ListColumn\[\]/);
    expect(menu).toMatch(/form\.set\("columnId"/);
    expect(menu).not.toMatch(/MASS_UPDATE_FIELDS/);
  });

  it("deals mass-update reuses saveDealPipelineCell for catalog columns like Selling Agency", () => {
    const action = source("src/app/actions/mass-update.ts");
    expect(action).toMatch(/saveDealPipelineCell/);
    expect(action).toMatch(/columnId/);
    expect(action).toMatch(/applyBusinessColumn/);
    expect(action).toMatch(/applyCarrierColumn/);
  });
});
