import Link from "next/link";
import { AppointmentRows, type AppointmentRowInput } from "@/components/carriers/appointment-rows";
import { buttonVariants } from "@/components/ui/button";
import { formatMoney } from "@/lib/domain";
import { cn } from "@/lib/utils";

export type AppetiteNotesRule = {
  minCovA: number | null;
  maxCovA: number | null;
  maxRoofAge: number | null;
  minMilesToCoast: number | null;
  mobileAllowed: boolean;
  notes: string | null;
};

export function AppetiteNotesPanel({
  carrierName,
  dontWriteNotes,
  rule,
  appointments,
  closeHref,
}: {
  carrierName: string;
  dontWriteNotes: string | null;
  rule: AppetiteNotesRule | null;
  appointments: AppointmentRowInput[];
  closeHref: string;
}) {
  return (
    <section className="ff-card mb-3 p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-navy">{carrierName} — internal appetite</h2>
          <p className="text-xs text-muted-foreground">
            Matching notes only. Not a main-table column.
          </p>
        </div>
        <Link href={closeHref} className={cn(buttonVariants({ variant: "outline", size: "xs" }))}>
          Close
        </Link>
      </div>
      <dl className="grid grid-cols-[8.5rem_1fr] gap-x-3 gap-y-2 text-sm">
        <dt className="text-muted-foreground">Cov A</dt>
        <dd>
          {rule ? `${formatMoney(rule.minCovA)} – ${formatMoney(rule.maxCovA)}` : "—"}
        </dd>
        <dt className="text-muted-foreground">Roof / coast / mobile</dt>
        <dd>
          {rule
            ? `max roof ${rule.maxRoofAge ?? "—"}y · coast ${rule.minMilesToCoast ?? 0}+ mi · mobile ${rule.mobileAllowed ? "yes" : "no"}`
            : "—"}
        </dd>
        <dt className="text-muted-foreground">Don&apos;t write</dt>
        <dd>{dontWriteNotes || "—"}</dd>
        <dt className="text-muted-foreground">Rule notes</dt>
        <dd>{rule?.notes || "—"}</dd>
      </dl>
      <div className="mt-4">
        <h3 className="mb-2 text-sm font-semibold text-navy">Appointments</h3>
        <AppointmentRows appointments={appointments} showSellingAgency={false} />
      </div>
    </section>
  );
}
