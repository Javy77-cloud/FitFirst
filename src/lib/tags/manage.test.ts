import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { deleteTagFromList, mergeTagInList, renameTagInList } from "./manage";

function source(file: string) {
  return readFileSync(file, "utf8");
}

describe("module tag manage + deal chip remove", () => {
  it("shows × on hover and a Manage tags link on RecordTags", () => {
    const chips = source("src/components/tags/record-tags.tsx");
    expect(chips).toMatch(/data-ff-tag-remove/);
    expect(chips).toMatch(/group-hover:inline/);
    expect(chips).toMatch(/data-ff-manage-tags/);
    expect(chips).toMatch(/\/settings\/tags\?module=/);
    expect(chips).not.toMatch(/onClick=\{\(\) => remove\(tag\)\}[\s\S]*\{formatTagLabel\(tag\)\} ×/);
  });

  it("opens a global module tag manager with rename, merge, and delete", () => {
    const page = source("src/app/settings/tags/page.tsx");
    expect(page).toMatch(/renameModuleTag/);
    expect(page).toMatch(/mergeModuleTag/);
    expect(page).toMatch(/deleteModuleTag/);
    expect(page).toMatch(/data-ff-tag-manager/);
    expect(page).toMatch(/HardDeleteForm/);
    expect(source("src/app/actions/record-tags.ts")).toMatch(/export async function renameModuleTag/);
    expect(source("src/app/actions/record-tags.ts")).toMatch(/export async function mergeModuleTag/);
    expect(source("src/app/actions/record-tags.ts")).toMatch(/export async function deleteModuleTag/);
  });

  it("renames, merges, and deletes tags without duplicating chips", () => {
    expect(renameTagInList(["hot", "referral"], "hot", "priority")).toEqual(["priority", "referral"]);
    expect(mergeTagInList(["hot", "priority"], "hot", "priority")).toEqual(["priority"]);
    expect(deleteTagFromList(["hot", "referral"], "hot")).toEqual(["referral"]);
  });
});
