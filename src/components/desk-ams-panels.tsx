import type { Vehicle } from "@/lib/db/schema";
import { vehicleUseLabel } from "@/lib/domain";

function cell(value: string | number | null | undefined) {
  const text = value == null ? "" : String(value).trim();
  return text || "—";
}

export function VehiclesList({ vehicles }: { vehicles: Vehicle[] }) {
  const count = vehicles.length;
  return (
    <section className="ff-card mb-4" data-ff-policy-vehicles="">
      <h2 className="px-4 pt-4 text-base font-semibold text-navy">
        Vehicles in this policy ({count})
      </h2>
      {count === 0 ? (
        <p className="px-4 py-4 text-base text-muted-foreground">No vehicles on this policy yet.</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="ff-table">
            <thead>
              <tr>
                <th>Year / make / model</th>
                <th>VIN</th>
                <th>Use</th>
                <th>Annual miles</th>
                <th>Garaging</th>
                <th>Lienholder</th>
                <th>Comp deductible</th>
                <th>Collision deductible</th>
                <th>Premium</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((vehicle) => (
                <tr key={vehicle.id}>
                  <td className="font-medium">
                    {[vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ") || "—"}
                  </td>
                  <td className="font-mono text-xs">{cell(vehicle.vin)}</td>
                  <td>{vehicleUseLabel(vehicle.usage)}</td>
                  <td>{cell(vehicle.annualMiles)}</td>
                  <td>
                    {[vehicle.garagingAddress, vehicle.garagingZip].filter(Boolean).join(" · ") || "—"}
                  </td>
                  <td>{cell(vehicle.lienholder)}</td>
                  <td>{cell(vehicle.comprehensiveDeductible)}</td>
                  <td>{cell(vehicle.collisionDeductible)}</td>
                  <td>{cell(vehicle.premium)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
