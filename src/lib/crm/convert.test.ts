import { describe, expect, it } from "vitest";
import {
  convertFieldCopy,
  dealNotesFromLead,
  pipelineSlugForLine,
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
    expect(shopLinesForConvert("HO")).toEqual(["home"]);
    expect(shopLinesForConvert("AUTO")).toEqual(["auto"]);
  });

  it("copies every lead field that has a home on the deal / risk / sheet", () => {
    const copy = convertFieldCopy(elena, "HO", "FL");
    expect(copy.title).toBe("Elena / Ruiz / Home");
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

  it("keeps Ana-style notes when the lead already has them", () => {
    expect(dealNotesFromLead({ lastName: "Dib", notes: "Palm Bay HO3 shop" })).toBe("Palm Bay HO3 shop");
  });
});
