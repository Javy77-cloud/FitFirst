import { updateCarrierAppointment } from "@/app/actions/appointments";
import { Button } from "@/components/ui/button";
import { SELLING_AGENCIES, writtenLineLabel } from "@/lib/domain";
export type AppointmentRowInput = {
  id: string;
  writtenLine: string;
  appointed: boolean;
  sellingAgency: string;
};

export function AppointmentRows({
  appointments,
  showSellingAgency = true,
}: {
  appointments: AppointmentRowInput[];
  showSellingAgency?: boolean;
}) {
  if (appointments.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        No appointment rows. Missing is unknown — not a skip.
      </p>
    );
  }

  return (
    <ul className="space-y-1.5">
      {appointments.map((appt) => (
        <li key={appt.id}>
          <form
            action={updateCarrierAppointment}
            className="flex flex-wrap items-center gap-1.5"
          >
            <input type="hidden" name="id" value={appt.id} />
            <span className="w-16 shrink-0 text-xs font-medium">
              {writtenLineLabel(appt.writtenLine)}
            </span>
            <span
              className={
                appt.appointed
                  ? "inline-flex rounded-sm bg-fit-green-bg px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-fit-green"
                  : "inline-flex rounded-sm bg-fit-red-bg px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-fit-red"
              }
            >
              {appt.appointed ? "Appointed" : "Not appointed"}
            </span>
            <select
              name="appointed"
              defaultValue={appt.appointed ? "true" : "false"}
              className="h-6 rounded-sm border border-input bg-background px-1 text-xs"
              aria-label={`${writtenLineLabel(appt.writtenLine)} appointed`}
            >
              <option value="true">Appointed</option>
              <option value="false">Not appointed</option>
            </select>
            {showSellingAgency ? (
              <select
                name="sellingAgency"
                defaultValue={appt.sellingAgency}
                className="h-6 rounded-sm border border-input bg-background px-1 text-xs"
                aria-label={`${writtenLineLabel(appt.writtenLine)} selling agency`}
              >
                {SELLING_AGENCIES.map((agency) => (
                  <option key={agency} value={agency}>
                    {agency}
                  </option>
                ))}
              </select>
            ) : (
              <input type="hidden" name="sellingAgency" value={appt.sellingAgency} />
            )}
            <Button type="submit" size="xs" variant="ghost">
              Save
            </Button>
          </form>
        </li>
      ))}
    </ul>
  );
}
