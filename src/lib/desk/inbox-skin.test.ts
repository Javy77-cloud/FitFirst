import { describe, expect, it } from "vitest";
import { INBOX_SKINS, inboxSkinListRole, resolveInboxSkin } from "./inbox-skin";

describe("inbox provider skins", () => {
  it("uses the Gmail skin first and keeps an Outlook hook", () => {
    expect(resolveInboxSkin("gmail")).toBe("gmail");
    expect(resolveInboxSkin("outlook")).toBe("outlook");
    expect(inboxSkinListRole("gmail")).toBe("gmail-list");
    expect(inboxSkinListRole("outlook")).toBe("outlook-list");
    expect(INBOX_SKINS).toEqual(["gmail", "outlook"]);
  });

  it("never invents a Yahoo mail skin — Yahoo stays stubbed", () => {
    expect(resolveInboxSkin("yahoo")).toBe("gmail");
    expect(INBOX_SKINS).not.toContain("yahoo");
  });
});
