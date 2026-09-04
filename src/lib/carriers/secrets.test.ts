import { describe, expect, it } from "vitest";
import { decryptSecret } from "@/lib/secrets/vault";
import {
  publicCarrierView,
  quoteHandoffReadiness,
  replacePortalPassword,
  replacePortalUsername,
  writePortalPassword,
  writePortalUsername,
} from "./secrets";
import type { Carrier } from "@/lib/db/schema";

function fakeCarrier(overrides: Partial<Carrier> = {}): Carrier {
  return {
    id: "33333333-3333-4333-8333-333333333331",
    tenantId: "11111111-1111-4111-8111-111111111111",
    name: "American Traditions",
    naic: "12359",
    writtenLines: ["HO"],
    dontWriteNotes: null,
    portalStatus: "open",
    portalUrl: "https://agents.amtraditions.example",
    portalLogin: "AT agent",
    agencyCode: "FF-AT-1048",
    portalUsernameEnc: null,
    portalUsernameIv: null,
    portalUsernameHint: null,
    portalPasswordEnc: null,
    portalPasswordIv: null,
    portalSecretsUpdatedAt: null,
    customerServicePhone: null,
    agentPhone: null,
    website: null,
    agentPortalUrl: null,
    carrierInfo: null,
    amBestRating: null,
    underwriterName: null,
    underwriterEmail: null,
    underwriterPhone: null,
    accountManagerName: null,
    accountManagerEmail: null,
    accountManagerPhone: null,
    claimsPhone: null,
    billingPhone: null,
    newBusinessCommPct: null,
    renewalCommPct: null,
    territory: "Florida",
    preferredSubmission: "portal",
    bindingAuthority: "limited",
    appetiteNotes: null,
    active: true,
    fixtureTag: "portal-demo",
    createdAt: new Date("2026-09-04T00:00:00.000Z"),
    updatedAt: new Date("2026-09-04T00:00:00.000Z"),
    ...overrides,
  };
}

describe("carrier portal secrets", () => {
  it("encrypts username and password without keeping plaintext columns", () => {
    const user = writePortalUsername("fitfirst.at.demo");
    const pass = writePortalPassword("AT-portal-demo-2026");
    expect(user.portalUsernameHint).toBe("fi••••mo");
    expect(user.portalUsernameEnc?.includes("fitfirst")).toBe(false);
    expect(pass.portalPasswordEnc?.includes("AT-portal")).toBe(false);
    expect(decryptSecret(user.portalUsernameEnc!, user.portalUsernameIv!)).toBe("fitfirst.at.demo");
    expect(decryptSecret(pass.portalPasswordEnc!, pass.portalPasswordIv!)).toBe("AT-portal-demo-2026");
  });

  it("keeps the vault when the form sent a mask or blank", () => {
    const existingUser = writePortalUsername("fitfirst.at.demo");
    const existingPass = writePortalPassword("AT-portal-demo-2026");
    expect(replacePortalUsername("fi••••mo", existingUser)).toEqual(existingUser);
    expect(replacePortalPassword("••••••••", existingPass)).toEqual(existingPass);
    expect(replacePortalUsername("", existingUser)).toEqual(existingUser);
  });

  it("hides hints and presence flags from agents", () => {
    const sealed = writePortalUsername("fitfirst.at.demo");
    const pass = writePortalPassword("AT-portal-demo-2026");
    const row = fakeCarrier({ ...sealed, ...pass });
    const admin = publicCarrierView(row, true);
    const agent = publicCarrierView(row, false);
    expect(admin.hasPortalUsername).toBe(true);
    expect(admin.hasPortalPassword).toBe(true);
    expect(admin.portalUsernameHint).toBe("fi••••mo");
    expect(admin.agencyCode).toBe("FF-AT-1048");
    expect("portalUsernameEnc" in admin).toBe(false);
    expect("portalPasswordEnc" in agent).toBe(false);
    expect(agent.hasPortalUsername).toBe(false);
    expect(agent.hasPortalPassword).toBe(false);
    expect(agent.portalUsernameHint).toBeNull();
    expect(agent.agencyCode).toBe("FF-AT-1048");
  });

  it("marks quote handoff ready only when URL, agency code, and both secrets exist", () => {
    const missing = quoteHandoffReadiness({
      portalUrl: "https://agents.amtraditions.example",
      agencyCode: "FF-AT-1048",
      hasPortalUsername: true,
      hasPortalPassword: false,
    });
    expect(missing.ready).toBe(false);
    expect(missing.missing).toEqual(["Portal password"]);
    const ready = quoteHandoffReadiness({
      portalUrl: "https://agents.amtraditions.example",
      agencyCode: "FF-AT-1048",
      hasPortalUsername: true,
      hasPortalPassword: true,
    });
    expect(ready.ready).toBe(true);
    expect(ready.missing).toEqual([]);
  });
});
