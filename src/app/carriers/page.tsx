import { AppShell } from "@/components/app-shell";
import { formatMoney } from "@/lib/domain";
import { listCarriers } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default async function CarriersPage() {
  const rows = await listCarriers();
  return (
    <AppShell title="Carriers & appetite">
      <p className="mb-3 text-sm text-muted-foreground">
        Structured appetite only. The 2026-09-02 Palm Bay shop is a fixture, not production
        underwriting.
      </p>
      <section className="ff-card overflow-hidden">
        <table className="ff-table">
          <thead>
            <tr>
              <th>Carrier</th>
              <th>Portal</th>
              <th>Cov A</th>
              <th>Roof / coast / mobile</th>
              <th>Don&apos;t write</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ carrier, rule }) => (
              <tr key={`${carrier.id}-${rule?.id ?? "none"}`}>
                <td className="font-medium">
                  {carrier.name}
                  <div className="text-[11px] text-muted-foreground">
                    {(carrier.writtenLines ?? []).join(", ")}
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
                <td className="text-xs">{carrier.dontWriteNotes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </AppShell>
  );
}
