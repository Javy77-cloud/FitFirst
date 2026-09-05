import { describe, expect, it } from "vitest";
import { INSTALLMENT_DISCLAIMER } from "@/lib/domain-ams";
import {
  installmentChangesPolicy,
  installmentCollectsMoney,
  installmentLine,
  isOpenInstallment,
  nextInstallmentStatus,
  validateInstallmentDraft,
} from "./installments";

describe("policy installment diary", () => {
  it("moves Hale due → past due → received without collecting or changing the Policy", () => {
    expect(nextInstallmentStatus("scheduled", "mark_due")).toBe("due");
    expect(nextInstallmentStatus("due", "mark_past_due")).toBe("past_due");
    expect(nextInstallmentStatus("past_due", "receive")).toBe("received");
    expect(nextInstallmentStatus("received", "receive")).toBeNull();
    expect(installmentCollectsMoney()).toBe(false);
    expect(installmentChangesPolicy()).toBe(false);
    expect(isOpenInstallment("past_due")).toBe(true);
    expect(isOpenInstallment("received")).toBe(false);
    expect(installmentLine("HP-FL-88421", "past_due")).toContain("HP-FL-88421");
    expect(INSTALLMENT_DISCLAIMER.toLowerCase()).toContain("does not collect");
  });

  it("requires a known bill type and a positive amount", () => {
    expect(
      validateInstallmentDraft({ billType: "stripe", amount: "218.40", dueOn: new Date() }).ok,
    ).toBe(false);
    expect(
      validateInstallmentDraft({
        billType: "agency_bill",
        amount: "0",
        dueOn: new Date("2026-09-01T12:00:00.000Z"),
      }).ok,
    ).toBe(false);
    const parsed = validateInstallmentDraft({
      billType: "agency_bill",
      amount: "284",
      dueOn: new Date("2026-10-01T12:00:00.000Z"),
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.amount).toBe("284.00");
  });
});
