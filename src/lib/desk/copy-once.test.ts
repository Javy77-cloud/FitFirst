import { describe, expect, it } from "vitest";
import { fillBlankParty, fillSheetFromLead, firstFilled, leadOntoRisk } from "./copy-once";
import { emptySheetValues } from "@/lib/lifecycle/quote-sheet";

const elena = {
  firstName: "Elena",
  lastName: "Ruiz",
  email: "elena.ruiz@example.com",
  phone: "(321) 555-0188",
  mailingAddress: "412 Harbor Isle Dr",
  city: "Melbourne",
  state: "FL",
  zip: "32935",
  dateOfBirth: "1984-03-12",
};

describe("copy once Lead → Deal → Contact", () => {
  it("copies lead mailing onto the deal risk", () => {
    expect(leadOntoRisk(elena)).toEqual({
      address1: "412 Harbor Isle Dr",
      city: "Melbourne",
      state: "FL",
      zip: "32935",
    });
  });

  it("fills blank quote-sheet cells and leaves confirmed cells alone", () => {
    const existing = emptySheetValues();
    existing.city = { value: "Palm Bay", status: "confirmed", source: "javy" };
    const filled = fillSheetFromLead(elena, existing);
    expect(filled.address1.value).toBe("412 Harbor Isle Dr");
    expect(filled.mailing_address.value).toBe("412 Harbor Isle Dr");
    expect(filled.named_insured.value).toBe("Elena Ruiz");
    expect(filled.notes.value).toContain("elena.ruiz@example.com");
    expect(filled.notes.value).toContain("(321) 555-0188");
    expect(filled.notes.value).toContain("1984-03-12");
    expect(filled.city.value).toBe("Palm Bay");
    expect(filled.city.source).toBe("javy");
  });

  it("never overwrites a contact field the desk already has", () => {
    const kept = fillBlankParty(
      { mailingAddress: "1098 Adige Ct SE", city: "Palm Bay", state: "FL", zip: "32909", phone: null, email: null, dateOfBirth: null },
      elena,
    );
    expect(kept.mailingAddress).toBe("1098 Adige Ct SE");
    expect(kept.phone).toBe("(321) 555-0188");
    expect(kept.dateOfBirth).toBe("1984-03-12");
  });

  it("picks the first value already on a linked record", () => {
    expect(firstFilled(null, "", 385000, "nope")).toBe("385000");
    expect(firstFilled(null, "  ")).toBe("");
  });
});
