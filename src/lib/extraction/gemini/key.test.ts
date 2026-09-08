import { describe, expect, it } from "vitest";
import {
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
    expect(readGeminiModel({ GEMINI_MODEL: "gemini-2.5-flash" })).toBe("gemini-3.6-flash");
  });

  it("keeps current models untouched", () => {
    expect(resolveGeminiModel("gemini-3.6-flash")).toBe("gemini-3.6-flash");
    expect(resolveGeminiModel("gemini-3.5-flash")).toBe("gemini-3.5-flash");
  });
});
