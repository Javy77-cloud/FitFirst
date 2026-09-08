import { describe, expect, it, vi } from "vitest";
import { extractWithGeminiPdf, isGeminiDailyQuotaExhausted } from "./client";
import { GEMINI_CAPACITY_FALLBACKS, GEMINI_DEFAULT_MODEL } from "./key";

describe("isGeminiDailyQuotaExhausted", () => {
  it("detects free-tier per-model daily cap", () => {
    expect(
      isGeminiDailyQuotaExhausted(
        "Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 20, model: gemini-3.6-flash",
      ),
    ).toBe(true);
    expect(
      isGeminiDailyQuotaExhausted(
        '{"error":{"message":"GenerateRequestsPerDayPerProjectPerModel-FreeTier"}}',
      ),
    ).toBe(true);
    expect(isGeminiDailyQuotaExhausted("overloaded")).toBe(false);
  });
});

describe("extractWithGeminiPdf retries", () => {
  it("retries wind_mit 503s on primary then capacity fallbacks", async () => {
    let calls = 0;
    const fetchImpl = vi.fn(async () => {
      calls += 1;
      return new Response(JSON.stringify({ error: { message: "overloaded" } }), {
        status: 503,
        headers: { "Content-Type": "application/json", "Retry-After": "0" },
      });
    }) as unknown as typeof fetch;

    const result = await extractWithGeminiPdf(Buffer.from("%PDF-1.4"), "wind_mit", {
      apiKey: "test-key",
      model: "gemini-3.6-flash",
      fetchImpl,
    });
    expect(result.ok).toBe(false);
    // primary wind_mit 8 + 3 attempts per capacity fallback
    expect(calls).toBe(8 + GEMINI_CAPACITY_FALLBACKS.length * 3);
    expect(result.message).toMatch(/gemini_http_503/);
  }, 45_000);

  it("uses fewer primary attempts for dec", async () => {
    let calls = 0;
    const fetchImpl = vi.fn(async () => {
      calls += 1;
      return new Response(JSON.stringify({ error: { message: "overloaded" } }), {
        status: 503,
        headers: { "Content-Type": "application/json", "Retry-After": "0" },
      });
    }) as unknown as typeof fetch;

    const result = await extractWithGeminiPdf(Buffer.from("%PDF-1.4"), "dec", {
      apiKey: "test-key",
      model: "gemini-3.6-flash",
      fetchImpl,
    });
    expect(result.ok).toBe(false);
    expect(calls).toBe(6 + GEMINI_CAPACITY_FALLBACKS.length * 3);
  }, 30_000);

  it("skips primary daily quota and succeeds on first capacity fallback", async () => {
    const modelsHit: string[] = [];
    const fetchImpl = vi.fn(async (url: RequestInfo | URL) => {
      const u = String(url);
      const m = u.match(/models\/([^:]+):/);
      modelsHit.push(decodeURIComponent(m?.[1] ?? ""));
      if (modelsHit.length === 1) {
        return new Response(
          JSON.stringify({
            error: {
              message:
                "Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 20, model: gemini-3.6-flash",
              details: [
                {
                  "@type": "type.googleapis.com/google.rpc.QuotaFailure",
                  violations: [{ quotaId: "GenerateRequestsPerDayPerProjectPerModel-FreeTier" }],
                },
              ],
            },
          }),
          { status: 429, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [{ text: JSON.stringify({ applicant_name: { value: "Rosa", confidence: 0.9 } }) }],
              },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }) as unknown as typeof fetch;

    const result = await extractWithGeminiPdf(Buffer.from("%PDF-1.4"), "wind_mit", {
      apiKey: "test-key",
      model: GEMINI_DEFAULT_MODEL,
      fetchImpl,
    });
    expect(result.ok).toBe(true);
    expect(modelsHit[0]).toBe(GEMINI_DEFAULT_MODEL);
    expect(modelsHit[1]).toBe(GEMINI_CAPACITY_FALLBACKS[0]);
    expect(modelsHit).toHaveLength(2);
    expect(result.result.fields.some((f) => f.fieldKey === "applicant_name")).toBe(true);
  });
});
