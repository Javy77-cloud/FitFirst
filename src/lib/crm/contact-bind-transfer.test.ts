import { describe, expect, it } from "vitest";
import {
  contactCustomPatchFromValues,
  contactSystemPatchFromValues,
  emptyOnlyCoApplicantContactValues,
  emptyOnlyContactValues,
  hasCoApplicantIdentity,
  incomingContactValuesFromDeal,
} from "./contact-bind-transfer";

describe("emptyOnlyContactValues", () => {
  it("fills blanks and never overwrites", () => {
    const patch = emptyOnlyContactValues(
      { email: "keep@x.com", phone: "" },
      {
        email: "new@x.com",
        phone: "3215550188",
        applicant_occupation: "Teacher",
        first_name: "Elena",
      },
    );
    expect(patch.email).toBeUndefined();
    expect(patch.phone).toBe("3215550188");
    expect(patch.occupation).toBe("Teacher");
    expect(patch.first_name).toBe("Elena");
  });
});

describe("emptyOnlyCoApplicantContactValues", () => {
  it("maps co-app keys onto a second contact empty-only", () => {
    const patch = emptyOnlyCoApplicantContactValues(
      { email: "" },
      {
        co_applicant_first_name: "Maria",
        co_applicant_last_name: "Lopez",
        co_applicant_email: "maria@x.com",
        co_applicant_occupation: "Nurse",
      },
    );
    expect(patch.first_name).toBe("Maria");
    expect(patch.last_name).toBe("Lopez");
    expect(patch.email).toBe("maria@x.com");
    expect(patch.occupation).toBe("Nurse");
  });
});

describe("hasCoApplicantIdentity", () => {
  it("detects name presence", () => {
    expect(hasCoApplicantIdentity({})).toBe(false);
    expect(hasCoApplicantIdentity({ co_applicant_first_name: "A" })).toBe(true);
  });

  it("respects explicit Off switch", () => {
    expect(
      hasCoApplicantIdentity({
        has_co_applicant: "false",
        co_applicant_first_name: "A",
      }),
    ).toBe(false);
  });
});

describe("contactSystemPatchFromValues", () => {
  it("drops blanks", () => {
    expect(contactSystemPatchFromValues({ first_name: "A", email: "" })).toEqual({
      firstName: "A",
    });
  });
});

describe("incomingContactValuesFromDeal", () => {
  it("keeps deal DOB when lead/sheet DOB is empty and skips rental address copy", () => {
    const { incoming, propertyKind } = incomingContactValuesFromDeal({
      dealCustom: {
        date_of_birth: "03/22/1965",
        mailing_address: "18025 Cypress Point Road",
        city: "Fort Myers",
        state: "FL",
        zip: "33912",
      },
      lead: { dateOfBirth: "", mailingAddress: "" },
      sheetValues: { date_of_birth: { value: "" } },
      risk: { address1: "18025 Cypress Point Road", city: "Fort Myers", state: "FL", zip: "33912" },
      product: "DP3",
      quotingForm: "DP3",
    });
    expect(incoming.date_of_birth).toBe("1965-03-22");
    expect(propertyKind).toBe("secondary");
    expect(incoming.mailing_address).toBe("");
    const patch = emptyOnlyContactValues(
      { mailing_address: "", date_of_birth: "" },
      incoming,
    );
    expect(patch.date_of_birth).toBe("1965-03-22");
    expect(patch.mailing_address).toBeUndefined();
  });

  it("still copies a lead home address when the insured location is rental / secondary", () => {
    const { incoming, propertyKind } = incomingContactValuesFromDeal({
      dealCustom: { mailing_address: "18025 Cypress Point Road" },
      lead: { mailingAddress: "8561 SW 85th St Ave", city: "Miami", state: "FL", zip: "33173" },
      product: "DP3",
      quotingForm: "DP3",
    });
    expect(propertyKind).toBe("secondary");
    expect(incoming.mailing_address).toBe("8561 SW 85th St Ave");
    expect(
      emptyOnlyContactValues({ mailing_address: "" }, incoming).mailing_address,
    ).toBe("8561 SW 85th St Ave");
  });

  it("copies insured address onto Contact only for a primary residence", () => {
    const { incoming, propertyKind } = incomingContactValuesFromDeal({
      dealCustom: { mailing_address: "12 Oak St", city: "Palm Bay", state: "FL", zip: "32909" },
      product: "HO3",
      quotingForm: "HO3",
    });
    expect(propertyKind).toBe("primary");
    expect(incoming.mailing_address).toBe("12 Oak St");
    expect(
      emptyOnlyContactValues({ mailing_address: "" }, incoming).mailing_address,
    ).toBe("12 Oak St");
  });
});

describe("contactCustomPatchFromValues", () => {
  it("keeps non-system keys", () => {
    expect(
      contactCustomPatchFromValues({
        first_name: "A",
        occupation: "Teacher",
        preferred_contact_method: "Phone",
      }),
    ).toEqual({
      occupation: "Teacher",
      preferred_contact_method: "Phone",
    });
  });
});
