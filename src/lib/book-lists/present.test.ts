import { describe, expect, it } from "vitest";
import { parseBookLayout } from "./lenses";
import { presentCarrierCard, presentPartyCard, presentPolicyCard } from "./present";

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
    expect(card.peek).toBeNull();
    expect(card.facts?.map((fact) => fact.label)).toEqual([
      "DBA Ruiz Tile",
      "LLC",
      "FEIN ••••4321",
      "1 in-force",
    ]);
    expect(card.flags.portalContact).toBe(false);
    expect(card.flags.neverTouched).toBe(true);
  });

  it("keeps a full account glance inside two rows of five columns", () => {
    const card = presentPartyCard(
      {
        id: "full",
        name: "Ruiz Tile LLC",
        dba: "Ruiz Tile",
        industry: "Tile",
        entityType: "llc",
        einLast4: "4321",
        primaryContactName: "Elena Ruiz",
        premiumBook: 12000,
        linkedContactsCount: 2,
        phone: "(321) 555-0188",
        email: "office@ruiztile.example",
        policyCount: 3,
        activePolicyCount: 3,
        nearestRenewalDays: 40,
      },
      "account",
      {
        asOf: new Date("2026-09-21T12:00:00.000Z"),
        open: { count: 1, dealId: "deal-9" },
      },
    );
    expect(card.facts?.map((fact) => fact.id)).toEqual([
      "dba",
      "industry",
      "entity",
      "fein",
      "contact",
      "premium",
      "people",
      "deals",
      "policies",
      "renewal",
    ]);
    expect(card.facts?.length).toBeLessThanOrEqual(10);
    expect(card.phone).toBe("(321) 555-0188");
    expect(card.email).toBe("office@ruiztile.example");
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
      "Spanish",
      "Referral",
      "1 open shop",
      "2 in-force",
      "Renews in 20d",
    ]);
    expect(card.facts?.find((fact) => fact.id === "deals")?.href).toBe("/deals/deal-1");
    expect(card.phone).toBe("(321) 555-0100");
    expect(card.email).toBe("ana@example.com");
  });

  it("puts a preferred contact window in the center and skips English", () => {
    const card = presentPartyCard(
      {
        id: "c2",
        firstName: "Luis",
        lastName: "Vega",
        city: "Orlando",
        clientStatus: "client",
        preferredLanguage: "english",
        preferredContactMethod: "Phone",
        preferredContactTime: "Morning",
        dateOfBirth: "1979-04-12",
        policyCount: 0,
        activePolicyCount: 0,
      },
      "contact",
      { asOf: new Date("2026-09-21T12:00:00.000Z") },
    );
    expect(card.facts?.map((fact) => fact.label)).toEqual([
      "Call · Morning",
      "Orlando",
      "Client",
      "DOB 04/12",
    ]);
    expect(card.facts?.some((fact) => /english/i.test(fact.label))).toBe(false);
    expect(card.mid).toBe("Not reached");
  });

  it("drops an empty dash under the name and keeps real phone, email, and facts", () => {
    const card = presentPartyCard(
      {
        id: "dash",
        firstName: "Ana",
        lastName: "Dib",
        clientStatus: "—",
        city: "—",
        source: "-",
        preferredLanguage: "es",
        phone: "(321) 555-0100",
        email: "ana@example.com",
        policyCount: 1,
        activePolicyCount: 1,
        nearestRenewalDays: 12,
      },
      "contact",
      { asOf: new Date("2026-09-21T12:00:00.000Z") },
    );
    expect(card.subtitle).toBeUndefined();
    expect(card.peek).toBeNull();
    expect(card.facts?.some((fact) => /^(?:—|–|-)$/.test(fact.label))).toBe(false);
    expect(card.facts?.map((fact) => fact.label)).toEqual(["Spanish", "1 in-force", "Renews in 12d"]);
    expect(card.phone).toBe("(321) 555-0100");
    expect(card.email).toBe("ana@example.com");
    expect((card.facts ?? []).length).toBeLessThanOrEqual(10);
  });

  it("opens the policy list from the list url and the old stack url", () => {
    expect(parseBookLayout("list")).toBe("list");
    expect(parseBookLayout("stack")).toBe("list");
    expect(parseBookLayout(undefined)).toBe("bands");
  });

  it("spreads policy term facts across the stack card", () => {
    const card = presentPolicyCard(
      {
        id: "p1",
        policyNumber: "HP-FL-88421",
        displayName: "Hale / Heritage / HO3 / HP-FL-88421",
        status: "active",
        lineOfBusiness: "HO",
        formType: "HO3",
        premium: "2184",
        renewalPremium: "2547",
        billingFrequency: "annual",
        expirationDate: "2026-10-03T00:00:00.000Z",
        partyName: "Pat Hale",
        carrierName: "Heritage",
      },
      { openClaims: 1, pendingEndorsements: 0, missingDocs: 0 },
      new Date("2026-09-21T12:00:00.000Z"),
    );
    expect(card.title).toBe("Pat Hale");
    expect(card.facts?.map((fact) => fact.label)).toEqual([
      "Heritage",
      "HO3",
      "Home",
      "$2,184",
      "Renewal $2,547",
      "+$363",
      "Expires Oct 3, 2026",
      "Renews in 12d",
      "Active",
      "Needs care",
      "1 open claim",
      "Annual",
    ]);
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
    expect(card.peek).toBeNull();
    expect(card.facts?.map((fact) => fact.id)).toEqual([
      "line:home",
      "line:auto",
      "premium",
      "policies",
      "appetite",
    ]);
    expect(card.facts?.find((fact) => fact.id === "appetite")?.label).toBe("Older roofs need photos");
    expect(card.actions?.map((action) => action.id)).toEqual(["portal", "phone", "email"]);
    expect(card.flags.families).toEqual(["pc"]);
  });
});
