import { describe, expect, it } from "vitest";
import {
  diffPolicyFields,
  formatHistoryValue,
  groupPolicyChangeLogs,
  sourceLabel,
  valuesEqual,
  withHistoryDefaults,
} from "./change-log";

describe("policy change history", () => {
  it("formats empty, dates, and booleans for the timeline", () => {
    expect(formatHistoryValue(null)).toBe("—");
    expect(formatHistoryValue("")).toBe("—");
    expect(formatHistoryValue(new Date("2026-09-01T15:00:00.000Z"))).toBe("2026-09-01");
    expect(formatHistoryValue(true)).toBe("yes");
    expect(formatHistoryValue("2840.00")).toBe("2840.00");
  });

  it("treats equivalent date strings as unchanged", () => {
    expect(valuesEqual(new Date("2026-09-01T05:00:00.000Z"), "2026-09-01")).toBe(true);
    expect(valuesEqual("monthly", "annual")).toBe(false);
  });

  it("diffs only changed policy fields with before / after", () => {
    const changes = diffPolicyFields(
      { status: "bound", premium: "3120.00", billingFrequency: "monthly", policyNumber: "HO3-ELENA-2026" },
      { status: "active", premium: "2840.00", billingFrequency: "annual", policyNumber: "HO3-ELENA-2026" },
    );
    expect(changes).toEqual([
      { fieldKey: "status", fieldLabel: "Status", beforeValue: "bound", afterValue: "active" },
      { fieldKey: "premium", fieldLabel: "Premium", beforeValue: "3120.00", afterValue: "2840.00" },
      { fieldKey: "billingFrequency", fieldLabel: "Billing", beforeValue: "monthly", afterValue: "annual" },
    ]);
  });

  it("groups same who / when / source into one timeline card", () => {
    const groups = groupPolicyChangeLogs([
      {
        id: "1",
        changedByName: "Maya Chen",
        changedAt: "2026-09-02T14:00:00.000Z",
        fieldKey: "premium",
        fieldLabel: "Premium",
        beforeValue: "3120.00",
        afterValue: "2840.00",
        source: "record_edit",
      },
      {
        id: "2",
        changedByName: "Maya Chen",
        changedAt: "2026-09-02T14:00:00.000Z",
        fieldKey: "billingFrequency",
        fieldLabel: "Billing",
        beforeValue: "monthly",
        afterValue: "annual",
        source: "record_edit",
      },
      {
        id: "3",
        changedByName: "Javy Rivera",
        changedAt: "2026-09-01T15:05:00.000Z",
        fieldKey: "status",
        fieldLabel: "Status",
        beforeValue: "—",
        afterValue: "bound",
        source: "bind",
      },
    ]);
    expect(groups).toHaveLength(2);
    expect(groups[0]?.changedByName).toBe("Maya Chen");
    expect(groups[0]?.fields).toHaveLength(2);
    expect(groups[1]?.source).toBe("bind");
    expect(sourceLabel("bind")).toBe("Bind");
    expect(sourceLabel("mint")).toBe("Policy created");
    expect(sourceLabel("mint")).not.toMatch(/mint|meant/i);
    expect(sourceLabel("term_override")).toBe("Term date correction");
    expect(sourceLabel("renewal_term_advance")).toBe("Renewal term advance");
  });

  it("does not log form defaults that were already shown as blanks", () => {
    const stored = {
      premisesAddress: "412 Harbor Isle Dr",
      billingFrequency: null,
      insuredCount: null,
      insuranceType: null,
      policyTerm: null,
      commissionFamily: null,
    };
    const shown = withHistoryDefaults(stored, {
      billingFrequency: "annual",
      insuredCount: 1,
      insuranceType: "P&C",
      policyTerm: "12 Months",
      commissionFamily: "pc",
    });
    const saved = {
      ...shown,
      premisesAddress: "412 Harbor Isle Drive",
      billingFrequency: "annual",
      insuredCount: 1,
      insuranceType: "P&C",
      policyTerm: "12 Months",
      commissionFamily: "pc",
    };
    expect(diffPolicyFields(shown, saved)).toEqual([
      {
        fieldKey: "premisesAddress",
        fieldLabel: "Insured location",
        beforeValue: "412 Harbor Isle Dr",
        afterValue: "412 Harbor Isle Drive",
      },
    ]);
  });

  it("never invents an Ana policy change", () => {
    expect(
      diffPolicyFields({ coverageA: 321000, status: undefined }, { coverageA: 321000, status: undefined }),
    ).toEqual([]);
  });
});
