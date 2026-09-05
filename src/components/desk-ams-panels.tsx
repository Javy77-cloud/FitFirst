import Link from "next/link";
import type { IssuedCertificate, Location, Vehicle } from "@/lib/db/schema";

export function LocationsList({ locations }: { locations: Location[] }) {
  return (
    <section className="ff-card mb-4 overflow-hidden">
      <div className="border-b border-border px-4 py-2 text-base font-semibold text-navy">
        Insured locations
      </div>
      {locations.length === 0 ? (
        <p className="px-4 py-6 text-base text-muted-foreground">
          No premises on this 360 yet. Home, landlord, flood, and commercial hang off a street
          address — not a Zillow value.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {locations.map((location) => (
            <li key={location.id} className="px-4 py-3 text-sm">
              <div className="font-medium text-navy">
                {location.label || location.address1 || location.street || "Location"}
              </div>
              <div className="text-base text-muted-foreground">
                {[location.address1 || location.street, location.city, location.state, location.zip]
                  .filter(Boolean)
                  .join(", ") || "No street on file"}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function VehiclesList({ vehicles }: { vehicles: Vehicle[] }) {
  return (
    <section className="ff-card mb-4 overflow-hidden">
      <div className="border-b border-border px-4 py-2 text-base font-semibold text-navy">
        Vehicles on this Auto
      </div>
      {vehicles.length === 0 ? (
        <p className="px-4 py-6 text-base text-muted-foreground">
          No vehicles on this policy yet. The Auto schedule is empty — quotes are not coverage.
        </p>
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

export function CertificatesList({
  accountId,
  certificates,
}: {
  accountId: string;
  certificates: IssuedCertificate[];
}) {
  return (
    <section className="ff-card mb-4 overflow-hidden">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border px-4 py-2">
        <h2 className="text-base font-semibold text-navy">Certificates of Insurance</h2>
        <Link href="/certificates" className="text-sm text-primary hover:underline">
          Request queue
        </Link>
      </div>
      {certificates.length === 0 ? (
        <p className="px-4 py-6 text-base text-muted-foreground">
          No COI stub on this Business. Queue a request on{" "}
          <Link href="/certificates" className="text-primary hover:underline">
            Certificates
          </Link>
          . This is not an ACORD form and nothing is emailed.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {certificates.map((cert) => (
            <li key={cert.id} className="px-4 py-2 text-sm">
              <Link
                href={`/businesses/${accountId}/certificates/${cert.id}`}
                className="font-medium text-primary hover:underline"
              >
                {cert.certificateNumber}
              </Link>
              <span className="ml-2 text-base text-muted-foreground">
                {cert.holderName} · {cert.status}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
