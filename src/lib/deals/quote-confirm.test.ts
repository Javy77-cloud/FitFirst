import { describe, expect, it } from "vitest";
import {
  QUOTE_CONFIRM_ACCEPTED,
  confirmWhy,
  hasCarrierFormConfirmation,
  quotePullNeedsConfirm,
  sampleRequiresConfirm,
} from "./quote-confirm";

describe("quote pull confirmation sampling", () => {
  it("requires a first-pull confirm until that carrier+form is logged", () => {
    expect(
      quotePullNeedsConfirm({
        quoteId: "q-1",
        carrierId: "c1",
        formId: "HO3",
        logs: [],
      }),
    ).toBe("first");

    const logs = [{ carrierId: "c1", why: confirmWhy("first", "HO3") }];
    expect(hasCarrierFormConfirmation(logs, "c1", "HO3")).toBe(true);
    expect(logs[0]!.why).toContain(QUOTE_CONFIRM_ACCEPTED);
    expect(hasCarrierFormConfirmation(logs, "c1", "DP3")).toBe(false);
  });

  it("sends denied and low-confidence pulls to admin", () => {
    expect(
      quotePullNeedsConfirm({
        quoteId: "q-1",
        carrierId: "c1",
        formId: "HO3",
        logs: [{ carrierId: "c1", why: confirmWhy("first", "HO3") }],
        denied: true,
      }),
    ).toBe("admin");
    expect(
      quotePullNeedsConfirm({
        quoteId: "q-1",
        carrierId: "c1",
        formId: "HO3",
        logs: [{ carrierId: "c1", why: confirmWhy("first", "HO3") }],
        lowConfidence: true,
      }),
    ).toBe("admin");
  });

  it("samples roughly one in five after the first confirm", () => {
    const logs = [{ carrierId: "c1", why: confirmWhy("first", "HO3") }];
    const kinds = Array.from({ length: 40 }, (_, i) =>
      quotePullNeedsConfirm({
        quoteId: `quote-${i}`,
        carrierId: "c1",
        formId: "HO3",
        logs,
      }),
    );
    const samples = kinds.filter((kind) => kind === "sample").length;
    const skips = kinds.filter((kind) => kind === "skip").length;
    expect(samples + skips).toBe(40);
    expect(samples).toBeGreaterThanOrEqual(4);
    expect(samples).toBeLessThanOrEqual(14);
    expect(sampleRequiresConfirm("stable-id") === sampleRequiresConfirm("stable-id")).toBe(true);
  });
});
