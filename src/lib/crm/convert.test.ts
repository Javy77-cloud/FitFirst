import { describe, expect, it } from "vitest";
import {
  convertActivityLineLabel,
  convertActivityTitle,
  convertFieldCopy,
  dealNotesFromLead,
  lobFromLeadInsuranceCustom,
  pipelineSlugForLine,
  relabelConvertActivityTitle,
  resolveConvertLine,
  shopLinesForConvert,
} from "./convert";

const elena = {
  firstName: "Elena",
  middleName: "M",
  lastName: "Ruiz",
  email: "elena.ruiz@example.com",
  phone: "(321) 555-0188",
  mailingAddress: "412 Harbor Isle Dr",
  city: "Melbourne",
  state: "FL",
  zip: "32935",
  dateOfBirth: "1984-03-12",
  notes: "Melbourne HO drop",
  source: "dec_drop",
  preferredLanguage: "es",
  insuranceTypeDesired: "HO",
};

describe("lead → deal convert copy", () => {
  it("resolves line, board, and shop lines without inventing a second funnel", () => {
    expect(resolveConvertLine("", "HO")).toBe("HO");
    expect(resolveConvertLine("AUTO", "HO")).toBe("AUTO");
    expect(pipelineSlugForLine("HO")).toBe("p-c");
    expect(pipelineSlugForLine("HEALTH")).toBe("health");
    expect(pipelineSlugForLine("FLOOD")).toBe("p-c");
    expect(shopLinesForConvert("HO")).toEqual(["home"]);
    expect(shopLinesForConvert("AUTO")).toEqual(["auto"]);
  });

  it("derives LOB from lead Insurance subtype / Type — not silent HO", () => {
    expect(lobFromLeadInsuranceCustom({ insurance_subtype: "Auto" })).toBe("AUTO");
    expect(lobFromLeadInsuranceCustom({ insurance_subtype: "PA" })).toBe("AUTO");
    expect(lobFromLeadInsuranceCustom({ insurance_type: "Auto" })).toBe("AUTO");
    expect(lobFromLeadInsuranceCustom({ insurance_subtype: "HO3" })).toBe("HO");
    expect(lobFromLeadInsuranceCustom({ insurance_type: "Life" })).toBe("LIFE");
    expect(lobFromLeadInsuranceCustom({ insurance_type: "Flood" })).toBe("FLOOD");
    expect(lobFromLeadInsuranceCustom({ insurance_subtype: "GL" })).toBe("GL");
    expect(
      resolveConvertLine("HO", "HO", { insurance_subtype: "Auto", insurance_type: "Auto" }),
    ).toBe("AUTO");
    expect(resolveConvertLine("HO", null, { insurance_type: "Workers Comp" })).toBe("WC");
    expect(resolveConvertLine("", null, {})).toBe("HO");
  });

  it("copies every lead field that has a home on the deal / risk / sheet", () => {
    const copy = convertFieldCopy(elena, "HO", "FL");
    expect(copy.title).toBe("Elena Ruiz");
    expect(copy.primaryNamedInsured).toBe("Elena M Ruiz");
    expect(copy.dealState).toBe("FL");
    expect(copy.pipelineSlug).toBe("p-c");
    expect(copy.shopLines).toEqual(["home"]);
    expect(copy.risk).toEqual({
      address1: "412 Harbor Isle Dr",
      city: "Melbourne",
      state: "FL",
      zip: "32935",
    });
    expect(copy.sheetValues.named_insured.value).toBe("Elena M Ruiz");
    expect(copy.sheetValues.address1.value).toBe("412 Harbor Isle Dr");
    expect(copy.notes).toContain("Melbourne HO drop");
    expect(copy.source).toBe("dec_drop");
    expect(copy.notes).toContain("Source: Dec drop");
    expect(copy.notes).toContain("Language: es");
    expect(copy.notes).toContain("elena.ruiz@example.com");
    expect(copy.fieldValues.phone).toBe("(321) 555-0188");
    expect(copy.fieldValues.email).toBe("elena.ruiz@example.com");
    expect(copy.fieldValues.mailing_address).toBe("412 Harbor Isle Dr");
    expect(copy.fieldValues.city).toBe("Melbourne");
    expect(copy.fieldValues.source).toBe("dec_drop");
    expect(copy.fieldValues.preferred_language).toBe("es");
    expect(copy.fieldValues.notes).toBe("Melbourne HO drop");
  });

  it("Auto subtype on lead → Auto title, quotingForm PA, auto shop line", () => {
    const copy = convertFieldCopy(
      { ...elena, insuranceTypeDesired: null },
      "AUTO",
      "FL",
      null,
      { insurance_type: "Auto", insurance_subtype: "Auto" },
    );
    expect(copy.title).toBe("Elena Ruiz");
    expect(copy.quotingForm).toBe("PA");
    expect(copy.quotingLine).toBe("auto");
    expect(copy.shopLines).toEqual(["auto"]);
    expect(copy.sheetLine).toBe("auto");
    expect(copy.fieldValues.insurance_type).toBe("Auto");
    expect(copy.fieldValues.insurance_subtype).toBe("Auto");
    expect(copy.policySubType).toBe("Auto");
  });


  it("Life subtype on lead → LIFE title, Term Life form, life shop line (not HO3)", () => {
    const copy = convertFieldCopy(
      { ...elena, insuranceTypeDesired: null },
      "LIFE",
      "FL",
      null,
      { insurance_type: "Life", insurance_subtype: "Term Life" },
    );
    expect(copy.title).toBe("Elena Ruiz");
    expect(copy.quotingForm).toBe("Term Life");
    expect(copy.quotingLine).toBe("life");
    expect(copy.shopLines).toEqual(["life"]);
    expect(copy.sheetLine).toBe("life");
    expect(copy.policySubType).toBe("Term Life");
  });

  it("keeps Ana-style notes when the lead already has them", () => {
    expect(dealNotesFromLead({ lastName: "Dib", notes: "Palm Bay HO3 shop" })).toBe("Palm Bay HO3 shop");
  });

  it("labels convert/activity from the deal line/product — not hardcoded Homeowners", () => {
    expect(
      convertActivityLineLabel({
        lineOfBusiness: "LIFE",
        quotingForm: "Term Life",
        policySubType: "Term Life",
      }),
    ).toBe("Life / Term Life");
    expect(
      convertActivityTitle({
        lineOfBusiness: "LIFE",
        quotingForm: "Term Life",
        policySubType: "Term Life",
      }),
    ).toBe("Lead converted · Life / Term Life");
    expect(
      convertActivityLineLabel({
        lineOfBusiness: "HO",
        quotingForm: "HO3",
        policySubType: "HO3",
      }),
    ).toBe("Homeowners / HO3");
    expect(
      convertActivityLineLabel({
        lineOfBusiness: "HEALTH",
        quotingForm: "Marketplace",
        policySubType: "Marketplace",
      }),
    ).toBe("Health / Marketplace");
    expect(
      relabelConvertActivityTitle("Lead converted to homeowners", {
        lineOfBusiness: "LIFE",
        quotingForm: "Term Life",
        policySubType: "Term Life",
      }),
    ).toBe("Lead converted · Life / Term Life");
    expect(
      relabelConvertActivityTitle("Call logged", {
        lineOfBusiness: "LIFE",
        quotingForm: "Term Life",
      }),
    ).toBe("Call logged");
  });
});
