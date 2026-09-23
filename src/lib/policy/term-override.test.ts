import { describe, expect, it } from "vitest";
import {
  buildTermOverridePatch,
  formatTermDateIso,
  termOverrideSummary,
} from "./term-override";

describe("term override", () => {
  const existing = {
    effectiveDate: "2025-01-01T12:00:00.000Z",
    expirationDate: "2026-01-01T12:00:00.000Z",
    renewalDate: "2026-01-01T12:00:00.000Z",
  };

  it("requires a reason", () => {
    const result = buildTermOverridePatch(
      {
        effectiveDate: "2025-01-01",
        expirationDate: "2026-01-01",
        renewalDate: "2026-01-01",
        reason: "   ",
      },
      existing,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/reason/i);
  });

  it("rejects expiration before effective", () => {
    const result = buildTermOverridePatch(
      {
        effectiveDate: "2026-06-01",
        expirationDate: "2026-01-01",
        renewalDate: "",
        reason: "Book dates wrong vs carrier",
      },
      existing,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/expiration/i);
  });

  it("builds patch + audit meta with old→new and reason", () => {
    const result = buildTermOverridePatch(
      {
        effectiveDate: "2025-03-01",
        expirationDate: "2026-03-01",
        renewalDate: "2026-03-01",
        reason: "Alva Gaviria Medicare book dates wrong",
      },
      existing,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.changed).toBe(true);
    expect(formatTermDateIso(result.patch.effectiveDate)).toBe("2025-03-01");
    expect(formatTermDateIso(result.patch.expirationDate)).toBe("2026-03-01");
    expect(formatTermDateIso(result.patch.renewalDate)).toBe("2026-03-01");
    expect(result.meta).toEqual({
      kind: "term_override",
      reason: "Alva Gaviria Medicare book dates wrong",
      effectiveDate: { from: "2025-01-01", to: "2025-03-01" },
      expirationDate: { from: "2026-01-01", to: "2026-03-01" },
      renewalDate: { from: "2026-01-01", to: "2026-03-01" },
    });
    expect(termOverrideSummary(result.meta, "MED-ALVA")).toContain("Reason: Alva Gaviria");
    expect(termOverrideSummary(result.meta, "MED-ALVA")).toContain("expiration 2026-01-01→2026-03-01");
  });

  it("allows clearing renewal date", () => {
    const result = buildTermOverridePatch(
      {
        effectiveDate: "2025-01-01",
        expirationDate: "2026-01-01",
        renewalDate: "",
        reason: "Renewal date was mis-imported",
      },
      existing,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.patch.renewalDate).toBeNull();
    expect(result.meta.renewalDate).toEqual({ from: "2026-01-01", to: "—" });
  });
});
