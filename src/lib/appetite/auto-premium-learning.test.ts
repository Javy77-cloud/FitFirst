import { describe, expect, it } from "vitest";
import {
  ageBand,
  ageFromDob,
  assertAutoFeatureSnapshotShape,
  buildAutoFeatureSnapshot,
  isAutoPremiumLine,
  parseAutoPremiumDatasheetFilters,
  rankCarriersByHistoricalMedianPremium,
  vehicleYearBand,
} from "./auto-premium-learning";
import { userIsSiteDeveloper } from "@/lib/developer/site-developer";

describe("auto premium-learning snapshot", () => {
  it("builds snapshot from Auto sheet + risk with expected shape", () => {
    const snap = buildAutoFeatureSnapshot({
      sheetValues: {
        driver_1_dob: { value: "9/14/1975", status: "confirmed", source: "agent" },
        driver_1_gender: { value: "Female", status: "confirmed", source: "agent" },
        state: { value: "FL", status: "confirmed", source: "agent" },
        city: { value: "West Melbourne", status: "confirmed", source: "agent" },
        zip: { value: "32904", status: "confirmed", source: "agent" },
        vin: { value: "5J8TC2H40SL034711", status: "confirmed", source: "agent" },
        vehicle_year: { value: "2025", status: "confirmed", source: "agent" },
        vehicle_make: { value: "ACURA", status: "confirmed", source: "agent" },
        vehicle_model: { value: "RDX", status: "confirmed", source: "agent" },
        vehicle_ownership: { value: "Financed", status: "confirmed", source: "agent" },
        annual_miles: { value: "8,000 – 8,999", status: "confirmed", source: "agent" },
        vehicle_usage: { value: "Commute", status: "confirmed", source: "agent" },
        rideshare: { value: "yes", status: "confirmed", source: "agent" },
      },
      risk: { state: "FL", city: "West Melbourne", zip: "32904", garagingZip: "32904" } as never,
      capturedAt: new Date("2026-09-10T18:00:00.000Z"),
    });
    expect(assertAutoFeatureSnapshotShape(snap)).toEqual([]);
    expect(snap.schemaVersion).toBe(1);
    expect(snap.state).toBe("FL");
    expect(snap.city).toBe("West Melbourne");
    expect(snap.vehicleYear).toBe(2025);
    expect(snap.vehicleMake).toBe("ACURA");
    expect(snap.vin).toBe("5J8TC2H40SL034711");
    expect(snap.rideshare).toBe("yes");
    expect(snap.driverAge).toBe(50);
    expect(snap.driverGender).toBe("Female");
  });

  it("parses DOB / bands", () => {
    expect(ageFromDob("1975-09-14", new Date("2026-09-10"))).toBe(50);
    expect(vehicleYearBand(2025)).toBe("2025-2027");
    expect(ageBand(50)).toBe("50s");
  });

  it("recognizes Auto LOB aliases", () => {
    expect(isAutoPremiumLine("AUTO")).toBe(true);
    expect(isAutoPremiumLine("PA")).toBe(true);
    expect(isAutoPremiumLine("HO")).toBe(false);
  });

  it("parses datasheet filters", () => {
    expect(parseAutoPremiumDatasheetFilters({ carrier: "x", city: "Tampa", yearMin: "2020" })).toEqual({
      carrierId: "x",
      city: "Tampa",
      vehicleYearMin: 2020,
      vehicleYearMax: undefined,
    });
  });
});

describe("auto premium ranking stub (shadow)", () => {
  it("sorts carriers by median premium among similar risks", () => {
    const target = buildAutoFeatureSnapshot({
      sheetValues: {
        state: { value: "FL", status: "confirmed", source: "agent" },
        vehicle_year: { value: "2024", status: "confirmed", source: "agent" },
        driver_1_dob: { value: "1/1/1980", status: "confirmed", source: "agent" },
      },
      capturedAt: new Date("2026-09-10T00:00:00Z"),
    });
    const base = { ...target, schemaVersion: 1 as const };
    const ranked = rankCarriersByHistoricalMedianPremium(target, [
      { carrierId: "a", carrierName: "Geico", premium: 1800, snapshot: base },
      { carrierId: "a", carrierName: "Geico", premium: 2200, snapshot: base },
      { carrierId: "a", carrierName: "Geico", premium: 2000, snapshot: base },
      { carrierId: "b", carrierName: "Progressive", premium: 1500, snapshot: base },
      { carrierId: "b", carrierName: "Progressive", premium: 1600, snapshot: base },
      { carrierId: "b", carrierName: "Progressive", premium: 1400, snapshot: base },
      { carrierId: "c", carrierName: "OutOfState", premium: 900, snapshot: { ...base, state: "TX" } },
    ]);
    expect(ranked[0]?.carrierName).toBe("Progressive");
    expect(ranked[0]?.mode).toBe("shadow");
    expect(ranked[0]?.medianPremium).toBe(1500);
    expect(ranked.find((r) => r.carrierName === "OutOfState")).toBeUndefined();
  });
});

describe("auto premium-learning site-dev gate", () => {
  it("uses same site-developer gate as Appetite Log (not admin)", () => {
    expect(
      userIsSiteDeveloper(
        { email: "admin@fitfirst.local", isSiteDeveloper: false },
        { FF_SITE_DEVELOPER_EMAILS: "javy@fitfirst.local" },
      ),
    ).toBe(false);
    expect(
      userIsSiteDeveloper(
        { email: "javy@fitfirst.local", isSiteDeveloper: false },
        { FF_SITE_DEVELOPER_EMAILS: "javy@fitfirst.local" },
      ),
    ).toBe(true);
  });
});
