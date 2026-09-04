import Link from "next/link";
import { AppointmentRows, type AppointmentRowInput } from "@/components/carriers/appointment-rows";
import { AppetiteNotesPanel, type AppetiteNotesRule } from "@/components/carriers/appetite-notes";
import { buttonVariants } from "@/components/ui/button";
import { colsQuery, type CarrierTableColumnId } from "@/lib/carriers/desk";
import { cn } from "@/lib/utils";

export type CarrierTableRow = {
  id: string;
  name: string;
  portalLogin: string | null;
  customerServicePhone: string | null;
  agentPhone: string | null;
  website: string | null;
  agentPortalUrl: string | null;
  carrierInfo: string | null;
  dontWriteNotes: string | null;
  rule: AppetiteNotesRule | null;
  appointments: AppointmentRowInput[];
};

function ExternalLink({ href, children }: { href: string; children: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary hover:underline"
    >
      {children}
    </a>
  );
}

export function CarriersTable({
  rows,
  visible,
  notesId,
}: {
  rows: CarrierTableRow[];
  visible: Record<CarrierTableColumnId, boolean>;
  notesId?: string;
}) {
  const show = (id: CarrierTableColumnId) => visible[id];
  const qs = colsQuery(visible);
  const closeHref = qs ? `/carriers?${qs}` : "/carriers";
  const notesRow = notesId ? rows.find((row) => row.id === notesId) : undefined;

  return (
    <div className="space-y-3">
      {notesRow ? (
        <AppetiteNotesPanel
          carrierName={notesRow.name}
          dontWriteNotes={notesRow.dontWriteNotes}
          rule={notesRow.rule}
          appointments={notesRow.appointments}
          closeHref={closeHref}
        />
      ) : null}
      <section className="ff-card overflow-x-auto">
        <table className="ff-table">
          <thead>
            <tr>
              <th>Carrier</th>
              {show("portalLogin") ? <th>Portal login</th> : null}
              {show("customerServicePhone") ? <th>Customer-service phone</th> : null}
              {show("agentPhone") ? <th>Agent phone</th> : null}
              {show("website") ? <th>Website / agent portal</th> : null}
              {show("carrierInfo") ? <th>Carrier info</th> : null}
              {show("appointments") ? <th>Appointments</th> : null}
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-6 text-sm text-muted-foreground">
                  No carriers seeded. Run <code>npm run db:seed</code>.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const notesHref = qs
                  ? `/carriers?${qs}&notes=${row.id}`
                  : `/carriers?notes=${row.id}`;
                return (
                  <tr key={row.id}>
                    <td className="font-medium">{row.name}</td>
                    {show("portalLogin") ? (
                      <td className="text-xs">{row.portalLogin || "—"}</td>
                    ) : null}
                    {show("customerServicePhone") ? (
                      <td className="whitespace-nowrap text-xs">
                        {row.customerServicePhone || "—"}
                      </td>
                    ) : null}
                    {show("agentPhone") ? (
                      <td className="text-xs">{row.agentPhone || "—"}</td>
                    ) : null}
                    {show("website") ? (
                      <td className="text-xs">
                        {row.website || row.agentPortalUrl ? (
                          <span className="flex flex-col gap-0.5">
                            {row.website ? (
                              <ExternalLink href={row.website}>Website</ExternalLink>
                            ) : null}
                            {row.agentPortalUrl ? (
                              <ExternalLink href={row.agentPortalUrl}>Agent portal</ExternalLink>
                            ) : null}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                    ) : null}
                    {show("carrierInfo") ? (
                      <td className="max-w-xs text-xs">{row.carrierInfo || "—"}</td>
                    ) : null}
                    {show("appointments") ? (
                      <td>
                        <AppointmentRows appointments={row.appointments} />
                      </td>
                    ) : null}
                    <td>
                      <Link
                        href={notesHref}
                        className={cn(buttonVariants({ variant: "ghost", size: "xs" }))}
                      >
                        Appetite
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
