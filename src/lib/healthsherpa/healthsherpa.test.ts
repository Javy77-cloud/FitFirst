import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { MasterSheetCompare } from "@/components/deal/master-sheet-compare";
import { emptySheetValues } from "@/lib/quote-sheet/catalog";
import { parseHealthSherpaPayload } from "./payload";
import { healthSherpaMedicareRequest } from "./client";
import { authorizeHealthSherpaWebhook, collectPresentedHealthSherpaSecrets } from "./auth";
import { healthSherpaAcaQuote } from "./aca";
import {
  healthSherpaCollapsibleGroups,
  healthSherpaProductForPlan,
  isHealthSherpaManualPlan,
  isUsingHealthSherpa,
} from "./sheet";
import { HEALTHSHERPA_ACA_NEEDS_PARTNER, HEALTHSHERPA_WEBHOOK_PATH } from "./copy";
import { encryptSecret, decryptSecretTryingKeys, LOCAL_SECRETS_KEY_HEX } from "@/lib/secrets/vault";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: () => undefined, replace: () => undefined, push: () => undefined }),
}));

vi.mock("@/lib/developer-hub/store", () => ({
  verifyOrgApiKey: vi.fn(async () => null),
}));

vi.mock("./vault", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./vault")>();
  return {
    ...actual,
    loadHealthSherpaWebhookSecrets: vi.fn(async () => ["inbound-secret"]),
    describeHealthSherpaInboundVault: vi.fn(async () => ({
      hasRow: true,
      readable: true,
      envFallback: false,
      acceptedCount: 1,
    })),
    loadHealthSherpaAcaCredentials: vi.fn(async () => ({
      apiKey: "aca_test",
      agentId: null,
      environment: "sandbox" as const,
    })),
  };
});

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
    expect(source("src/lib/healthsherpa/aca.ts")).toMatch(/HEALTHSHERPA_ACA_NEEDS_PARTNER/);
    expect(HEALTHSHERPA_ACA_NEEDS_PARTNER).toMatch(/needs HealthSherpa partner credentials/);
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

  it("collects HealthSherpa API-key headers without preferring Bearer over X-API-Key", () => {
    const request = new Request("https://fit-first-seven.vercel.app/api/integrations/healthsherpa/webhook?api_key=from-query", {
      method: "POST",
      headers: {
        Authorization: "Bearer wrong-bearer",
        "X-API-Key": "inbound-secret",
        "api-key": "also-named",
      },
    });
    const presented = collectPresentedHealthSherpaSecrets(request);
    expect(presented).toEqual(expect.arrayContaining(["wrong-bearer", "inbound-secret", "also-named", "from-query"]));
  });

  it("authorizes X-API-Key, raw Authorization, and Api-Key against the inbound secret", async () => {
    const secret = "inbound-secret";
    for (const headers of [
      { "X-API-Key": secret },
      { authorization: secret },
      { Authorization: `Api-Key ${secret}` },
      { "api-key": secret },
    ]) {
      const result = await authorizeHealthSherpaWebhook(
        new Request("https://example.test/api/integrations/healthsherpa/webhook", {
          method: "POST",
          headers,
        }),
      );
      expect(result).toEqual({ ok: true });
    }
    const denied = await authorizeHealthSherpaWebhook(
      new Request("https://example.test/api/integrations/healthsherpa/webhook", {
        method: "POST",
        headers: { "X-API-Key": "nope" },
      }),
    );
    expect(denied.ok).toBe(false);
    if (!denied.ok) expect(denied.reason).toBe("mismatch");
  });

  it("parses official Marketplace submission and policy-status webhooks", () => {
    const submitted = parseHealthSherpaPayload({
      transaction_id: 123456789,
      application_id: "HSA000000000",
      policy_status: "pending_effectuation",
      event_type: "submission",
      external_id: "deal-aca-1",
      members: [{ first_name: "John", last_name: "Doe", date_of_birth: "05/10/1980" }],
      policies: [
        {
          policy_id: "HSP000000000",
          effective_date: "08/01/2025",
          plan_hios_id: "12345LA0123456",
          gross_premium: 750.25,
        },
      ],
    });
    expect(submitted).toMatchObject({
      product: "marketplace",
      event: "enrollment_submitted",
      applicationId: "HSA000000000",
      confirmationNumber: "HSP000000000",
      premiumCents: 75025,
    });
    expect(submitted?.contact.firstName).toBe("John");
    expect(submitted?.contact.externalId).toBe("deal-aca-1");

    const synced = parseHealthSherpaPayload({
      application_id: "HSA000000000",
      event_type: "sync",
      policy_status: "effectuated",
      members: [{ first_name: "John", last_name: "Doe" }],
    });
    expect(synced?.event).toBe("policy_status");
    expect(synced?.product).toBe("marketplace");
  });

  it("calls QuoteConnect with x-api-key and meters after a real HTTP response", async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response(JSON.stringify({ plans: [{ hios_id: "p1", name: "Silver", premium: 412 }], meta: { result_count: 1 } }), {
        status: 200,
      });
    });
    const result = await healthSherpaAcaQuote({
      zip: "33101",
      fips: "12086",
      applicants: [{ age: 40, relationship: "primary", smoker: false }],
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.planCount).toBe(1);
      expect(result.marketplaceUrl).toContain("healthsherpa.com");
    }
    expect(String(fetchImpl.mock.calls[0]?.[0])).toBe("https://api.ichra-staging.healthsherpa.com/api/v1/quotes");
    const headers = new Headers(fetchImpl.mock.calls[0]?.[1]?.headers);
    expect(headers.get("x-api-key")).toBe("aca_test");
    const body = JSON.parse(String(fetchImpl.mock.calls[0]?.[1]?.body));
    expect(body.zip_code).toBe("33101");
    expect(body.applicants[0]).toMatchObject({ age: 40, relationship: "primary" });
    expect(source("src/lib/healthsherpa/aca.ts")).toMatch(/noteDeveloperApiCall\("healthsherpa_aca"\)/);
    expect(source("src/app/api/integrations/healthsherpa/webhooks/route.ts")).toMatch(/webhook\/route/);
  });

  it("decrypts vault ciphertext after the preferred secrets key rotates", () => {
    const previous = process.env.CARRIER_SECRETS_KEY;
    const pii = process.env.PII_ENCRYPTION_KEY;
    process.env.PII_ENCRYPTION_KEY = LOCAL_SECRETS_KEY_HEX;
    delete process.env.CARRIER_SECRETS_KEY;
    const sealed = encryptSecret("rotated-inbound");
    process.env.CARRIER_SECRETS_KEY = "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789";
    expect(decryptSecretTryingKeys(sealed.enc, sealed.iv)).toBe("rotated-inbound");
    if (previous === undefined) delete process.env.CARRIER_SECRETS_KEY;
    else process.env.CARRIER_SECRETS_KEY = previous;
    if (pii === undefined) delete process.env.PII_ENCRYPTION_KEY;
    else process.env.PII_ENCRYPTION_KEY = pii;
  });
});
