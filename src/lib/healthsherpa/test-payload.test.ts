import { afterEach, describe, expect, it } from "vitest";
import { parseHealthSherpaPayload } from "./payload";
import {
  allowHealthSherpaTestPayloadWrites,
  isHealthSherpaTestOrSamplePayload,
} from "./test-payload";

const DOCS_SAMPLE = {
  medicare_application: {
    id: "ccf19b98-375f-4467-87f4-a47c977359ee",
    carrier_name: "Devoted Health",
    confirmation_number: "A92946987696546M",
    plan_type: "mapd",
    total_premium_cents: 5000,
  },
  contact: {
    id: "8b420678-2c58-4f56-9c0b-9ccb605e5e85",
    external_id: "CRM789012",
    first_name: "Test",
    last_name: "Enrollment",
    email: "test.enrollment@example.com",
    medicare_number: "1EG4TE5MK73",
  },
};

describe("HealthSherpa test/sample payload gate", () => {
  afterEach(() => {
    delete process.env.HEALTHSHERPA_ALLOW_TEST_PAYLOADS;
    delete process.env.VERCEL_ENV;
  });

  it("flags the official docs SubmissionPayload and known FitFirst probes", () => {
    const docs = parseHealthSherpaPayload(DOCS_SAMPLE);
    expect(docs).not.toBeNull();
    expect(isHealthSherpaTestOrSamplePayload(docs!)).toBe(true);

    const probes = [
      {
        contact: { first_name: "Test", last_name: "Webhook", email: "test.webhook@example.com" },
        medicare_application: { id: "hs-test-app-001", confirmation_number: "CONF123", plan_type: "mapd" },
      },
      {
        contact: { first_name: "Sample", last_name: "Payload", email: "sample.payload@example.com" },
        medicare_application: { id: "sample-app-crm", confirmation_number: "CONF999", plan_type: "mapd" },
      },
      {
        contact: { first_name: "Probe", last_name: "User" },
        medicare_application: { id: "probe", confirmation_number: "P1", plan_type: "mapd" },
      },
      {
        contact: { first_name: "A", last_name: "B", email: "a@b.com" },
        application: { id: "app-2", type: "medicare_application", confirmation_number: "C2" },
        event: "enrollment_submission",
      },
    ];
    for (const payload of probes) {
      const parsed = parseHealthSherpaPayload(payload);
      expect(parsed, JSON.stringify(payload)).not.toBeNull();
      expect(isHealthSherpaTestOrSamplePayload(parsed!)).toBe(true);
    }
  });

  it("does not flag ordinary enrollments", () => {
    const parsed = parseHealthSherpaPayload({
      medicare_application: {
        id: "real-app-9f3c",
        confirmation_number: "H88221100",
        plan_type: "mapd",
        carrier_name: "Humana",
      },
      contact: {
        first_name: "Rosa",
        last_name: "Castellanos",
        email: "rosa.real@agency.test",
      },
    });
    expect(parsed).not.toBeNull();
    expect(isHealthSherpaTestOrSamplePayload(parsed!)).toBe(false);
  });

  it("never allows test writes on Vercel production even with override", () => {
    process.env.HEALTHSHERPA_ALLOW_TEST_PAYLOADS = "1";
    process.env.VERCEL_ENV = "production";
    expect(allowHealthSherpaTestPayloadWrites()).toBe(false);
    process.env.VERCEL_ENV = "preview";
    expect(allowHealthSherpaTestPayloadWrites()).toBe(true);
  });
});
