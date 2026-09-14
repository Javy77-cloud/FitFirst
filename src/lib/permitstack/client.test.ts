import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { searchPermitStackHistory } from "./client";
import { MISSING_PERMITSTACK_KEY_MESSAGE, PERMITSTACK_HISTORY_URL, readPermitStackApiKey } from "./key";

const PREV = process.env.PERMITSTACK_API_KEY;

afterEach(() => {
  if (PREV == null) delete process.env.PERMITSTACK_API_KEY;
  else process.env.PERMITSTACK_API_KEY = PREV;
});

describe("PermitStack client", () => {
  it("does not call the vendor when the key is missing", async () => {
    delete process.env.PERMITSTACK_API_KEY;
    expect(readPermitStackApiKey({})).toBe("");
    const fetchImpl = vi.fn();
    const result = await searchPermitStackHistory(
      { address1: "18025 Cypress Point Rd", city: "Fort Myers", state: "FL", zip: "33967" },
      "",
      fetchImpl,
    );
    expect(result.status).toBe("needs_key");
    expect(result.called).toBe(false);
    expect(result.facts).toEqual([]);
    expect(result.message).toBe(MISSING_PERMITSTACK_KEY_MESSAGE);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("calls /v1/property/history with X-API-Key when the key is present", async () => {
    const fetchImpl = vi.fn(async (url: string, init?: { headers?: Record<string, string> }) => {
      expect(String(url)).toContain(PERMITSTACK_HISTORY_URL);
      expect(String(url)).toContain("address=18025");
      expect(String(url)).toContain("city=Fort+Myers");
      expect(String(url)).toContain("state=FL");
      expect(init?.headers?.["X-API-Key"]).toBe("pk_test_demo");
      return {
        ok: true,
        status: 200,
        json: async () => ({
          found: true,
          total_matches: 1,
          summary: {
            signals: { has_roofing: true, last_roofing_date: "2021-06-15" },
          },
          permits: [],
        }),
      };
    });
    const result = await searchPermitStackHistory(
      { address1: "18025 Cypress Point Rd", city: "Fort Myers", state: "FL", zip: "33967" },
      "pk_test_demo",
      fetchImpl as unknown as typeof fetch,
    );
    expect(result.status).toBe("ok");
    expect(result.called).toBe(true);
    expect(result.facts.some((f) => f.sheetKey === "roof_year" && f.value === "2021")).toBe(true);
  });

  it("fails soft on HTTP errors without inventing years", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: false,
      status: 500,
      json: async () => ({}),
    }));
    const result = await searchPermitStackHistory(
      { address1: "1 Main St", city: "Miami", state: "FL" },
      "pk_test_demo",
      fetchImpl as unknown as typeof fetch,
    );
    expect(result.status).toBe("error");
    expect(result.called).toBe(true);
    expect(result.facts).toEqual([]);
    expect(result.message).toMatch(/500/);
  });

  it("never logs the agency key and has no stub/fixture path", () => {
    const source =
      readFileSync("src/lib/permitstack/client.ts", "utf8") +
      readFileSync("src/lib/permitstack/key.ts", "utf8");
    expect(source).not.toMatch(/console\.log/);
    expect(source).not.toMatch(/stubPropertyFor|fixtures/);
  });
});
