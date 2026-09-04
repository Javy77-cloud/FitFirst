import { describe, expect, it } from "vitest";
import {
  formatAutoCopyPack,
  formatScheduleCounts,
  scheduleCounts,
  uniqueById,
} from "./auto-schedule";
import type { Driver, Vehicle } from "./db/schema";

const now = new Date("2026-09-03T12:00:00.000Z");

function vehicle(partial: Partial<Vehicle> & Pick<Vehicle, "id">): Vehicle {
  return {
    tenantId: "11111111-1111-4111-8111-111111111111",
    policyId: null,
    dealId: null,
    quoteSheetId: null,
    riskId: null,
    year: 2021,
    make: "Honda",
    model: "CR-V",
    vin: "7FARW2H58ME012441",
    usage: "commute",
    garagingZip: "32801",
    garagingAddress: "4128 Pine Isle Way",
    sortOrder: 0,
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

function driver(partial: Partial<Driver> & Pick<Driver, "id" | "firstName" | "lastName">): Driver {
  return {
    tenantId: "11111111-1111-4111-8111-111111111111",
    policyId: null,
    dealId: null,
    quoteSheetId: null,
    riskId: null,
    contactId: null,
    dateOfBirth: "1984-06-18",
    licenseNumber: null,
    licenseState: "FL",
    sortOrder: 0,
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

describe("auto schedule helpers", () => {
  it("dedupes and counts vehicles and drivers", () => {
    const v1 = vehicle({ id: "v1" });
    const d1 = driver({ id: "d1", firstName: "Rafael", lastName: "Soto" });
    expect(uniqueById([v1, v1])).toHaveLength(1);
    expect(scheduleCounts([v1, v1], [d1])).toEqual({ vehicleCount: 1, driverCount: 1 });
    expect(formatScheduleCounts({ vehicleCount: 2, driverCount: 2 })).toBe("2 vehicles · 2 drivers");
    expect(formatScheduleCounts({ vehicleCount: 1, driverCount: 0 })).toBe("1 vehicle · 0 drivers");
  });

  it("builds an EZLynx-style copy pack from our data, not a carrier API", () => {
    const pack = formatAutoCopyPack({
      title: "Soto · Orlando PA",
      vehicles: [
        vehicle({ id: "v1", sortOrder: 0 }),
        vehicle({
          id: "v2",
          year: 2018,
          make: "Toyota",
          model: "Camry",
          vin: "4T1B11HK5JU123890",
          usage: "pleasure",
          sortOrder: 1,
        }),
      ],
      drivers: [
        {
          ...driver({
            id: "d1",
            firstName: "Rafael",
            lastName: "Soto",
            contactId: "contact-rafael",
            licenseNumber: "S400123846180",
            sortOrder: 0,
          }),
          contactName: "Rafael Soto",
        },
        driver({
          id: "d2",
          firstName: "Elena",
          lastName: "Soto",
          dateOfBirth: "1986-11-02",
          licenseNumber: null,
          contactId: "contact-elena",
          sortOrder: 1,
        }),
      ],
    });

    expect(pack).toContain("AUTO SCHEDULE — Soto · Orlando PA");
    expect(pack).toContain("Not a carrier prefill API");
    expect(pack).toContain("2021 Honda CR-V");
    expect(pack).toContain("2018 Toyota Camry");
    expect(pack).toContain("Rafael Soto");
    expect(pack).toContain("Elena Soto");
    expect(pack).toContain("contact Rafael Soto");
    expect(pack).toContain("lic FL");
  });

  it("keeps year/make/model/VIN optional", () => {
    const pack = formatAutoCopyPack({
      title: "Blank unit",
      vehicles: [vehicle({ id: "v1", year: null, make: null, model: null, vin: null })],
      drivers: [driver({ id: "d1", firstName: "Pat", lastName: "Lee", dateOfBirth: null })],
    });
    expect(pack).toContain("Vehicle (year/make/model blank)");
    expect(pack).toContain("VIN —");
    expect(pack).toContain("DOB —");
  });
});
