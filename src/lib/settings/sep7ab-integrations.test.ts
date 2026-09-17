import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getIntegrationProvider, providersIn } from "@/lib/integrations/catalog";

describe("sep7ab Integrations 8x8 + Mac Continuity", () => {
  it("lists 8x8 as a Phone / SMS provider next to the Continuity toggle", () => {
    expect(getIntegrationProvider("eight_by_eight").name).toBe("8x8");
    expect(getIntegrationProvider("eight_by_eight").category).toBe("phone_sms");
    expect(providersIn("phone_sms").map((item) => item.id)).toEqual(
      expect.arrayContaining(["eight_by_eight", "twilio"]),
    );
    const page = readFileSync("src/app/settings/integrations/page.tsx", "utf8");
    expect(page).toMatch(/MacContinuityToggle/);
    expect(page).toMatch(/phone_sms/);
    const toggle = readFileSync("src/components/settings/mac-continuity-toggle.tsx", "utf8");
    expect(toggle).toMatch(/Mac Continuity/);
    expect(toggle).toMatch(/8x8/);
  });
});

describe("BYO OAuth wave surfaces", () => {
  it("wires Gmail, calendars, Meet, and DocuSign onto existing settings pages", () => {
    const catalog = readFileSync("src/app/settings/integrations/page.tsx", "utf8");
    expect(catalog).toMatch(/ByoOauthCard/);
    expect(catalog).toMatch(/SocialByoCard/);
    expect(catalog).toMatch(/personal Gmail/);
    expect(catalog).toMatch(/one-click Google Connect/);
    expect(catalog).toMatch(/google-connect-not-setup/);
    expect(catalog).not.toMatch(/Paste a Google Cloud client/);
    const email = readFileSync("src/app/settings/email/page.tsx", "utf8");
    expect(email).toMatch(/ByoOauthCard/);
    expect(email).toMatch(/returnTo="\/settings\/email"/);
    const video = readFileSync("src/app/settings/video/page.tsx", "utf8");
    expect(video).toMatch(/ByoOauthCard/);
    const esign = readFileSync("src/app/settings/esign/page.tsx", "utf8");
    expect(esign).toMatch(/ByoOauthCard/);
    expect(esign).toMatch(/docusign/);
    const calendar = readFileSync("src/app/calendar/page.tsx", "utf8");
    expect(calendar).toMatch(/listBusyWindows/);
    expect(calendar).toMatch(/meetHelperAvailable/);
  });
});
