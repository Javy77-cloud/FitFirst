import { formatDob, formatVehicleTitle, vehicleUseLabel } from "@/lib/domain";
import type { Driver, Vehicle } from "@/lib/db/schema";
import { licenseMaskFromRow } from "@/lib/pii/vault";

export type ScheduleScope = {
  policyId?: string | null;
  dealId?: string | null;
  quoteSheetId?: string | null;
  riskId?: string | null;
};

export type ScheduleCounts = {
  vehicleCount: number;
  driverCount: number;
};

export function uniqueById<T extends { id: string }>(rows: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const row of rows) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    out.push(row);
  }
  return out;
}

export function scheduleCounts(vehicles: { id: string }[], drivers: { id: string }[]): ScheduleCounts {
  const v = uniqueById(vehicles);
  const d = uniqueById(drivers);
  return { vehicleCount: v.length, driverCount: d.length };
}

export function formatScheduleCounts(counts: ScheduleCounts): string {
  const vehicles = `${counts.vehicleCount} ${counts.vehicleCount === 1 ? "vehicle" : "vehicles"}`;
  const drivers = `${counts.driverCount} ${counts.driverCount === 1 ? "driver" : "drivers"}`;
  return `${vehicles} · ${drivers}`;
}

function driverName(driver: Pick<Driver, "firstName" | "lastName">): string {
  return `${driver.firstName} ${driver.lastName}`.trim() || "Driver";
}

export function formatAutoCopyPack(input: {
  title: string;
  vehicles: Vehicle[];
  drivers: Array<Driver & { contactName?: string | null }>;
}): string {
  const vehicles = [...input.vehicles].sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.getTime() - b.createdAt.getTime());
  const drivers = [...input.drivers].sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.getTime() - b.createdAt.getTime());

  const lines = [
    `AUTO SCHEDULE — ${input.title}`,
    "Our FitFirst data. Paste into the Auto Quote Sheet or Fill pack. Not a carrier prefill API.",
    "",
    `Vehicles (${vehicles.length})`,
  ];

  if (vehicles.length === 0) {
    lines.push("  (none)");
  } else {
    vehicles.forEach((vehicle, index) => {
      const garage = [vehicle.garagingAddress, vehicle.garagingZip].filter(Boolean).join(", ");
      lines.push(
        [
          `  ${index + 1}. ${formatVehicleTitle(vehicle)}`,
          vehicle.vin ? `VIN ${vehicle.vin}` : "VIN —",
          `use ${vehicleUseLabel(vehicle.usage)}`,
          garage ? `garage ${garage}` : "garage —",
        ].join(" · "),
      );
    });
  }

  lines.push("", `Drivers (${drivers.length})`);
  if (drivers.length === 0) {
    lines.push("  (none)");
  } else {
    drivers.forEach((driver, index) => {
      const license = [driver.licenseState, licenseMaskFromRow(driver)].filter(Boolean).join(" ");
      const contact = driver.contactId
        ? `contact ${driver.contactName ?? driver.contactId}`
        : "contact not linked";
      lines.push(
        [
          `  ${index + 1}. ${driverName(driver)}`,
          `DOB ${formatDob(driver.dateOfBirth)}`,
          license ? `lic ${license}` : "lic —",
          contact,
        ].join(" · "),
      );
    });
  }

  return `${lines.join("\n")}\n`;
}
