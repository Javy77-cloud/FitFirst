import { describe, expect, it } from "vitest";
import { presentCarrierCard, presentPartyCard } from "./present";

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
    expect(card.mid).toBe("Not reached");
    expect(card.peek).toBe("DBA Ruiz Tile · FEIN ••••4321");
    expect(card.facts?.map((fact) => fact.label)).toEqual(["1 policy", "LLC"]);
    expect(card.flags.portalContact).toBe(false);
    expect(card.flags.neverTouched).toBe(true);
  });

  it("keeps contact chips to the facts an agent can use in two seconds", () => {
    const card = presentPartyCard(
      {
        id: "c",
        firstName: "Ana",
        lastName: "Dib",
        phone: "(321) 555-0100",
        email: "ana@example.com",
        preferredLanguage: "es",
        source: "referral",
        policyCount: 2,
        activePolicyCount: 2,
        nearestRenewalDays: 20,
        loggedTouchAt: "2026-09-18T12:00:00.000Z",
      },
      "contact",
      {
        asOf: new Date("2026-09-21T12:00:00.000Z"),
        open: { count: 1, dealId: "deal-1" },
      },
    );
    expect(card.mid).toBe("Reached 3d ago");
    expect(card.facts?.map((fact) => fact.label)).toEqual([
      "Renews ≤60d",
      "1 open deal",
      "2 policies",
      "Spanish",
    ]);
    expect(card.facts?.find((fact) => fact.id === "deals")?.href).toBe("/deals/deal-1");
    expect(card.phone).toBe("(321) 555-0100");
    expect(card.email).toBe("ana@example.com");
  });

  it("lines carrier posture and last use up as separate columns", () => {
    const card = presentCarrierCard(
      {
        id: "oak",
        name: "Southern Oak",
        writtenLines: ["HO3", "AUTO"],
        phone: "(800) 555-0199",
        email: "uw@southernoak.example",
        portalUrl: "https://portal.example/oak",
        appetiteNotes: "Older roofs need photos",
        premiumVolume: 12400,
      },
      {
        rateable: null,
        skipDecline: false,
        skipWhy: null,
        limited: true,
        appetiteLines: ["HO3"],
        dontWrite: [],
        lastUseAt: null,
        lastUseKind: null,
        declineCount: 0,
        skipCount: 0,
        activePolicies: 4,
        premiumVolume: 12400,
        bookFamilies: ["pc"],
      },
      new Date("2026-09-21T12:00:00.000Z"),
      { writeLife: false, writeHealth: false },
    );
    expect(card.columns?.map((column) => column.label)).toEqual(["Limited appetite", "No recent use"]);
    expect(card.peek).toBe("Writes Home · Auto");
    expect(card.facts?.map((fact) => fact.id)).toEqual(["premium", "policies", "appetite"]);
    expect(card.actions?.map((action) => action.id)).toEqual(["portal", "phone", "email"]);
    expect(card.flags.families).toEqual(["pc"]);
  });
});
