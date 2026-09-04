import { describe, expect, it } from "vitest";
import { INTEGRATION_CATALOG, INTEGRATION_CATEGORIES } from "@/lib/domain";

describe("communications integration catalog", () => {
  it("nests the common BYO providers agencies actually use", () => {
    expect([...INTEGRATION_CATEGORIES]).toEqual([
      "email",
      "email_campaigns",
      "calendar",
      "phone_sms",
      "video",
      "esign",
    ]);
    const byCategory = Object.fromEntries(
      INTEGRATION_CATEGORIES.map((category) => [
        category,
        INTEGRATION_CATALOG.filter((item) => item.category === category).map((item) => item.provider),
      ]),
    );
    expect(byCategory.email).toEqual(["google", "outlook", "yahoo"]);
    expect(byCategory.email_campaigns).toEqual(["mailchimp", "constant_contact", "sendgrid"]);
    expect(byCategory.calendar).toEqual(["google", "outlook"]);
    expect(byCategory.phone_sms).toEqual(["twilio", "ringcentral", "lightspeed_voice", "bandwidth"]);
    expect(byCategory.video).toEqual(["zoom", "meet"]);
    expect(byCategory.esign).toEqual(["docusign", "dropbox_sign"]);
  });

  it("marks Bandwidth optional and never implies FitFirst buys Twilio", () => {
    const bandwidth = INTEGRATION_CATALOG.find((item) => item.provider === "bandwidth");
    expect(bandwidth?.optional).toBe(true);
    expect(INTEGRATION_CATALOG.find((item) => item.provider === "twilio")?.label).toBe("Twilio");
  });
});
