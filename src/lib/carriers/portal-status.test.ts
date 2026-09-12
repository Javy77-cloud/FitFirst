import { describe, expect, it } from "vitest";
import { portalCredentialLabel, portalCredentialStatus } from "./portal-status";

describe("portalCredentialStatus", () => {
  it("connected when url + both secrets present", () => {
    expect(
      portalCredentialStatus({
        portalUrl: "https://agents.example",
        hasPortalUsername: true,
        hasPortalPassword: true,
      }),
    ).toBe("connected");
    expect(portalCredentialLabel("connected")).toBe("Connected");
  });

  it("no_portal when nothing started", () => {
    expect(
      portalCredentialStatus({
        portalUrl: null,
        hasPortalUsername: false,
        hasPortalPassword: false,
      }),
    ).toBe("no_portal");
    expect(portalCredentialLabel("no_portal")).toBe("No portal linked");
  });

  it("missing when any piece started but incomplete", () => {
    expect(
      portalCredentialStatus({
        portalUrl: "https://agents.example",
        hasPortalUsername: true,
        hasPortalPassword: false,
      }),
    ).toBe("missing_credentials");
    expect(portalCredentialLabel("missing_credentials")).toBe("Missing credentials");
  });
});
