import { describe, expect, it } from "vitest";
import { isUuid } from "./ids";

describe("isUuid", () => {
  it("accepts seeded desk ids", () => {
    expect(isUuid("22222222-2222-4222-8222-222222222224")).toBe(true);
    expect(isUuid("44444444-4444-4444-8444-444444444445")).toBe(true);
  });

  it("rejects missing and malformed ids that used to 500", () => {
    expect(isUuid(undefined)).toBe(false);
    expect(isUuid("")).toBe(false);
    expect(isUuid("not-a-uuid")).toBe(false);
    expect(isUuid("22222222-2222-4222-8222-22222222222")).toBe(false);
    expect(isUuid("HO3-ELENA-2026")).toBe(false);
  });
});
