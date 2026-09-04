import { describe, expect, it } from "vitest";
import { DEAL_ID } from "@/lib/fixtures/ids";
import {
  ANA_BIND_BLOCKED,
  assertAnaUnbound,
  bindPathCopy,
  closedWonPathSentence,
  dealBindParty,
  dealGapPartyName,
  isAnaDeal,
} from "./bind-path";

describe("Closed Won bind path", () => {
  it("never binds Ana", () => {
    expect(isAnaDeal(DEAL_ID)).toBe(true);
    expect(() => assertAnaUnbound(DEAL_ID)).toThrow(ANA_BIND_BLOCKED);
    expect(() => assertAnaUnbound("44444444-4444-4444-8444-444444444442")).not.toThrow();
  });

  it("labels personal Closed Won as Contact + Policy", () => {
    const copy = bindPathCopy("contact", "Homeowners");
    expect(copy.headline).toBe("Personal · Contact + Policy");
    expect(copy.button).toBe("Bind Closed Won — Contact + Policy");
    expect(copy.whatHappens).toMatch(/Contact/);
    expect(copy.whatHappens).toMatch(/do not retype/i);
    expect(copy.whatHappens).toMatch(/Quotes stay on the deal/);
  });

  it("labels commercial Closed Won as Business + Policy", () => {
    const copy = bindPathCopy("account", "General liability");
    expect(copy.headline).toBe("Commercial · Business + Policy");
    expect(copy.button).toBe("Bind Closed Won — Business + Policy");
    expect(copy.whatHappens).toMatch(/Business/);
    expect(copy.whatHappens).toMatch(/EIN/);
  });

  it("names Elena's Closed Won as Contact + Policy even when Ruiz Tile is linked", () => {
    const party = dealBindParty({
      bindTarget: "contact",
      contact: { id: "c1", firstName: "Elena", lastName: "Ruiz" },
      account: { id: "a1", name: "Ruiz Tile LLC" },
      boundPolicies: [{ contactId: "c1", accountId: null }],
    });
    expect(party?.kind).toBe("contact");
    expect(party?.name).toBe("Ruiz, Elena");
    expect(dealGapPartyName({
      bindTarget: "contact",
      contactName: "Ruiz, Elena",
      accountName: "Ruiz Tile LLC",
      fallback: "Ruiz · Melbourne HO3",
    })).toBe("Ruiz, Elena");
  });

  it("names Harbor Closed Won as Business + Policy", () => {
    const party = dealBindParty({
      bindTarget: "account",
      contact: { id: "c2", firstName: "Marco", lastName: "Alvarez" },
      account: { id: "a2", name: "Harbor Key Marine LLC" },
      boundPolicies: [{ contactId: null, accountId: "a2" }],
    });
    expect(party?.kind).toBe("account");
    expect(party?.name).toBe("Harbor Key Marine LLC");
  });

  it("says Closed Won wrote the party plus the policy", () => {
    expect(
      closedWonPathSentence({
        partyKind: "contact",
        partyName: "Ruiz, Elena",
        policyNumber: "HO3-ELENA-2026",
      }),
    ).toBe("Closed Won wrote Contact Ruiz, Elena + Policy HO3-ELENA-2026. Quotes on this deal stayed quotes.");
    expect(
      closedWonPathSentence({
        partyKind: "account",
        partyName: "Harbor Key Marine LLC",
        policyNumber: "GL-HARBOR-2026",
      }),
    ).toMatch(/Business Harbor Key Marine LLC \+ Policy GL-HARBOR-2026/);
  });
});
