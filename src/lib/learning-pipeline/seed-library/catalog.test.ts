import { describe, expect, it } from "vitest";
import { collectPiiHits } from "../anonymize/identifiers";
import { SEED_LIBRARY_CAPACITY, SEED_MAPPED_FORMS, seedLibraryRemaining, seedLibrarySize } from "./catalog";

describe("seed library", () => {
  it("ships sample mapped-form rows under a few-hundred capacity", () => {
    expect(SEED_LIBRARY_CAPACITY).toBe(400);
    expect(seedLibrarySize()).toBeGreaterThan(20);
    expect(seedLibrarySize()).toBeLessThanOrEqual(SEED_LIBRARY_CAPACITY);
    expect(seedLibraryRemaining()).toBe(SEED_LIBRARY_CAPACITY - seedLibrarySize());
    expect(SEED_MAPPED_FORMS[0]).toMatchObject({
      formId: expect.any(String),
      formVersion: expect.any(String),
      sourceLabel: expect.any(String),
      fieldType: expect.any(String),
    });
  });

  it("contains no agency PII in fixture mappings", () => {
    expect(collectPiiHits(SEED_MAPPED_FORMS)).toEqual([]);
    const blob = JSON.stringify(SEED_MAPPED_FORMS);
    expect(blob).not.toMatch(/@/);
    expect(blob).not.toMatch(/\b\d{3}-\d{2}-\d{4}\b/);
    expect(blob).not.toMatch(/Ana Dib/);
  });
});
