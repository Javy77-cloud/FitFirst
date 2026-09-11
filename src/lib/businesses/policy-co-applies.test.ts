import { describe, expect, it } from "vitest";
import {
  coAppliesWithFromPolicy,
  formatPolicyCoApplicantName,
  namedInsuredCoApplicantContacts,
  policyCoApplicantLabel,
} from "@/lib/contacts/policy-co-applicants";

describe("business policy coAppliesWith (shared helper)", () => {
  const ana = { id: "c-ana", firstName: "Ana", lastName: "Dib" };
  const elena = { id: "c-elena", firstName: "Elena", lastName: "Ruiz" };

  it("labels Co-Applies With for reverse lookup chrome", () => {
    expect(policyCoApplicantLabel("co-applies-with")).toBe("Co-Applies With:");
  });

  it("matches secondaryNamedInsured against candidates (not M2M)", () => {
    const hits = namedInsuredCoApplicantContacts({
      primaryContactId: ana.id,
      secondaryNamedInsured: "Elena Ruiz",
      candidates: [ana, elena],
    });
    expect(hits).toEqual([elena]);
  });

  it("maps links into singular coAppliesWith prop shape", () => {
    const prop = coAppliesWithFromPolicy({
      excludeContactId: ana.id,
      linkedContacts: [elena],
      ownsPolicies: true,
    });
    expect(prop).toEqual({
      id: elena.id,
      label: formatPolicyCoApplicantName(elena),
    });
  });

  it("returns null when no named-insured co-app match", () => {
    expect(
      namedInsuredCoApplicantContacts({
        primaryContactId: ana.id,
        secondaryNamedInsured: null,
        candidates: [ana, elena],
      }),
    ).toEqual([]);
    expect(
      coAppliesWithFromPolicy({
        excludeContactId: ana.id,
        linkedContacts: [],
      }),
    ).toBeNull();
  });
});
