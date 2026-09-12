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

  it("missing when any piece absent", () => {
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
