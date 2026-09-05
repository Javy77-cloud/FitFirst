import { describe, expect, it } from "vitest";
import {
  allowedInterestKinds,
  canHoldInterests,
  formatHolderAddress,
  formatInterestLine,
  isPersonalLinesPolicy,
  validateInterestDraft,
} from "./additional-interests";

describe("additional interests", () => {
  it("allows mortgagee CRUD only on personal-lines Policies with a Contact", () => {
    expect(
      isPersonalLinesPolicy({ contactId: "c1", lineOfBusiness: "HO3" }),
    ).toBe(true);
    expect(
      isPersonalLinesPolicy({ contactId: "c1", lineOfBusiness: "PA" }),
    ).toBe(true);
    expect(
      isPersonalLinesPolicy({ contactId: null, lineOfBusiness: "GL" }),
    ).toBe(false);
    expect(
      isPersonalLinesPolicy({ contactId: "c1", lineOfBusiness: "GL" }),
    ).toBe(false);
  });

  it("lets Harbor GL hold certificate-holder / additional insured, not a mortgagee", () => {
    const harbor = { contactId: null, accountId: "a1", lineOfBusiness: "GL" };
    expect(canHoldInterests(harbor)).toBe(true);
    expect(allowedInterestKinds(harbor)).toEqual([
      "additional_interest",
      "certificate_holder",
      "loss_payee",
    ]);
    expect(allowedInterestKinds({ contactId: "c1", lineOfBusiness: "HO3" })).toContain(
      "mortgagee",
    );
    expect(formatHolderAddress({ address: "1 Dock", city: "Palm Bay", state: "FL", zip: "32907" })).toBe(
      "1 Dock\nPalm Bay, FL 32907",
    );
  });

  it("requires kind + name and formats the list line", () => {
    expect(validateInterestDraft({ kind: "mortgagee", name: "" }).ok).toBe(false);
    expect(validateInterestDraft({ kind: "other", name: "Bank" }).ok).toBe(false);
    const ok = validateInterestDraft({
      kind: "mortgagee",
      name: "First Community Bank ISAOA",
    });
    expect(ok.ok).toBe(true);
    expect(
      formatInterestLine({
        kind: "mortgagee",
        name: "First Community Bank ISAOA",
        loanNumber: "88421-ELENA",
        city: "Melbourne",
        state: "FL",
      }),
    ).toBe("Mortgagee · First Community Bank ISAOA · loan 88421-ELENA · Melbourne, FL");
  });
});
