import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { insertIndexFromClientY } from "./layout";
import {
  FIELD_ROW_MENU_EXCLUDED,
  FIELD_ROW_MENU_ITEMS,
  LOOKUP_MODULES,
  defaultFieldPermissions,
  parseFieldPermissions,
} from "./types";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("sep7bo field builder rows, palette, preview drag", () => {
  it("renders every field as a collapsed row with the four-item menu", () => {
    const builder = source("src/components/custom-fields/field-builder.tsx");
    expect(builder).toMatch(/data-ff-field-row="collapsed"/);
    expect(builder).toMatch(/data-ff-field-menu=/);
    expect(builder).toMatch(/data-ff-field-menu-items=/);
    expect(builder).toMatch(/MoreHorizontal/);
    for (const item of FIELD_ROW_MENU_ITEMS) {
      expect(builder).toMatch(item);
    }
    expect(builder).toMatch(/data-ff-field-menu-item="required"/);
    expect(builder).toMatch(/data-ff-field-menu-item="permissions"/);
    expect(builder).toMatch(/data-ff-field-menu-item="properties"/);
    expect(builder).toMatch(/data-ff-field-menu-item="remove"/);
    for (const excluded of FIELD_ROW_MENU_EXCLUDED) {
      expect(builder).not.toMatch(excluded);
    }
    expect(builder).not.toMatch(/Create layout rules/);
    expect(builder).not.toMatch(/Validation rule/);
    expect(FIELD_ROW_MENU_ITEMS).toEqual([
      "Mark as required",
      "Set permissions",
      "Edit properties",
      "Remove field",
    ]);
  });

  it("opens Edit properties as a popup with name, type, and lookup module", () => {
    const builder = source("src/components/custom-fields/field-builder.tsx");
    expect(builder).toMatch(/data-ff-edit-properties/);
    expect(builder).toMatch(/Edit properties/);
    expect(builder).toMatch(/Field name/);
    expect(builder).toMatch(/data-ff-field-type=/);
    expect(builder).toMatch(/data-ff-lookup-module=/);
    expect(builder).toMatch(/LOOKUP_MODULES/);
    expect(LOOKUP_MODULES.map((module) => module.value)).toEqual([
      "contacts",
      "accounts",
      "leads",
      "deals",
      "users",
    ]);
    expect(builder).toMatch(/data-ff-set-permissions/);
    expect(builder).toMatch(/Set permissions/);
    expect(defaultFieldPermissions()).toEqual({ admin: "write", agent: "write" });
    expect(parseFieldPermissions({ admin: "read", agent: "hidden" })).toEqual({
      admin: "read",
      agent: "hidden",
    });
  });

  it("keeps preview editable so fields can be dropped between existing ones", () => {
    const builder = source("src/components/custom-fields/field-builder.tsx");
    expect(builder).toMatch(/insertIndexFromClientY/);
    expect(builder).not.toMatch(/if \(preview\) return/);
    expect(builder).not.toMatch(/if \(!drag \|\| preview\) return/);
    expect(builder).not.toMatch(/draggable=\{!preview\}/);
    expect(builder).toMatch(/data-ff-preview-field/);
    expect(builder).toMatch(/including in Preview/);
    const drop = insertIndexFromClientY(40, [
      { key: "a", top: 0, height: 30 },
      { key: "b", top: 40, height: 30 },
    ]);
    expect(drop.beforeKey).toBe("b");
  });

  it("ships an additive slash-title migrate and does not seed-wipe", () => {
    const sql = source("drizzle/0087_deal_title_slashes.sql");
    expect(sql).toMatch(/concat_ws\(' \/ '/);
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS "permissions"/);
    expect(sql).toMatch(/Additive only/);
    expect(sql).not.toMatch(/DROP TABLE/);
    expect(sql).not.toMatch(/db:seed/);
    expect(source("drizzle/meta/_journal.json")).toMatch(/0087_deal_title_slashes/);
    expect(source("src/lib/deals/deal-title.ts")).toMatch(/Javier \/ Canales \/ Home/);
    expect(source("src/lib/deals/retitle.ts")).toMatch(/First \/ Last \/ Lob/);
  });
});
