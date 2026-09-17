import { describe, expect, it } from "vitest";
import {
  dealHasAnyCoApplicantValue,
  isCoApplicantEnabled,
  isCoApplicantExplicitlyOff,
  normalizeHasCoApplicantFlag,
} from "./co-applicant-fields";
import { emptySheetValues } from "@/lib/quote-sheet/catalog";
import { fillSheetFromDealDetails } from "@/lib/quote-sheet/fill-from-deal";
import { hasCoApplicantIdentity } from "@/lib/crm/contact-bind-transfer";

describe("has_co_applicant switch", () => {
  it("defaults Off when all co-app fields blank", () => {
    expect(isCoApplicantEnabled({})).toBe(false);
    expect(isCoApplicantEnabled({ co_applicant_first_name: "  " })).toBe(false);
    expect(dealHasAnyCoApplicantValue({})).toBe(false);
  });

  it("defaults On when any co-app value present", () => {
    expect(isCoApplicantEnabled({ co_applicant_email: "a@x.com" })).toBe(true);
    expect(dealHasAnyCoApplicantValue({ co_applicant_last_name: "Lopez" })).toBe(true);
  });

  it("explicit false wins even if values present", () => {
    expect(
      isCoApplicantEnabled({
        has_co_applicant: "false",
        co_applicant_first_name: "Tom",
      }),
    ).toBe(false);
  });

  it("explicit true wins even if blank", () => {
    expect(isCoApplicantEnabled({ has_co_applicant: "true" })).toBe(true);
  });

  it("normalizes flag strings", () => {
    expect(normalizeHasCoApplicantFlag("yes")).toBe("true");
    expect(normalizeHasCoApplicantFlag("off")).toBe("false");
  });

  it("fill skips co-app when switch Off", () => {
    const existing = emptySheetValues("home");
    const result = fillSheetFromDealDetails(
      {
        stored: {
          first_name: "Heather",
          last_name: "Camirand",
          has_co_applicant: "false",
          co_applicant_first_name: "Tom",
          co_applicant_last_name: "Camirand",
          co_applicant_email: "tom@example.com",
        },
      },
      existing,
    );
    expect(result.values.applicant_name).toBeUndefined();
    expect(result.values.named_insured.value).toBe("Heather Camirand");
    expect(result.values.co_applicant_name).toBeUndefined();
    expect(result.values.co_applicant_email).toBeUndefined();
    expect(result.filledKeys).not.toContain("co_applicant_name");
  });

  it("fill still copies co-app when values present and flag unset", () => {
    const existing = emptySheetValues("home");
    const result = fillSheetFromDealDetails(
      {
        stored: {
          first_name: "Heather",
          last_name: "Camirand",
          co_applicant_first_name: "Tom",
          co_applicant_last_name: "Camirand",
        },
      },
      existing,
    );
    expect(result.values.co_applicant_name).toBeUndefined();
    expect(result.values.secondary_named_insured.value).toBe("Tom Camirand");
  });

  it("bind identity respects Off switch", () => {
    expect(
      hasCoApplicantIdentity({
        has_co_applicant: "false",
        co_applicant_first_name: "Tom",
      }),
    ).toBe(false);
    expect(hasCoApplicantIdentity({ co_applicant_first_name: "Tom" })).toBe(true);
  });

  it("explicit Off is distinguishable for sheet save/UI", () => {
    expect(isCoApplicantExplicitlyOff({ has_co_applicant: "false" })).toBe(true);
    expect(isCoApplicantExplicitlyOff("off")).toBe(true);
    expect(isCoApplicantExplicitlyOff({})).toBe(false);
    expect(isCoApplicantExplicitlyOff({ has_co_applicant: "true" })).toBe(false);
    expect(isCoApplicantExplicitlyOff(undefined)).toBe(false);
  });
});
