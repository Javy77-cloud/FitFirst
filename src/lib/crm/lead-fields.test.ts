import { describe, expect, it } from "vitest";
import { insuranceTypeFromForm, leadValuesFromForm, namedInsuredFromLead } from "./lead-fields";

describe("lead form fields", () => {
  it("reads the person packet and extras from the form", () => {
    const form = new FormData();
    form.set("firstName", "Elena");
    form.set("middleName", "M");
    form.set("lastName", "Ruiz");
    form.set("dateOfBirth", "1984-03-12");
    form.set("email", "elena.ruiz@example.com");
    form.set("phone", "(321) 555-0188");
    form.set("mailingAddress", "412 Harbor Isle Dr");
    form.set("city", "Melbourne");
    form.set("state", "FL");
    form.set("zip", "32935");
    form.set("insuranceTypeDesired", "HO");
    form.set("source", "referral");
    form.set("preferredLanguage", "es");
    form.set("notes", "Asked for an HO3.");

    expect(leadValuesFromForm(form)).toEqual({
      firstName: "Elena",
      middleName: "M",
      lastName: "Ruiz",
      dateOfBirth: "1984-03-12",
      email: "elena.ruiz@example.com",
      phone: "(321) 555-0188",
      mailingAddress: "412 Harbor Isle Dr",
      city: "Melbourne",
      state: "FL",
      zip: "32935",
      insuranceTypeDesired: "HO",
      source: "referral",
      preferredLanguage: "es",
      notes: "Asked for an HO3.",
    });
  });

  it("reads Edit Layout field_* names when classic inputs are absent", () => {
    const form = new FormData();
    form.set("field_first_name", "Javy");
    form.set("field_last_name", "Garcia");
    form.set("field_email", "javy@fitfirst.local");
    form.set("field_source", "referral");
    expect(leadValuesFromForm(form)).toMatchObject({
      firstName: "Javy",
      lastName: "Garcia",
      email: "javy@fitfirst.local",
      source: "referral",
    });
  });

  it("rejects unknown insurance types and builds a named insured with middle", () => {
    expect(insuranceTypeFromForm("HO")).toBe("HO");
    expect(insuranceTypeFromForm("not-a-line")).toBeNull();
    expect(namedInsuredFromLead({ firstName: "Elena", middleName: "M", lastName: "Ruiz" })).toBe(
      "Elena M Ruiz",
    );
    expect(namedInsuredFromLead({ firstName: "Elena", lastName: "Ruiz" })).toBe("Elena Ruiz");
  });
});
