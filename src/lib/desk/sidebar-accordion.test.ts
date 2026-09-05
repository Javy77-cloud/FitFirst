import { describe, expect, it } from "vitest";
import { groupIdForPath } from "@/components/desk-nav-groups";
import {
  parseSidebarPrefs,
  resolveOpenSection,
  toggleAccordionId,
} from "./sidebar-accordion";

describe("sidebar accordion", () => {
  it("opens one section and closes it on a second click", () => {
    expect(toggleAccordionId("", "work")).toBe("work");
    expect(toggleAccordionId("work", "accounts")).toBe("accounts");
    expect(toggleAccordionId("accounts", "accounts")).toBe("");
    expect(toggleAccordionId("records", "not-a-group")).toBe("records");
  });

  it("auto-opens the section that owns the current route", () => {
    expect(groupIdForPath("/contacts")).toBe("accounts");
    expect(groupIdForPath("/contacts/abc")).toBe("accounts");
    expect(groupIdForPath("/quotes")).toBe("work");
    expect(groupIdForPath("/policies")).toBe("records");
    expect(groupIdForPath("/settings/import-export")).toBe("settings");
    expect(groupIdForPath("/calendar")).toBe("desk");
    expect(groupIdForPath("/")).toBe("");
  });

  it("lets every section stay closed on Home, but restores last-open", () => {
    expect(resolveOpenSection("/", "")).toBe("");
    expect(resolveOpenSection("/", "work")).toBe("work");
    expect(resolveOpenSection("/", "bogus")).toBe("");
  });

  it("prefers the active route over a remembered section", () => {
    expect(resolveOpenSection("/leads", "settings")).toBe("work");
    expect(resolveOpenSection("/settings/phone", "accounts")).toBe("settings");
    expect(resolveOpenSection("/notifications", "records")).toBe("desk");
  });

  it("parses last-open and rail prefs from localStorage JSON", () => {
    expect(parseSidebarPrefs(null)).toEqual({ openId: "", rail: "expanded" });
    expect(parseSidebarPrefs("not-json")).toEqual({ openId: "", rail: "expanded" });
    expect(parseSidebarPrefs('{"openId":"records","rail":"narrow"}')).toEqual({
      openId: "records",
      rail: "narrow",
    });
    expect(parseSidebarPrefs('{"openId":"nope","rail":"wide"}')).toEqual({
      openId: "",
      rail: "expanded",
    });
  });
});
