import { describe, expect, it } from "vitest";
import { HOLDER_CONTACT_DISCLAIMER } from "@/lib/domain-ams";
import {
  formatHolderContactAddress,
  formatHolderContactLine,
  holderContactIssuesCoi,
  isOpenHolderContact,
  validateHolderContact,
} from "./holder-contacts";

describe("certificate holder contacts", () => {
  it("saves Palm Bay contact details without issuing a COI", () => {
    const parsed = validateHolderContact({
      name: "Palm Bay Marina Dockage",
      email: "certs@palmbaymarina.example",
      phone: "321-555-0144",
      address: "100 Harbor Key Blvd",
      city: "Palm Bay",
      state: "fl",
      zip: "32905",
      notes: "Issued stub already on Harbor. Do not re-issue.",
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.state).toBe("FL");
    expect(holderContactIssuesCoi()).toBe(false);
    expect(isOpenHolderContact("active")).toBe(true);
    expect(isOpenHolderContact("archived")).toBe(false);
    expect(formatHolderContactLine(parsed)).toContain("certs@palmbaymarina.example");
    expect(formatHolderContactAddress(parsed)).toContain("Palm Bay, FL");
    expect(HOLDER_CONTACT_DISCLAIMER.toLowerCase()).toContain("does not issue");
  });

  it("requires a name and a real email when one is typed", () => {
    expect(validateHolderContact({ name: "   " }).ok).toBe(false);
    expect(validateHolderContact({ name: "Brevard County Parks", email: "not-an-email" }).ok).toBe(
      false,
    );
    expect(validateHolderContact({ name: "Brevard County Parks", state: "Florida" }).ok).toBe(false);
    expect(validateHolderContact({ name: "Brevard County Parks", email: "" }).ok).toBe(true);
  });
});
