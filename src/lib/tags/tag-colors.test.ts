import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  colorsFromModuleTags,
  contrastTextOn,
  DEFAULT_TAG_PICKER_COLOR,
  normalizeTagColor,
  parseTagColors,
  serializeTagColors,
  tagChipStyle,
} from "./tag-colors";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("tag colors", () => {
  it("normalizes hex and serializes a persistable color map", () => {
    expect(normalizeTagColor("#AbC")).toBe("#aabbcc");
    expect(normalizeTagColor("#1D4E89")).toBe("#1d4e89");
    expect(normalizeTagColor("navy")).toBeNull();
    expect(normalizeTagColor("")).toBeNull();
    expect(serializeTagColors({ shopping: "#ff0000", urgent: "nope" })).toBe("shopping:#ff0000");
    expect(parseTagColors("shopping:#ff0000,urgent:#00ff00")).toEqual({
      shopping: "#ff0000",
      urgent: "#00ff00",
    });
    expect(colorsFromModuleTags([{ name: "hot", color: "#112233" }, { name: "web", color: null }])).toEqual({
      hot: "#112233",
    });
    expect(contrastTextOn("#ffffff")).toBe("#0f1b2d");
    expect(contrastTextOn("#1d4e89")).toBe("#ffffff");
    expect(tagChipStyle("#ff6600")).toEqual({ backgroundColor: "#ff6600", color: "#ffffff" });
    expect(tagChipStyle(null)).toBeUndefined();
    expect(DEFAULT_TAG_PICKER_COLOR).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("edits colors only from the module catalog manager", () => {
    const record = source("src/components/tags/record-tags.tsx");
    const assign = source("src/components/tags/assign-record-tags.tsx");
    const lists = source("src/components/tags/tag-chips.tsx");
    const settings = source("src/app/settings/tags/page.tsx");
    const dialog = source("src/components/tags/manage-tags-dialog.tsx");
    const actions = source("src/app/actions/record-tags.ts");
    const schema = source("src/lib/db/schema.ts");
    const migrate = source("drizzle/0084_tag_colors.sql");
    expect(record).not.toMatch(/data-ff-tag-color-picker/);
    expect(assign).not.toMatch(/data-ff-tag-color-picker/);
    expect(lists).toMatch(/data-ff-tag-color=/);
    expect(lists).toMatch(/tagChipStyle/);
    expect(settings).toMatch(/updateModuleTagColor/);
    expect(settings).toMatch(/Save color/);
    expect(settings).toMatch(/data-ff-tag-color-picker/);
    expect(settings).toMatch(/data-ff-tag-color-edit/);
    expect(dialog).toMatch(/data-ff-tag-color-picker/);
    expect(dialog).toMatch(/updateModuleTagColor/);
    expect(actions).toMatch(/export async function updateModuleTagColor/);
    expect(actions).toMatch(/onConflictDoUpdate/);
    expect(schema).toMatch(/color: text\("color"\)/);
    expect(migrate).toMatch(/ADD COLUMN IF NOT EXISTS "color"/);
    expect(migrate).toMatch(/Additive only/);
    expect(migrate).not.toMatch(/DROP TABLE/);
    expect(migrate).not.toMatch(/db:seed wipe/);
  });
});
