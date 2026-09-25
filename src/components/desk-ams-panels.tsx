import type { Vehicle } from "@/lib/db/schema";

export function VehiclesList({ vehicles }: { vehicles: Vehicle[] }) {
  return (
    <section className="ff-card mb-4 overflow-hidden">
      <div className="border-b border-border px-4 py-2 text-base font-semibold text-navy">
        Vehicles on this Auto
      </div>
      {vehicles.length === 0 ? (
        <p className="px-4 py-6 text-base text-muted-foreground">No vehicles on this policy yet.</p>
      ) : (
        <table className="ff-table">
          <thead>
            <tr>
              <th>Year / make / model</th>
              <th>VIN</th>
              <th>Use</th>
            </tr>
          </thead>
          <tbody>
            {vehicles.map((vehicle) => (
              <tr key={vehicle.id}>
                <td className="font-medium">
                  {[vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ") || "—"}
                </td>
                <td className="font-mono text-xs">{vehicle.vin ?? "—"}</td>
                <td className="uppercase">{vehicle.usage ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
