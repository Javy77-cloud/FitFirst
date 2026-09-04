import { addDriver, addVehicle, deleteDriver, deleteVehicle } from "@/app/actions/auto-schedule";
import { CopyScheduleButton } from "@/components/auto/copy-schedule-button";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { formatAutoCopyPack, formatScheduleCounts, scheduleCounts } from "@/lib/auto-schedule";
import {
  formatDob,
  formatVehicleTitle,
  VEHICLE_USES,
  vehicleUseLabel,
} from "@/lib/domain";
import type { Driver, Vehicle } from "@/lib/db/schema";

type ContactOption = { id: string; firstName: string; lastName: string };

function Field({
  label,
  name,
  type = "text",
  placeholder,
  required,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <Label htmlFor={name} className="text-xs">
        {label}
      </Label>
      <Input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        autoComplete="off"
        className="mt-1 h-8"
      />
    </div>
  );
}

export function AutoSchedulePanel({
  title,
  vehicles,
  drivers,
  householdContacts = [],
  policyId,
  dealId,
  quoteSheetId,
  riskId,
  contactId,
  returnTo,
  editable = true,
}: {
  title: string;
  vehicles: Vehicle[];
  drivers: Driver[];
  householdContacts?: ContactOption[];
  policyId?: string | null;
  dealId?: string | null;
  quoteSheetId?: string | null;
  riskId?: string | null;
  contactId?: string | null;
  returnTo: string;
  editable?: boolean;
}) {
  const counts = scheduleCounts(vehicles, drivers);
  const contactName = (id: string | null) => {
    if (!id) return null;
    const match = householdContacts.find((row) => row.id === id);
    return match ? `${match.firstName} ${match.lastName}` : null;
  };
  const copyText = formatAutoCopyPack({
    title,
    vehicles,
    drivers: drivers.map((driver) => ({
      ...driver,
      contactName: contactName(driver.contactId),
    })),
  });

  const hidden = (
    <>
      {policyId ? <input type="hidden" name="policyId" value={policyId} /> : null}
      {dealId ? <input type="hidden" name="dealId" value={dealId} /> : null}
      {quoteSheetId ? <input type="hidden" name="quoteSheetId" value={quoteSheetId} /> : null}
      {riskId ? <input type="hidden" name="riskId" value={riskId} /> : null}
      {contactId ? <input type="hidden" name="accountContactId" value={contactId} /> : null}
      <input type="hidden" name="returnTo" value={returnTo} />
    </>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-navy">Auto schedule</h3>
          <p className="text-base text-muted-foreground">
            Essential AMS risk objects. {formatScheduleCounts(counts)}. Year / make / model / VIN
            and license are optional. Copy pack is our data for the Quote Sheet — not a carrier
            prefill API.
          </p>
        </div>
        <CopyScheduleButton text={copyText} />
      </div>

      <section className="overflow-hidden rounded-md border border-border">
        <div className="border-b border-border px-3 py-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Vehicles · {counts.vehicleCount}
        </div>
        {vehicles.length === 0 ? (
          <p className="px-3 py-4 text-base text-muted-foreground">
            No vehicles yet. Add a unit even if VIN is still coming from the dec.
          </p>
        ) : (
          <table className="ff-table">
            <thead>
              <tr>
                <th>Unit</th>
                <th>VIN</th>
                <th>Use</th>
                <th>Garaging</th>
                {editable ? <th /> : null}
              </tr>
            </thead>
            <tbody>
              {vehicles.map((vehicle) => (
                <tr key={vehicle.id}>
                  <td className="font-medium">{formatVehicleTitle(vehicle)}</td>
                  <td className="font-mono text-[11px]">{vehicle.vin || "—"}</td>
                  <td>{vehicleUseLabel(vehicle.usage)}</td>
                  <td>
                    {[vehicle.garagingAddress, vehicle.garagingZip].filter(Boolean).join(" · ") ||
                      "—"}
                  </td>
                  {editable ? (
                    <td className="text-right">
                      <form action={deleteVehicle}>
                        {hidden}
                        <input type="hidden" name="vehicleId" value={vehicle.id} />
                        <Button type="submit" variant="ghost" size="xs">
                          Remove
                        </Button>
                      </form>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="overflow-hidden rounded-md border border-border">
        <div className="border-b border-border px-3 py-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Drivers · {counts.driverCount}
        </div>
        {drivers.length === 0 ? (
          <p className="px-3 py-4 text-base text-muted-foreground">
            No drivers yet. Link a household Contact when that person already exists; otherwise
            leave contact blank.
          </p>
        ) : (
          <table className="ff-table">
            <thead>
              <tr>
                <th>Driver</th>
                <th>DOB</th>
                <th>License</th>
                <th>Contact</th>
                {editable ? <th /> : null}
              </tr>
            </thead>
            <tbody>
              {drivers.map((driver) => (
                <tr key={driver.id}>
                  <td className="font-medium">
                    {driver.firstName} {driver.lastName}
                  </td>
                  <td>{formatDob(driver.dateOfBirth)}</td>
                  <td>
                    {[driver.licenseState, driver.licenseNumber].filter(Boolean).join(" ") || "—"}
                  </td>
                  <td>
                    {driver.contactId ? (
                      <a
                        href={`/contacts/${driver.contactId}`}
                        className="text-primary hover:underline"
                      >
                        {contactName(driver.contactId) ?? "Linked contact"}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">Not linked</span>
                    )}
                  </td>
                  {editable ? (
                    <td className="text-right">
                      <form action={deleteDriver}>
                        {hidden}
                        <input type="hidden" name="driverId" value={driver.id} />
                        <Button type="submit" variant="ghost" size="xs">
                          Remove
                        </Button>
                      </form>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {editable ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <form action={addVehicle} className="space-y-3 rounded-md border border-border p-3">
            {hidden}
            <h4 className="text-base font-semibold text-navy">Add vehicle</h4>
            <div className="grid gap-2 sm:grid-cols-3">
              <Field label="Year" name="year" type="number" />
              <Field label="Make" name="make" />
              <Field label="Model" name="model" />
              <Field label="VIN" name="vin" />
              <div>
                <Label className="text-xs">Use</Label>
                <select
                  name="usage"
                  defaultValue="pleasure"
                  className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
                >
                  {VEHICLE_USES.map((use) => (
                    <option key={use} value={use}>
                      {vehicleUseLabel(use)}
                    </option>
                  ))}
                </select>
              </div>
              <Field label="Garaging ZIP" name="garagingZip" />
            </div>
            <Field label="Garaging address" name="garagingAddress" />
            <button
              type="submit"
              data-ff-save-vehicle
              className={cn(buttonVariants({ size: "sm" }))}
            >
              Save vehicle
            </button>
          </form>

          <form action={addDriver} className="space-y-3 rounded-md border border-border p-3">
            {hidden}
            <h4 className="text-base font-semibold text-navy">Add driver</h4>
            <div className="grid gap-2 sm:grid-cols-2">
              <Field label="First name" name="firstName" required />
              <Field label="Last name" name="lastName" required />
              <Field label="Date of birth" name="dateOfBirth" type="date" />
              <Field label="License #" name="licenseNumber" placeholder="Optional" />
              <Field label="License state" name="licenseState" placeholder="FL" />
              <div>
                <Label className="text-xs">Linked contact</Label>
                <select
                  name="contactId"
                  defaultValue=""
                  className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
                >
                  <option value="">None — household table not required</option>
                  {householdContacts.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.lastName}, {row.firstName}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button
              type="submit"
              data-ff-save-driver
              className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
            >
              Save driver
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
