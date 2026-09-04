"use client";

import { createLocation } from "@/app/actions/locations";
import { AddressAutofill } from "@/components/address-autofill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OCCUPANCIES, type Occupancy, occupancyLabel } from "@/lib/domain";

export function AddLocationForm({
  contactId,
  businessId,
  defaultOccupancy,
}: {
  contactId?: string;
  businessId?: string;
  defaultOccupancy: Occupancy;
}) {
  return (
    <form action={createLocation} autoComplete="off" className="ff-card space-y-3 p-4">
      <h3 className="text-sm font-semibold text-navy">Add location</h3>
      {contactId ? <input type="hidden" name="contactId" value={contactId} /> : null}
      {businessId ? <input type="hidden" name="businessId" value={businessId} /> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="loc-street" className="text-xs">
            Street
          </Label>
          <AddressAutofill
            id="loc-street"
            name="street"
            required
            autoComplete="off"
            className="mt-1 h-8"
            placeholder="Street address"
          />
        </div>
        <div>
          <Label htmlFor="loc-city" className="text-xs">
            City
          </Label>
          <Input id="loc-city" name="city" required autoComplete="off" className="mt-1 h-8" />
        </div>
        <div>
          <Label htmlFor="loc-state" className="text-xs">
            State
          </Label>
          <Input
            id="loc-state"
            name="state"
            defaultValue="FL"
            autoComplete="off"
            className="mt-1 h-8"
          />
        </div>
        <div>
          <Label htmlFor="loc-zip" className="text-xs">
            ZIP
          </Label>
          <Input id="loc-zip" name="zip" required autoComplete="off" className="mt-1 h-8" />
        </div>
        <div>
          <Label htmlFor="loc-occupancy" className="text-xs">
            Occupancy
          </Label>
          <select
            id="loc-occupancy"
            name="occupancy"
            defaultValue={defaultOccupancy}
            className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
          >
            {OCCUPANCIES.map((value) => (
              <option key={value} value={value}>
                {occupancyLabel(value)}
              </option>
            ))}
          </select>
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Public Zillow / FEMA flood tabs appear after save. They are lookups only — not Cov A.
      </p>
      <Button type="submit" size="sm">
        Save location
      </Button>
    </form>
  );
}
