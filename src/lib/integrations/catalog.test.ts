import { describe, expect, it } from "vitest";
import {
  AGENCY_PAYS_VENDOR,
  CONNECT_HUB_SECTIONS,
  FEATURED_CONNECT_IDS,
  INTEGRATION_CATEGORIES,
  INTEGRATION_PROVIDERS,
  connectIntegrationStub,
  connectionStatusLabel,
  featuredConnectIds,
  getIntegrationProvider,
  isFeaturedConnectId,
  isIntegrationProviderId,
  providersIn,
} from "./catalog";

describe("integrations catalog", () => {
  it("lists Connect hub vendors including Zoho Mail/Calendar and raters", () => {
    const ids = INTEGRATION_PROVIDERS.map((item) => item.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        "gmail",
        "outlook",
        "zoho_mail",
        "google_calendar",
        "outlook_calendar",
        "zoho_calendar",
        "facebook",
        "instagram",
        "google_business_profile",
        "twilio",
        "eight_by_eight",
        "docusign",
        "dropbox_sign",
        "ezlynx",
        "quoterush",
      ]),
    );
    expect(featuredConnectIds()).toEqual([...FEATURED_CONNECT_IDS]);
    expect(isFeaturedConnectId("zoho_mail")).toBe(true);
    expect(isFeaturedConnectId("ezlynx")).toBe(true);
    expect(isFeaturedConnectId("mailchimp")).toBe(false);
    expect(INTEGRATION_CATEGORIES).toEqual([
      "email",
      "calendar",
      "social",
      "phone_sms",
      "esign",
      "rater",
      "health_enrollment",
      "campaigns",
      "video",
    ]);
    expect(ids).toEqual(expect.arrayContaining(["healthsherpa_medicare", "healthsherpa_aca"]));
    expect(CONNECT_HUB_SECTIONS.map((section) => section.id)).toEqual([
      "inbox",
      "social",
      "sms",
      "esign",
      "rater",
    ]);
  });

  it("keeps connect as not_implemented and gates GBP / rater / SMS / e-sign", () => {
    expect(getIntegrationProvider("lightspeed_voice").optional).toBe(true);
    expect(providersIn("email").map((item) => item.id)).toEqual([
      "gmail",
      "outlook",
      "zoho_mail",
      "yahoo",
    ]);
    expect(providersIn("rater").map((item) => item.id)).toEqual(["ezlynx", "quoterush"]);
    expect(getIntegrationProvider("google_business_profile").adminGated).toBe(true);
    expect(getIntegrationProvider("ezlynx").adminGated).toBe(true);
    expect(getIntegrationProvider("twilio").adminGated).toBe(true);
    expect(getIntegrationProvider("docusign").adminGated).toBe(true);
    const result = connectIntegrationStub("docusign");
    expect(result.status).toBe("not_implemented");
    expect(result.message).toContain("DocuSign");
    expect(connectIntegrationStub("ezlynx").status).toBe("not_implemented");
    expect(connectIntegrationStub("zoho_mail").status).toBe("not_implemented");
    expect(isIntegrationProviderId("gmail")).toBe(true);
    expect(isIntegrationProviderId("zoho_mail")).toBe(true);
    expect(isIntegrationProviderId("zoho_crm")).toBe(false);
    expect(AGENCY_PAYS_VENDOR).toBe("Agency pays the vendor.");
    expect(connectionStatusLabel(true)).toBe("Connected");
    expect(connectionStatusLabel(false)).toBe("Not connected");
    expect(providersIn("social").map((item) => item.id)).toEqual([
      "facebook",
      "instagram",
      "google_business_profile",
      "x",
      "linkedin",
    ]);
  });

  it("does not store a live CRM or rater API name as a secret field", () => {
    for (const item of INTEGRATION_PROVIDERS) {
      expect(item.byoNote.toLowerCase()).toMatch(/agency pays|agency /);
      expect(item.byoNote).not.toMatch(/paste .{0,20}(api key|client secret|sid)/i);
    }
  });
});
