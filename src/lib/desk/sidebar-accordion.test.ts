import { describe, expect, it } from "vitest";
import { primaryIdForPath } from "@/lib/desk/nav-layout";
import { parseSidebarPrefs, resolveOpenSection, toggleAccordionId } from "./sidebar-accordion";

describe("sidebar accordion", () => {
  it("opens one primary and closes it on a second chevron click", () => {
    expect(toggleAccordionId("", "leads")).toBe("leads");
    expect(toggleAccordionId("leads", "policies")).toBe("policies");
    expect(toggleAccordionId("policies", "policies")).toBe("");
    expect(toggleAccordionId("deals", "not-a-primary")).toBe("deals");
  });

  it("auto-opens the primary that owns the current route", () => {
    expect(primaryIdForPath("/contacts")).toBe("contacts");
    expect(primaryIdForPath("/contacts/abc")).toBe("contacts");
    expect(primaryIdForPath("/quotes")).toBe("deals");
    expect(primaryIdForPath("/policies")).toBe("policies");
    expect(primaryIdForPath("/settings/import-export")).toBe("settings");
    expect(primaryIdForPath("/calendar")).toBe("calendar");
    expect(primaryIdForPath("/")).toBe("");
  });

  it("lets every section stay closed on Home, but restores last-open", () => {
    expect(resolveOpenSection("/", "")).toBe("");
    expect(resolveOpenSection("/", "leads")).toBe("leads");
    expect(resolveOpenSection("/", "bogus")).toBe("");
  });

  it("prefers the active route over a remembered section", () => {
    expect(resolveOpenSection("/leads", "settings")).toBe("leads");
    expect(resolveOpenSection("/settings/phone", "contacts")).toBe("settings");
    expect(resolveOpenSection("/notifications", "policies")).toBe("calendar");
    expect(resolveOpenSection("/pipeline", "contacts")).toBe("deals");
    expect(resolveOpenSection("/deals", "contacts")).toBe("deals");
  });

  it("parses last-open and rail prefs from localStorage JSON", () => {
    expect(parseSidebarPrefs(null)).toEqual({ openId: "", rail: "expanded" });
    expect(parseSidebarPrefs("not-json")).toEqual({ openId: "", rail: "expanded" });
    expect(parseSidebarPrefs('{"openId":"policies","rail":"narrow"}')).toEqual({
      openId: "policies",
      rail: "narrow",
    });
    expect(parseSidebarPrefs('{"openId":"nope","rail":"wide"}')).toEqual({
      openId: "",
      rail: "expanded",
    });
  });
});
