import { describe, expect, it } from "vitest";
import { emailFromUsername, invitePath, isTokenLive, normalizeLogin, resetPath, usernameFromEmail } from "./tokens";

describe("invite and reset stubs", () => {
  it("builds invite and reset paths without colliding IDs", () => {
    expect(invitePath("abc123")).toBe("/login/invite?token=abc123");
    expect(resetPath("xyz")).toBe("/login/reset?token=xyz");
  });

  it("treats expired or empty tokens as dead", () => {
    expect(isTokenLive("live", new Date(Date.now() + 60_000))).toBe(true);
    expect(isTokenLive("live", new Date(Date.now() - 1))).toBe(false);
    expect(isTokenLive("", new Date(Date.now() + 60_000))).toBe(false);
    expect(isTokenLive("live", null)).toBe(false);
  });

  it("normalizes username or email login", () => {
    expect(normalizeLogin(" Maya@FitFirst.local ")).toBe("maya@fitfirst.local");
    expect(emailFromUsername("Luis")).toBe("luis@fitfirst.local");
    expect(usernameFromEmail("maya@fitfirst.local")).toBe("maya");
  });
});
