import { describe, expect, it } from "vitest";
import { searchSettings } from "./search";

describe("settings search", () => {
  it("finds Gmail/email and Social/GBP when typing Google", () => {
    const hits = searchSettings("Google");
    const labels = hits.map((hit) => hit.label);
    const hrefs = hits.map((hit) => hit.href);
    expect(labels.some((label) => /gmail|email/i.test(label))).toBe(true);
    expect(hrefs).toContain("/settings/email");
    expect(labels.some((label) => /social|gbp/i.test(label))).toBe(true);
    expect(hrefs).toContain("/settings/social");
  });

  it("finds Communications, not the old Desk & Phone label as a card title", () => {
    const hits = searchSettings("Communications");
    expect(hits.some((hit) => hit.label === "Communications" && hit.kind === "group")).toBe(true);
    const desk = searchSettings("Desk & Phone");
    expect(desk.some((hit) => hit.href === "/settings/communications")).toBe(true);
  });

  it("returns an empty list for nonsense so the UI can show No settings match", () => {
    expect(searchSettings("zzz-no-such-setting")).toEqual([]);
    expect(searchSettings("   ")).toEqual([]);
  });

  it("links results to live hrefs and keeps Roles & access findable", () => {
    const roles = searchSettings("Roles");
    expect(roles.some((hit) => hit.href === "/settings/roles-access")).toBe(true);
    const macros = searchSettings("macros");
    expect(macros.some((hit) => hit.href === "/automations/macros")).toBe(true);
  });
});
