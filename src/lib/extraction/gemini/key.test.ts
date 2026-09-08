import { describe, expect, it } from "vitest";
import {
  GEMINI_CAPACITY_FALLBACKS,
  GEMINI_DEFAULT_MODEL,
  readGeminiModel,
  resolveGeminiModel,
} from "./key";

describe("resolveGeminiModel", () => {
  it("defaults to gemini-3.6-flash", () => {
    expect(resolveGeminiModel("")).toBe(GEMINI_DEFAULT_MODEL);
    expect(resolveGeminiModel(undefined)).toBe(GEMINI_DEFAULT_MODEL);
  });

  it("remaps retired 2.5-flash so stale shell env cannot 404 Fill", () => {
    expect(resolveGeminiModel("gemini-2.5-flash")).toBe("gemini-3.6-flash");
    expect(resolveGeminiModel("models/gemini-2.5-flash")).toBe("gemini-3.6-flash");
    expect(readGeminiModel({ GEMINI_MODEL: "gemini-2.5-flash" })).toBe("gemini-3.6-flash");
  });

  it("hard-pins every request to gemini-3.6-flash", () => {
    expect(resolveGeminiModel("gemini-3.6-flash")).toBe("gemini-3.6-flash");
    expect(resolveGeminiModel("gemini-3.5-flash")).toBe("gemini-3.6-flash");
    expect(resolveGeminiModel("gemini-flash-latest")).toBe("gemini-3.6-flash");
    expect(resolveGeminiModel("gemini-2.0-flash-001")).toBe("gemini-3.6-flash");
  });

  it("lists capacity fallbacks that are not remapped to 3.6", () => {
    expect(GEMINI_CAPACITY_FALLBACKS.length).toBeGreaterThan(0);
    for (const id of GEMINI_CAPACITY_FALLBACKS) {
      expect(id).not.toBe(GEMINI_DEFAULT_MODEL);
      expect(id.startsWith("gemini-")).toBe(true);
    }
  });

});
