// @ts-nocheck — leftover 360 writer; business detail uses BusinessLocationsSection.
import { AddLocationForm } from "@/components/account-360/add-location-form";
import { PropertyAddressLine } from "@/components/address-links";
import { formatDay, formatMoney, lineLabel } from "@/lib/domain";
import { groupPoliciesByLocation, unassignedLocationPolicies } from "@/lib/locations";
import type { Location, Policy } from "@/lib/db/schema";

type PolicyRow = {
  policy: Policy;
  carrierName: string | null;
};

export function LocationsPanel({
  contactId,
  businessId,
  locations,
  policies,
}: {
  contactId?: string;
  businessId?: string;
  locations: Location[];
  policies: PolicyRow[];
}) {
  const policyRefs = policies.map(({ policy }) => ({
    id: policy.id,
    locationId: policy.locationId,
    lineOfBusiness: policy.lineOfBusiness,
    policyNumber: policy.policyNumber,
  }));
  const grouped = groupPoliciesByLocation(locations, policyRefs);
  const loose = unassignedLocationPolicies(policyRefs);
  const defaultOcc = businessId && !contactId ? "commercial" : "owner";

  return (
    <div className="space-y-4">
      <section className="ff-card overflow-hidden">
        <div className="border-b border-border px-4 py-2">
          <h2 className="text-base font-semibold text-navy">Insured locations</h2>

        </div>
        {locations.length === 0 ? (
          <p className="px-4 py-6 text-base text-muted-foreground">No premises on this account yet.</p>
        ) : (
          <div className="divide-y divide-border">
            {grouped.map(({ location, occupancy }) => {
              const atLoc = policies.filter((row) => row.policy.locationId === location.id);
              return (
                <article key={location.id} className="px-4 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <PropertyAddressLine
                        address={{
                          street: location.street,
                          city: location.city,
                          state: location.state,
                          zip: location.zip,
                        }}
                        className="text-sm font-medium text-navy"
                      />
                      <div className="mt-1 text-base text-muted-foreground">{occupancy}</div>
                    </div>
                  </div>
                  {atLoc.length === 0 ? (
                    <p className="mt-2 text-base text-muted-foreground">
                      No policy at this address yet.
                    </p>
                  ) : (
                    <table className="ff-table mt-2">
                      <thead>
                        <tr>
                          <th>Policy</th>
                          <th>Line</th>
                          <th>Carrier</th>
                          <th>Premium</th>
                          <th>Expires</th>
                        </tr>
                      </thead>
                      <tbody>
                        {atLoc.map(({ policy, carrierName }) => (
                          <tr key={policy.id}>
                            <td className="font-medium">{policy.policyNumber}</td>
                            <td>{lineLabel(policy.lineOfBusiness)}</td>
                            <td>{carrierName ?? "—"}</td>
                            <td>{formatMoney(policy.premium)}</td>
                            <td>{formatDay(policy.expirationDate)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </article>
              );
            })}
          </div>
        )}
        {loose.length > 0 ? (
          <p className="border-t border-border px-4 py-3 text-base text-muted-foreground">
            {loose.length} property policy{loose.length === 1 ? "" : "ies"} still missing a
            location.
          </p>
        ) : null}
      </section>

      <AddLocationForm
        contactId={contactId}
        businessId={businessId}
        defaultOccupancy={defaultOcc}
      />
    </div>
  );
}
