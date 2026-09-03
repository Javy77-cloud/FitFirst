import { describe, expect, it } from "vitest";
import fixture from "./fixtures/ana-dib-ho3-2026-09-02.json";
import { isLocationLine, occupancyLabel } from "./domain";
import {
  defaultOccupancyForLine,
  groupPoliciesByLocation,
  locationNeedsPremises,
  unassignedLocationPolicies,
} from "./locations";

describe("insured locations", () => {
  it("does not change Ana Adige Ct fixture values", () => {
    expect(fixture.risk.address1).toBe("1098 Adige Ct SE");
    expect(fixture.risk.city).toBe("Palm Bay");
    expect(fixture.risk.state).toBe("FL");
    expect(fixture.risk.zip).toBe("32909");
    expect(fixture.risk.occupancy).toBe("owner");
    expect(fixture.risk.coverageA).toBe(321000);
    expect(fixture.risk.coverageANote).toContain("Not Zillow Zestimate");
  });

  it("treats Home, Landlord, Flood, and commercial as premises lines", () => {
    expect(isLocationLine("HO")).toBe(true);
    expect(isLocationLine("LANDLORD")).toBe(true);
    expect(isLocationLine("FLOOD")).toBe(true);
    expect(isLocationLine("GL")).toBe(true);
    expect(isLocationLine("BOP")).toBe(true);
    expect(locationNeedsPremises("AUTO")).toBe(false);
    expect(locationNeedsPremises("LIFE")).toBe(false);
  });

  it("lets one contact hold two locations with a policy at each", () => {
    const locations = [
      {
        id: "loc-home",
        street: "2148 Tropicana Ave",
        city: "Melbourne",
        state: "FL",
        zip: "32935",
        occupancy: "owner",
        contactId: "mario",
        businessId: null,
      },
      {
        id: "loc-rental",
        street: "880 Harbor City Blvd",
        city: "Melbourne",
        state: "FL",
        zip: "32935",
        occupancy: "tenant",
        contactId: "mario",
        businessId: null,
      },
    ];
    const policies = [
      { id: "p-ho", locationId: "loc-home", lineOfBusiness: "HO", policyNumber: "HO-MARIO-1" },
      { id: "p-fl", locationId: "loc-home", lineOfBusiness: "FLOOD", policyNumber: "FLD-MARIO-1" },
      {
        id: "p-dp",
        locationId: "loc-rental",
        lineOfBusiness: "LANDLORD",
        policyNumber: "DP-MARIO-1",
      },
    ];

    const grouped = groupPoliciesByLocation(locations, policies);
    expect(grouped).toHaveLength(2);
    expect(grouped[0]?.policies.map((p) => p.lineOfBusiness)).toEqual(["HO", "FLOOD"]);
    expect(grouped[1]?.policies.map((p) => p.policyNumber)).toEqual(["DP-MARIO-1"]);
    expect(grouped[1]?.occupancy).toBe("Tenant (landlord)");
    expect(unassignedLocationPolicies(policies)).toEqual([]);
  });

  it("defaults occupancy from the line and labels them for the desk", () => {
    expect(defaultOccupancyForLine("HO")).toBe("owner");
    expect(defaultOccupancyForLine("LANDLORD")).toBe("tenant");
    expect(defaultOccupancyForLine("BOP")).toBe("commercial");
    expect(occupancyLabel("owner")).toBe("Owner-occupied");
    expect(occupancyLabel("commercial")).toBe("Commercial");
  });
});
