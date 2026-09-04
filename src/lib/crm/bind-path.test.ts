import { describe, expect, it } from "vitest";
import { DEAL_ID } from "@/lib/fixtures/ids";
import {
  ANA_BIND_BLOCKED,
  assertAnaUnbound,
  bindPathCopy,
  closedWonPathSentence,
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
