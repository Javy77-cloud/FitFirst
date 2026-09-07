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

describe("selective lead → deal carry", () => {
  it("ships a convert screen with checkboxes for each lead field", () => {
    const page = source("src/app/leads/[id]/convert/page.tsx");
    expect(page).toMatch(/data-ff-lead-carry/);
    expect(page).toMatch(/carryField/);
    expect(page).toMatch(/LEAD_CARRY_FIELDS/);
    expect(page).toMatch(/createDealFromLead/);
    expect(LEAD_CARRY_FIELDS.map((field) => field.key)).toEqual(
      expect.arrayContaining(["firstName", "email", "phone", "mailingAddress", "notes"]),
    );
    expect(source("src/components/leads/lead-detail-workspace.tsx")).toMatch(/\/leads\/\$\{leadId\}\/convert/);
  });

  it("copies only the fields the agent checked", () => {
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
    expect(copy.title).toBe("Elena Ruiz Home");
  });

  it("treats a missing carry list as all-fields (legacy convert)", () => {
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
