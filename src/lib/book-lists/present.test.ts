import { describe, expect, it } from "vitest";
import { presentPartyCard } from "./present";

describe("account card glance", () => {
  it("prefers a masked FEIN over a raw entity code", () => {
    const card = presentPartyCard(
      {
        id: "a",
        name: "Ruiz Tile LLC",
        dba: "Ruiz Tile",
        entityType: "llc",
        einLast4: "4321",
        phone: "(321) 555-0188",
        email: "office@ruiztile.example",
        policyCount: 1,
        activePolicyCount: 1,
        loggedTouchAt: null,
      },
      "account",
      { asOf: new Date("2026-09-21T12:00:00.000Z") },
    );
    expect(card.mid).toBe("Never touched");
    expect(card.peek).toBe("DBA Ruiz Tile · FEIN ••••4321");
    expect(card.flags.portalContact).toBe(false);
    expect(card.flags.neverTouched).toBe(true);
  });
});
