import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authorize: vi.fn(),
  ingest: vi.fn(),
}));

vi.mock("@/lib/healthsherpa/auth", () => ({
  authorizeHealthSherpaWebhook: (...args: unknown[]) => mocks.authorize(...args),
}));

vi.mock("@/lib/healthsherpa/inbound", () => ({
  ingestHealthSherpaWebhook: (...args: unknown[]) => mocks.ingest(...args),
}));

import { POST } from "./route";

function post(body: unknown, headers?: HeadersInit) {
  return POST(
    new Request("https://example.test/api/integrations/healthsherpa/webhook", {
      method: "POST",
      headers: { "content-type": "application/json", "X-API-Key": "inbound-secret", ...headers },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

describe("POST /api/integrations/healthsherpa/webhook", () => {
  beforeEach(() => {
    mocks.authorize.mockReset();
    mocks.ingest.mockReset();
    mocks.authorize.mockResolvedValue({ ok: true });
  });

  it("keeps auth in front of ingest", async () => {
    mocks.authorize.mockResolvedValue({
      ok: false,
      reason: "mismatch",
      message: "API key did not match",
      inboundConfigured: true,
      inboundSource: "vault",
      presentedLength: 4,
      acceptedCount: 1,
      prefixMatch: false,
    });
    const res = await post({ medicare_application: {}, contact: { first_name: "A", last_name: "B" } });
    expect(res.status).toBe(401);
    expect(mocks.ingest).not.toHaveBeenCalled();
    const json = await res.json();
    expect(json.reason).toBe("mismatch");
  });

  it("returns JSON 422 when ingest rejects an empty sample", async () => {
    mocks.ingest.mockResolvedValue({
      accepted: false,
      reason: "Payload was not a HealthSherpa enrollment submission. Manual enrollments in HealthSherpa may not fire this webhook.",
    });
    const res = await post({});
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.reason).toMatch(/not a HealthSherpa enrollment/);
  });

  it("returns JSON 500 without stack when ingest throws", async () => {
    mocks.ingest.mockRejectedValue(
      new Error('invalid input syntax for type uuid: "CRM789012" postgres://user:hunter2@db/ff'),
    );
    const res = await post(HEALTHSHERPA_MIN_SAMPLE);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.reason).toBe("HealthSherpa webhook ingest failed.");
    expect(JSON.stringify(json)).not.toMatch(/hunter2|CRM789012|postgres:\/\/|at /);
  });

  it("returns JSON 422 when ingest throws Postgres 22P02 from a non-UUID external_id", async () => {
    mocks.ingest.mockRejectedValue({
      code: "22P02",
      message: 'invalid input syntax for type uuid: "CRM789012"',
    });
    const res = await post(HEALTHSHERPA_MIN_SAMPLE);
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.ok).toBe(false);
    expect(json.reason).toMatch(/external_id/);
    expect(JSON.stringify(json)).not.toMatch(/CRM789012/);
  });
});

const HEALTHSHERPA_MIN_SAMPLE = {
  medicare_application: { id: "ccf19b98-375f-4467-87f4-a47c977359ee", plan_type: "mapd" },
  contact: {
    first_name: "Test",
    last_name: "Enrollment",
    external_id: "CRM789012",
  },
};
