import { describe, expect, it } from "vitest";
import {
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
