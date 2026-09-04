import { describe, expect, it } from "vitest";
import { NOTIFICATION_LINKS, PROFILE_SETTINGS_HREF, QUICK_ACTIONS, SUPPORT_COPY, SUPPORT_HREF } from "./quick-actions";

describe("header quick actions", () => {
  it("links Add Lead / Deal / Policy / Task / Meeting to new routes", () => {
    expect(QUICK_ACTIONS.map((item) => item.label)).toEqual([
      "Add Lead",
      "Add Deal",
      "Add Policy",
      "Add Task",
      "Add Meeting",
    ]);
    expect(QUICK_ACTIONS.map((item) => item.href)).toEqual([
      "/leads/new",
      "/deals/new",
      "/policies/new",
      "/tasks/new",
      "/meetings/new",
    ]);
  });

  it("keeps the Support stub copy and profile settings href", () => {
    expect(SUPPORT_HREF).toBe("/support");
    expect(SUPPORT_COPY).toBe("Coming soon — we'll wire this later.");
    expect(PROFILE_SETTINGS_HREF).toBe("/settings/my-desk");
    expect(NOTIFICATION_LINKS.some((link) => link.href === "/alerts")).toBe(true);
  });
});
