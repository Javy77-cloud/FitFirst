import { describe, expect, it } from "vitest";
import { CONTACT_ID, DEAL_ID } from "@/lib/fixtures/ids";
import {
  ANA_COV_A,
  ANA_PROTECTED_MESSAGE,
  anaCoverageOverwrite,
  anaPolicyBlocked,
  refersToAna,
} from "./ana";

describe("Ana Dib import guard", () => {
  it("blocks a Policy create for Ana's shop or email", () => {
    expect(anaPolicyBlocked({ contactId: CONTACT_ID })).toBe(true);
    expect(anaPolicyBlocked({ dealId: DEAL_ID })).toBe(true);
    expect(anaPolicyBlocked({ contactEmail: "ana.dib@desk.local" })).toBe(true);
    expect(anaPolicyBlocked({ firstName: "Ana", lastName: "Dib" })).toBe(true);
    expect(anaPolicyBlocked({ contactEmail: "elena.ruiz@desk.local" })).toBe(false);
    expect(ANA_PROTECTED_MESSAGE).toContain("321,000");
  });

  it("does not treat a different Cov A as Ana's fixture", () => {
    expect(ANA_COV_A).toBe(321000);
    expect(anaCoverageOverwrite(321000)).toBe(false);
    expect(anaCoverageOverwrite(400000)).toBe(true);
    expect(refersToAna({ email: "maya@fitfirst.local" })).toBe(false);
  });
});
