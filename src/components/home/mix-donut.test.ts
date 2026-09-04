import { describe, expect, it } from "vitest";
import { visiblePolicyTypeSlices } from "./mix-donut";

describe("policy type donut slices", () => {
  it("keeps in-force types and drops empty buckets", () => {
    const shown = visiblePolicyTypeSlices([
      { key: "HO", label: "Home", count: 2, premium: 3340 },
      { key: "AUTO", label: "Auto", count: 1, premium: 1910 },
      { key: "FLOOD", label: "Flood", count: 0, premium: 0 },
      { key: "HEALTH", label: "Health", count: 0, premium: 0 },
    ]);
    expect(shown.map((s) => s.key)).toEqual(["HO", "AUTO"]);
  });

  it("does not chart a quote-only $321k shop as a policy type", () => {
    const shown = visiblePolicyTypeSlices([
      { key: "HO", label: "Home", count: 0, premium: 0 },
      { key: "AUTO", label: "Auto", count: 0, premium: 0 },
    ]);
    expect(shown).toEqual([]);
  });
});
