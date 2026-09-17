import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { MasterSheetCompare } from "@/components/deal/master-sheet-compare";
import { emptySheetValues } from "@/lib/quote-sheet/catalog";
import { parseHealthSherpaPayload } from "./payload";
import { healthSherpaMedicareRequest } from "./client";
import {
  healthSherpaCollapsibleGroups,
  healthSherpaProductForPlan,
  isHealthSherpaManualPlan,
  isUsingHealthSherpa,
} from "./sheet";
import { HEALTHSHERPA_WEBHOOK_PATH } from "./copy";

function source(file: string) {
  return readFileSync(file, "utf8");
}

const MEDICARE_SAMPLE = {
  medicare_application: {
    id: "ccf19b98-375f-4467-87f4-a47c977359ee",
    carrier_name: "Devoted Health",
    confirmation_number: "A92946987696546M",
    effective_date: "2026-02-01",
    plan_name: "DEVOTED CORE 001 FL (HMO)",
    plan_type: "mapd",
    state: "FL",
    total_premium_cents: 5000,
    zip_code: "33101",
  },
  medicare_application_riders: [],
  contact: {
    id: "8b420678-2c58-4f56-9c0b-9ccb605e5e85",
    external_id: "CRM789012",
    first_name: "Test",
    last_name: "Enrollment",
    email: "test.enrollment@example.com",
    phone_number: "3055551234",
    birth_date: "1960-09-09",
    primary_address_street: "123 Main Street",
    primary_address_city: "Miami",
    primary_address_state: "FL",
    primary_address_zip_code: "33101",
    medicare_number: "1EG4TE5MK73",
    part_a_effective_date: "2020-07-01",
    part_b_effective_date: "2020-07-01",
    medicaid_eligible: false,
    needs_extra_help: false,
  },
};

describe("HealthSherpa Medicare + Marketplace", () => {
  it("parses the Medicare enrollment submission payload", () => {
    const parsed = parseHealthSherpaPayload(MEDICARE_SAMPLE);
    expect(parsed).toMatchObject({
      product: "medicare",
      event: "enrollment_submitted",
      applicationId: "ccf19b98-375f-4467-87f4-a47c977359ee",
      confirmationNumber: "A92946987696546M",
      carrierName: "Devoted Health",
      policySubType: "Medicare Advantage",
      premiumCents: 5000,
    });
    expect(parsed?.contact.firstName).toBe("Test");
    expect(parsed?.contact.medicareNumber).toBe("1EG4TE5MK73");
    expect(parseHealthSherpaPayload({})).toBeNull();
    expect(parseHealthSherpaPayload({ ping: true })).toBeNull();
  });

  it("accepts a loosely shaped Marketplace webhook and keeps Dental/Vision manual", () => {
    const parsed = parseHealthSherpaPayload({
      event: "submission",
      application: {
        id: "aca-1",
        carrier_name: "Oscar",
        plan_name: "Silver",
        plan_type: "Marketplace",
        premium: 412.15,
      },
      contact: { first_name: "Ada", last_name: "Lovelace", email: "ada@example.com" },
    });
    expect(parsed?.product).toBe("marketplace");
    expect(parsed?.premiumCents).toBe(41215);
    expect(isHealthSherpaManualPlan("Dental")).toBe(true);
    expect(isHealthSherpaManualPlan("Vision")).toBe(true);
    expect(isHealthSherpaManualPlan("Medicare Advantage")).toBe(false);
    expect(healthSherpaProductForPlan("Marketplace")).toBe("marketplace");
    expect(isUsingHealthSherpa("yes")).toBe(true);
    expect(isUsingHealthSherpa("no")).toBe(false);
    expect([...healthSherpaCollapsibleGroups(true)]).toEqual(["Medicare", "Marketplace"]);
  });

  it("calls Medicare v1 with X-API-Key and meters after a real HTTP response", async () => {
    const fetchImpl = vi.fn(async (url: string, init?: RequestInit) => {
      expect(String(url)).toBe("https://api.medicare-staging.healthsherpa.com/v1/contacts");
      const headers = new Headers(init?.headers);
      expect(headers.get("X-API-Key")).toBe("hs_test");
      const body = JSON.parse(String(init?.body));
      expect(body.agent_email).toBe("agent@agency.test");
      expect(body.contact.external_id).toBe("contact-1");
      return new Response(
        JSON.stringify({
          data: {
            contact: { id: "hs-1", first_name: "Ada", last_name: "Lovelace" },
            redirect_url: "https://medicare.healthsherpa.com/quote/hs-1",
          },
        }),
        { status: 200 },
      );
    });
    const result = await healthSherpaMedicareRequest("/contacts", {
      method: "POST",
      apiKey: "hs_test",
      environment: "sandbox",
      fetchImpl: fetchImpl as unknown as typeof fetch,
      body: { agent_email: "agent@agency.test", contact: { external_id: "contact-1", first_name: "Ada", last_name: "Lovelace" } },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.redirectUrl).toContain("medicare.healthsherpa.com");
      expect(result.data.contactId).toBe("hs-1");
    }
    expect(source("src/lib/healthsherpa/client.ts")).toMatch(/noteDeveloperApiCall\("healthsherpa_medicare"\)/);
    expect(source("src/lib/developer/usage.ts")).toMatch(/healthsherpa_medicare/);
  });

  it("wires vault, webhook, catalog, and Health Risk Profile toggle", () => {
    expect(source("drizzle/0139_healthsherpa.sql")).toMatch(/healthsherpa_enrollments/);
    expect(source("drizzle/meta/_journal.json")).toMatch(/0139_healthsherpa/);
    expect(source("src/app/api/integrations/healthsherpa/webhook/route.ts")).toMatch(/authorizeHealthSherpaWebhook/);
    expect(source("src/app/api/integrations/healthsherpa/webhook/route.ts")).toMatch(/X-API-Key/);
    expect(source("src/lib/auth/access.ts")).toMatch(/\/api\/integrations\//);
    expect(source("src/lib/integrations/catalog.ts")).toMatch(/healthsherpa_medicare/);
    expect(source("src/app/settings/integrations/page.tsx")).toMatch(/HealthSherpaCard/);
    expect(source("src/components/developer-hub/api-vault-panel.tsx")).toMatch(/healthsherpa_medicare/);
    expect(source("src/lib/healthsherpa/aca.ts")).toMatch(/needs HealthSherpa partner credentials/);
    expect(HEALTHSHERPA_WEBHOOK_PATH).toBe("/api/integrations/healthsherpa/webhook");
    expect(source(".env.example")).toMatch(/HEALTHSHERPA_MEDICARE_API_KEY/);
  });

  it("collapses Medicare / Marketplace on the Health Risk Profile when Using HealthSherpa is checked", () => {
    const html = renderToString(
      createElement(MasterSheetCompare, {
        dealId: "deal-health",
        line: "health",
        fields: [],
        values: {
          ...emptySheetValues("health"),
          using_healthsherpa: { value: "yes", status: "confirmed", source: "agent" },
          plan_type: { value: "Medicare Advantage", status: "confirmed", source: "agent" },
        },
        product: "health",
        healthSherpa: { medicareReady: false, acaReady: false },
      }),
    );
    expect(html).toContain("Using HealthSherpa");
    expect(html).toContain("data-ff-using-healthsherpa");
    expect(html).toContain("data-ff-healthsherpa-handoff");
    expect(html).toContain("data-ff-healthsherpa-collapse=\"Medicare\"");
    expect(html).toContain("Skip re-keying");
    expect(html).toContain("HealthSherpa Medicare API key is not configured");
  });
});
