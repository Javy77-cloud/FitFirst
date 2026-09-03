"use client";

import { AppointmentRows } from "@/components/carriers/appointment-rows";
import { buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { formatMoney } from "@/lib/domain";
import type { AppointmentRowInput } from "@/components/carriers/appointment-rows";
import { cn } from "@/lib/utils";

export type AppetiteNotesRule = {
  minCovA: number | null;
  maxCovA: number | null;
  maxRoofAge: number | null;
  minMilesToCoast: number | null;
  mobileAllowed: boolean;
  notes: string | null;
};

export function AppetiteNotes({
  carrierName,
  dontWriteNotes,
  rule,
  appointments,
}: {
  carrierName: string;
  dontWriteNotes: string | null;
  rule: AppetiteNotesRule | null;
  appointments: AppointmentRowInput[];
}) {
  return (
    <Sheet>
      <SheetTrigger className={cn(buttonVariants({ variant: "ghost", size: "xs" }))}>
        Appetite
      </SheetTrigger>
      <SheetContent side="right" className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{carrierName}</SheetTitle>
          <SheetDescription>
            Internal matching notes. Not shown on the main carrier table.
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-4 px-4 pb-6">
          <dl className="grid grid-cols-[8.5rem_1fr] gap-x-3 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Cov A</dt>
            <dd>
              {rule
                ? `${formatMoney(rule.minCovA)} – ${formatMoney(rule.maxCovA)}`
                : "—"}
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
          <div>
            <h3 className="mb-2 text-sm font-semibold text-navy">Appointments</h3>
            <AppointmentRows appointments={appointments} />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
