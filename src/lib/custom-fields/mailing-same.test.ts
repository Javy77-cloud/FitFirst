import { describe, expect, it } from "vitest";
import {
  isMailingAddressSection,
  isMailingSameAsInsured,
  isNoLivedAtAddress5Years,
  isPreviousAddressFieldKey,
  mailingAddressHasValue,
  normalizeMailingSameFlag,
  shouldShowPreviousAddressFields,
} from "./mailing-same";

describe("mailing same as insured", () => {
  it("defaults to same when mailing is blank", () => {
    expect(isMailingSameAsInsured({})).toBe(true);
    expect(isMailingSameAsInsured({ contact_mailing_address: "  " })).toBe(true);
    expect(mailingAddressHasValue({})).toBe(false);
  });

  it("defaults to not-same when a mailing field is filled and flag is unset", () => {
    expect(isMailingSameAsInsured({ contact_mailing_city: "Miami" })).toBe(false);
    expect(mailingAddressHasValue({ contact_mailing_zip: "33101" })).toBe(true);
  });

  it("lets the explicit checkbox win", () => {
    expect(
      isMailingSameAsInsured({
        mailing_same_as_insured: "true",
        contact_mailing_address: "9 Pine",
      }),
    ).toBe(true);
    expect(isMailingSameAsInsured({ mailing_same_as_insured: "false" })).toBe(false);
    expect(normalizeMailingSameFlag("no")).toBe("false");
    expect(normalizeMailingSameFlag("yes")).toBe("true");
  });

  it("shows previous address only when lived-here is No", () => {
    expect(isNoLivedAtAddress5Years("No")).toBe(true);
    expect(isNoLivedAtAddress5Years({ lived_at_address_5_years: "Yes" })).toBe(false);
    expect(isNoLivedAtAddress5Years({})).toBe(false);
    expect(isNoLivedAtAddress5Years({ lived_here_5_years: "No" })).toBe(true);
    expect(shouldShowPreviousAddressFields({ lived_at_address_5_years: "Yes" })).toBe(false);
    expect(shouldShowPreviousAddressFields({})).toBe(false);
    expect(shouldShowPreviousAddressFields({ lived_at_address_5_years: "No" })).toBe(true);
    expect(isPreviousAddressFieldKey("previous_address")).toBe(true);
    expect(isPreviousAddressFieldKey("prior_address")).toBe(true);
    expect(isPreviousAddressFieldKey("priority")).toBe(false);
  });

  it("recognizes mailing address sections", () => {
    expect(isMailingAddressSection({ id: "mailing_address", label: "Mailing" })).toBe(true);
    expect(isMailingAddressSection({ id: "other", label: "Mailing Address" })).toBe(true);
    expect(isMailingAddressSection({ id: "insured_address", label: "Insured Address" })).toBe(false);
  });
});

