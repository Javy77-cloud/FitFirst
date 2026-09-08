import { describe, expect, it, vi } from "vitest";
import { extractWithGeminiPdf } from "./client";

describe("extractWithGeminiPdf retries", () => {
  it("retries wind_mit 503s more times before failing", async () => {
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
    expect(calls).toBe(8);
    expect(result.message).toMatch(/gemini_http_503/);
  }, 30_000);

  it("uses fewer attempts for dec", async () => {
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
    expect(calls).toBe(6);
  }, 20_000);
});
