import { describe, expect, it } from "vitest";
import { NOTIFICATION_LINKS, PROFILE_SETTINGS_HREF, QUICK_ACTIONS, SUPPORT_COPY, SUPPORT_HREF } from "./quick-actions";

describe("header quick actions", () => {
  it("links Add Lead / Deal / Policy / promise / Meeting to new routes", () => {
    expect(QUICK_ACTIONS.map((item) => item.label)).toEqual([
      "Add Lead",
      "Add Deal",
      "Add Policy",
      "Add promise",
      "Add Meeting",
    ]);
    expect(QUICK_ACTIONS.map((item) => item.href)).toEqual([
      "/leads/new",
      "/deals/new",
      "/policies/new",
      "/notifications?newCommitment=1#commitments",
      "/meetings/new",
    ]);
  });

  it("keeps help copy and profile settings href", () => {
    expect(SUPPORT_HREF).toBe("/support");
    expect(SUPPORT_COPY).toBe("How-to and Q&A live in the desk help panel.");
    expect(PROFILE_SETTINGS_HREF).toBe("/settings/my-desk");
    expect(NOTIFICATION_LINKS.map((link) => link.href)).toEqual([
      "/notifications",
      "/work-queue",
      "/notifications#commitments",
      "/calendar",
    ]);
    expect(NOTIFICATION_LINKS[0]?.label).toBe("Notifications");
  });
});
