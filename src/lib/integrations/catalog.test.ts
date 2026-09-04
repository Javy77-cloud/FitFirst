import { describe, expect, it } from "vitest";
import {
  INTEGRATION_CATEGORIES,
  INTEGRATION_PROVIDERS,
  connectIntegrationStub,
  getIntegrationProvider,
  isIntegrationProviderId,
  providersIn,
} from "./catalog";

describe("integrations catalog", () => {
  it("lists required BYO providers and no Zoho", () => {
    const ids = INTEGRATION_PROVIDERS.map((item) => item.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        "gmail",
        "outlook",
        "yahoo",
        "mailchimp",
        "constant_contact",
        "sendgrid",
        "google_calendar",
        "outlook_calendar",
        "twilio",
        "ringcentral",
        "lightspeed_voice",
        "zoom",
        "google_meet",
        "docusign",
        "dropbox_sign",
        "facebook",
        "instagram",
        "x",
        "linkedin",
        "google_business_profile",
      ]),
    );
    expect(ids.some((id) => id.includes("zoho"))).toBe(false);
    expect(INTEGRATION_PROVIDERS.some((item) => /zoho/i.test(item.name))).toBe(false);
    expect(INTEGRATION_CATEGORIES).toEqual([
      "email",
      "campaigns",
      "calendar",
      "phone_sms",
      "video",
      "esign",
      "social",
    ]);
  });

  it("marks Lightspeed Voice optional and keeps connect as not_implemented", () => {
    expect(getIntegrationProvider("lightspeed_voice").optional).toBe(true);
    expect(providersIn("email").map((item) => item.id)).toEqual(["gmail", "outlook", "yahoo"]);
    const result = connectIntegrationStub("docusign");
    expect(result.status).toBe("not_implemented");
    expect(result.message).toContain("DocuSign");
    expect(isIntegrationProviderId("gmail")).toBe(true);
    expect(isIntegrationProviderId("zoho_mail")).toBe(false);
    expect(isIntegrationProviderId("facebook")).toBe(true);
    expect(isIntegrationProviderId("google_business_profile")).toBe(true);
    expect(providersIn("social").map((item) => item.id)).toEqual([
      "facebook",
      "instagram",
      "x",
      "linkedin",
      "google_business_profile",
    ]);
  });
});
