import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { convertFieldCopy } from "@/lib/crm/convert";
import { filterLeadForCarry, LEAD_CARRY_FIELDS, parseCarryFieldsFromForm } from "./transfer";

function source(file: string) {
  return readFileSync(file, "utf8");
}

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

describe("lead → deal convert carry", () => {
  it("skips the carry-fields picker and converts every transferable field", () => {
    const page = source("src/app/leads/[id]/convert/page.tsx");
    expect(page).toMatch(/convertLeadToDeal/);
    expect(page).toMatch(/tab=details/);
    expect(page).not.toMatch(/data-ff-lead-carry/);
    expect(page).not.toMatch(/carryField/);
    expect(page).not.toMatch(/Carry fields to the deal/);
    expect(page).not.toMatch(/LEAD_CARRY_FIELDS/);
    expect(source("src/components/leads/start-shop-form.tsx")).toMatch(/createDealFromLead/);
    expect(source("src/components/leads/start-shop-form.tsx")).not.toMatch(/\/leads\/\$\{leadId\}\/convert/);
    expect(source("src/app/actions/crm.ts")).toMatch(/persistDealWorkTab\(deal\.id, "details"\)/);
    expect(source("src/app/actions/crm.ts")).toMatch(/redirect\(`\/deals\/\$\{dealId\}\?tab=details`\)/);
    expect(LEAD_CARRY_FIELDS.map((field) => field.key)).toEqual(
      expect.arrayContaining(["firstName", "email", "phone", "mailingAddress", "notes"]),
    );
  });

  it("still can blank unselected fields for older selective callers", () => {
    const filtered = filterLeadForCarry(elena, ["firstName", "email"]);
    expect(filtered.firstName).toBe("Elena");
    expect(filtered.email).toBe("elena.ruiz@example.com");
    expect(filtered.phone).toBeNull();
    expect(filtered.mailingAddress).toBeNull();
    expect(filtered.notes).toBeNull();
    const copy = convertFieldCopy(elena, "HO", "FL", ["email", "mailingAddress", "city"]);
    expect(copy.risk.address1).toBe("412 Harbor Isle Dr");
    expect(copy.risk.city).toBe("Melbourne");
    expect(copy.sheetValues.named_insured?.value ?? "").toBe("");
    expect(copy.primaryNamedInsured).toBeNull();
    expect(copy.title).toBe("Elena Ruiz / Homeowners");
  });

  it("treats a missing carry list as all-fields (convert default)", () => {
    const copy = convertFieldCopy(elena, "HO", "FL");
    expect(copy.primaryNamedInsured).toBe("Elena M Ruiz");
    expect(copy.risk.address1).toBe("412 Harbor Isle Dr");
    const form = new FormData();
    form.set("carryField", "email");
    form.append("carryField", "phone");
    expect(parseCarryFieldsFromForm(form)).toEqual(["email", "phone"]);
    expect(parseCarryFieldsFromForm(new FormData())).toBeNull();
    const none = new FormData();
    none.set("carrySelective", "1");
    expect(parseCarryFieldsFromForm(none)).toEqual([]);
  });
});
