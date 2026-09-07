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
