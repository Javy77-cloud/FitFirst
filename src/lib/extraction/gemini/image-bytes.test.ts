import { createCanvas } from "@napi-rs/canvas";
import { describe, expect, it } from "vitest";
import { extractWithGeminiPdf } from "./client";
import {
  GEMINI_IMAGE_MAX_EDGE,
  GEMINI_INLINE_HARD_CAP_BYTES,
  GEMINI_INLINE_MAX_BYTES,
  prepareGeminiInlineBytes,
  resizeRasterForGemini,
} from "./image-bytes";

function widePng(): Buffer {
  const canvas = createCanvas(2200, 1400);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#f4f1ea";
  ctx.fillRect(0, 0, 2200, 1400);
  ctx.fillStyle = "#1a1a1a";
  ctx.font = "64px sans-serif";
  ctx.fillText("VIN 4T1B11HK5KU123456", 80, 200);
  ctx.fillText("2019 TOYOTA CAMRY", 80, 320);
  return canvas.toBuffer("image/png");
}

describe("prepareGeminiInlineBytes", () => {
  it("shrinks a wide declaration photo under the Gemini inline cap", async () => {
    const png = widePng();
    const resized = await resizeRasterForGemini(png);
    expect(resized.width).toBeLessThanOrEqual(GEMINI_IMAGE_MAX_EDGE);
    expect(resized.width).toBeGreaterThan(1000);
    expect(resized.height).toBeLessThanOrEqual(GEMINI_IMAGE_MAX_EDGE);
    expect(resized.bytes.length).toBeLessThanOrEqual(GEMINI_INLINE_MAX_BYTES);
    expect(resized.bytes.subarray(0, 2).toString("hex")).toBe("ffd8");
  });

  it("refuses a payload that would blow the server-action isolate", async () => {
    const huge = Buffer.alloc(GEMINI_INLINE_HARD_CAP_BYTES + 1, 1);
    const prepared = await prepareGeminiInlineBytes({
      bytes: huge,
      mimeType: "application/pdf",
      filename: "huge-dec.pdf",
    });
    expect(prepared.ok).toBe(false);
    if (!prepared.ok) expect(prepared.message).toMatch(/too large/i);
  });

  it("leaves a small JPEG alone", async () => {
    const canvas = createCanvas(40, 30);
    const jpeg = canvas.toBuffer("image/jpeg", 80);
    const prepared = await prepareGeminiInlineBytes({
      bytes: jpeg,
      mimeType: "image/jpeg",
      filename: "small.jpg",
    });
    expect(prepared.ok).toBe(true);
    if (prepared.ok) {
      expect(prepared.shrunk).toBe(false);
      expect(prepared.bytes.equals(jpeg)).toBe(true);
    }
  });
});

describe("extractWithGeminiPdf auto declaration photo", () => {
  it("calls Gemini with shopLine auto and maps VIN from the photo response", async () => {
    const canvas = createCanvas(32, 24);
    const jpeg = canvas.toBuffer("image/jpeg", 70);
    let sawAutoPrompt = false;
    let inlineMime = "";
    const fetchImpl = (async (_url: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as {
        systemInstruction?: { parts?: Array<{ text?: string }> };
        contents?: Array<{ parts?: Array<{ text?: string; inlineData?: { mimeType?: string; data?: string } }> }>;
      };
      const system = body.systemInstruction?.parts?.[0]?.text ?? "";
      const user = body.contents?.[0]?.parts?.find((part) => part.text)?.text ?? "";
      sawAutoPrompt = /Shop line: Auto/.test(system) && /vin/.test(system) && /Auto declaration/.test(user);
      inlineMime =
        body.contents?.[0]?.parts?.find((part) => part.inlineData)?.inlineData?.mimeType ?? "";
      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      vin: { value: "4T1B11HK5KU123456", confidence: 0.96 },
                      vehicle_year: "2019",
                      vehicle_make: "TOYOTA",
                      vehicle_model: "CAMRY",
                      driver_1_name: "Domenic Iori",
                      liability_bi: "100/300",
                      policy_number: "PA-441902",
                      current_carrier: "Progressive",
                    }),
                  },
                ],
              },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }) as typeof fetch;

    const result = await extractWithGeminiPdf(jpeg, "photo", {
      apiKey: "test-key",
      mimeType: "image/jpeg",
      filename: "domenic-dec.jpg",
      shopLine: "auto",
      purpose: "fill",
      fetchImpl,
    });
    expect(sawAutoPrompt).toBe(true);
    expect(inlineMime).toBe("image/jpeg");
    expect(result.ok).toBe(true);
    const vin = result.result.fields.find((field) => field.fieldKey === "vin");
    expect(vin?.normalizedValue).toBe("4T1B11HK5KU123456");
    expect(result.result.fields.some((field) => field.fieldKey === "policy_number")).toBe(true);
    expect(result.result.fields.some((field) => field.fieldKey === "liability_bi")).toBe(true);
  });

  it("returns the Gemini error instead of throwing", async () => {
    const fetchImpl = (async () => {
      throw new Error("socket hang up");
    }) as typeof fetch;
    const result = await extractWithGeminiPdf(Buffer.from("%PDF-1.4"), "photo", {
      apiKey: "test-key",
      mimeType: "application/pdf",
      filename: "dec.pdf",
      shopLine: "auto",
      purpose: "fill",
      fetchImpl,
    });
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/socket hang up/);
  }, 15_000);
});
