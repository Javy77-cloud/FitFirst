import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { CarriersTable, type CarrierTableRow } from "@/components/carriers/carriers-table";
import { buttonVariants } from "@/components/ui/button";
import { visibilityFromCols } from "@/lib/carriers/desk";
import { listCarrierAppointments, listCarriers } from "@/lib/db/queries";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CarriersPage({
  searchParams,
}: {
  searchParams: Promise<{ cols?: string | string[]; notes?: string }>;
}) {
  const params = await searchParams;
  const cols = params.cols == null ? undefined : Array.isArray(params.cols) ? params.cols : [params.cols];
  const visible = visibilityFromCols(cols);
  const rows = await listCarriers();
  const appointments = await listCarrierAppointments();
  const byCarrier = new Map<string, typeof appointments>();
  for (const row of appointments) {
    const list = byCarrier.get(row.carrierId) ?? [];
    list.push(row);
    byCarrier.set(row.carrierId, list);
  }

  const tableRows: CarrierTableRow[] = rows.map(({ carrier, rule }) => ({
    id: carrier.id,
    name: carrier.name,
    portalLogin: carrier.portalLogin,
    customerServicePhone: carrier.customerServicePhone,
    agentPhone: carrier.agentPhone,
    website: carrier.website,
    agentPortalUrl: carrier.agentPortalUrl,
    carrierInfo: carrier.carrierInfo,
    dontWriteNotes: carrier.dontWriteNotes,
    rule: rule
      ? {
          minCovA: rule.minCovA,
          maxCovA: rule.maxCovA,
          maxRoofAge: rule.maxRoofAge,
          minMilesToCoast: rule.minMilesToCoast,
          mobileAllowed: rule.mobileAllowed,
          notes: rule.notes,
        }
      : null,
    appointments: (byCarrier.get(carrier.id) ?? []).map((row) => ({
      id: row.id,
      writtenLine: row.writtenLine,
      appointed: row.appointed,
      sellingAgency: row.sellingAgency,
    })),
  }));

  return (
    <AppShell
      title="Carriers"
      actions={
        <Link href="/carriers/logs" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          Decline log
        </Link>
      }
    >
      <p className="mb-3 text-sm text-muted-foreground">
        Desk book: how this agency logs in and who to call. Appetite, don&apos;t-write, Cov A,
        roof, coast, and mobile stay internal for matching — open Appetite on a row. Use
        Columns to show or hide fields. Appointments stay off the main table unless you turn
        that column on.
      </p>
      <CarriersTable rows={tableRows} visible={visible} notesId={params.notes} />
    </AppShell>
  );
}
