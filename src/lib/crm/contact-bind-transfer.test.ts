import { describe, expect, it } from "vitest";
import {
  contactCustomPatchFromValues,
  contactSystemPatchFromValues,
  emptyOnlyCoApplicantContactValues,
  emptyOnlyContactValues,
  hasCoApplicantIdentity,
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
