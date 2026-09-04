import { describe, expect, it } from "vitest";
import { listWhatsNew, WHATS_NEW_ENTRIES } from "./whats-new";

describe("What’s New changelog", () => {
  it("seeds a few stub feature entries", () => {
    expect(WHATS_NEW_ENTRIES.length).toBeGreaterThanOrEqual(3);
    expect(listWhatsNew().map((row) => row.id)).toContain("top-chrome");
    expect(listWhatsNew().map((row) => row.id)).toContain("eo-compliance");
    for (const entry of WHATS_NEW_ENTRIES) {
      expect(entry.title.length).toBeGreaterThan(0);
      expect(entry.body.length).toBeGreaterThan(0);
      expect(entry.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});
