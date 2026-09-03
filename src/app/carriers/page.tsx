import { AppointmentRows } from "@/components/carriers/appointment-rows";
import { AppShell } from "@/components/app-shell";
import { formatMoney } from "@/lib/domain";
import { listCarrierAppointments, listCarriers } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default async function CarriersPage() {
  const rows = await listCarriers();
  const appointments = await listCarrierAppointments();
  const byCarrier = new Map<string, typeof appointments>();
  for (const row of appointments) {
    const list = byCarrier.get(row.carrierId) ?? [];
    list.push(row);
    byCarrier.set(row.carrierId, list);
  }

  return (
    <AppShell title="Carriers & appetite">
      <p className="mb-3 text-sm text-muted-foreground">
        Structured appetite plus appointments — which lines this agency can write, and
        through which selling agency (AFA, First Connect, or Agentero). Shop appointed
        lines only. Markets treats an explicit not-appointed row as skip. The 2026-09-02
        Palm Bay shop is a fixture, not production underwriting.
      </p>
      <section className="ff-card overflow-x-auto">
        <table className="ff-table">
          <thead>
            <tr>
              <th>Carrier</th>
              <th>Portal</th>
              <th>Cov A</th>
              <th>Roof / coast / mobile</th>
              <th>Appointments</th>
              <th>Don&apos;t write</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-6 text-sm text-muted-foreground">
                  No carriers seeded. Run <code>npm run db:seed</code>.
                </td>
              </tr>
            ) : (
              rows.map(({ carrier, rule }) => (
                <tr key={`${carrier.id}-${rule?.id ?? "none"}`}>
                  <td className="font-medium">
                    {carrier.name}
                    <div className="text-[11px] text-muted-foreground">
                      {(carrier.writtenLines ?? []).join(", ") || "No written lines"}
                    </div>
                  </td>
                  <td className="uppercase">{carrier.portalStatus.replaceAll("_", " ")}</td>
                  <td className="text-xs">
                    {rule
                      ? `${formatMoney(rule.minCovA)} – ${formatMoney(rule.maxCovA)}`
                      : "—"}
                  </td>
                  <td className="text-xs">
                    {rule ? (
                      <>
                        max roof {rule.maxRoofAge ?? "—"}y · coast{" "}
                        {rule.minMilesToCoast ?? 0}+ mi · mobile{" "}
                        {rule.mobileAllowed ? "yes" : "no"}
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    <AppointmentRows appointments={byCarrier.get(carrier.id) ?? []} />
                  </td>
                  <td className="text-xs">{carrier.dontWriteNotes}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </AppShell>
  );
}
