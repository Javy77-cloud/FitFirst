import { describe, expect, it } from "vitest";
import { DESK_AS_OF } from "@/lib/home/as-of";
import { filterOwned, isOpenShopStage, rowsForTab, salesRows } from "./filter";
import { parseGlanceTab } from "./tabs";
import type { GlanceDeal, GlancePolicy } from "./filter";

const ana: GlanceDeal = {
  id: "ana",
  title: "Dib · Palm Bay HO3",
  pipelineStage: "quote_sent",
  lineOfBusiness: "HO",
  ownerId: "javy",
  ownerName: "Javy Rivera",
  party: "Dib, Ana",
  updatedAt: new Date("2026-09-02T16:00:00.000Z"),
};

const elena: GlanceDeal = {
  id: "elena",
  title: "Ruiz · Melbourne HO3",
  pipelineStage: "bound",
  lineOfBusiness: "HO",
  ownerId: "javy",
  ownerName: "Javy Rivera",
  party: "Ruiz, Elena",
  updatedAt: new Date("2026-08-20T16:00:00.000Z"),
};

const mayaShop: GlanceDeal = {
  id: "maya-shop",
  title: "Chen book shop",
  pipelineStage: "shopping",
  lineOfBusiness: "HO",
  ownerId: "maya",
  ownerName: "Maya Chen",
  party: "Book, Maya",
  updatedAt: new Date("2026-09-01T16:00:00.000Z"),
};

describe("lifecycle glance tabs", () => {
  it("parses Sales | Service | Claims | Renewals and defaults to Sales", () => {
    expect(parseGlanceTab("service")).toBe("service");
    expect(parseGlanceTab("claims")).toBe("claims");
    expect(parseGlanceTab("renewals")).toBe("renewals");
    expect(parseGlanceTab("nope")).toBe("sales");
    expect(parseGlanceTab(undefined)).toBe("sales");
  });

  it("Sales keeps open shops including Ana Quote Sent and drops bound deals", () => {
    expect(isOpenShopStage("quote_sent")).toBe(true);
    expect(isOpenShopStage("bound")).toBe(false);
    const rows = salesRows([ana, elena, mayaShop]);
    expect(rows.map((row) => row.id).sort()).toEqual(["ana", "maya-shop"]);
    expect(rows.find((row) => row.id === "ana")?.status).toBe("quote sent");
  });

  it("Renewals only lists in-force terms in the window — quotes stay off", () => {
    const policies: GlancePolicy[] = [
      {
        id: "hale",
        policyNumber: "HP-FL-88421",
        status: "active",
        lineOfBusiness: "HO",
        ownerId: "javy",
        party: "Hale",
        premium: 2184,
        expirationDate: new Date("2026-10-01T00:00:00.000Z"),
      },
      {
        id: "ana-quote",
        policyNumber: "ANA-QUOTE",
        status: "quoted",
        lineOfBusiness: "HO",
        ownerId: "javy",
        party: "Dib, Ana",
        premium: 321000,
        expirationDate: new Date("2026-10-01T00:00:00.000Z"),
      },
      {
        id: "far",
        policyNumber: "FAR-1",
        status: "active",
        lineOfBusiness: "HO",
        ownerId: "maya",
        party: "Far",
        premium: 1000,
        expirationDate: new Date("2027-09-01T00:00:00.000Z"),
      },
    ];
    const rows = rowsForTab("renewals", {
      deals: [],
      service: [],
      claims: [],
      policies,
      asOf: DESK_AS_OF,
    });
    expect(rows.map((row) => row.id)).toEqual(["hale"]);
    expect(rows[0]?.premium).toBe(2184);
  });

  it("Agents only see their own glance rows", () => {
    const rows = salesRows([ana, mayaShop]);
    expect(filterOwned(rows, { isAdmin: true, userId: "javy" })).toHaveLength(2);
    expect(filterOwned(rows, { isAdmin: false, userId: "maya" }).map((row) => row.id)).toEqual([
      "maya-shop",
    ]);
  });
});
