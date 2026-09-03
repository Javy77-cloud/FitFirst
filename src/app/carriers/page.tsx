import { AppShell } from "@/components/app-shell";
import { ColumnPicker } from "@/components/crm/data-table";
import { formatMoney } from "@/lib/domain";
import { listCarriers } from "@/lib/db/queries";

const COLUMNS = [
  { id: "carrier", header: "Carrier", defaultVisible: true, hideable: false },
  { id: "portal", header: "Portal", defaultVisible: true },
  { id: "cova", header: "Cov A", defaultVisible: true },
  { id: "roof", header: "Roof / coast / mobile", defaultVisible: true },
  { id: "dont", header: "Don't write", defaultVisible: true },
  { id: "naic", header: "NAIC", defaultVisible: false },
  { id: "lines", header: "Written lines", defaultVisible: false },
];

export const dynamic = "force-dynamic";

export default async function CarriersPage() {
  const rows = await listCarriers();
  return (
    <AppShell title="Carriers & appetite">
      <p className="mb-3 text-sm text-muted-foreground">
        Structured appetite only. The 2026-09-02 Palm Bay shop is a fixture, not production
        underwriting.
      </p>
      <ColumnPicker tableId="carriers" columns={COLUMNS}>
      <section className="ff-card overflow-hidden">
        <table className="ff-table">
          <thead>
            <tr>
              {COLUMNS.map((col) => (
                <th key={col.id} data-col={col.id}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ carrier, rule }) => (
              <tr key={`${carrier.id}-${rule?.id ?? "none"}`}>
                <td data-col="carrier" className="font-medium">
                  {carrier.name}
                </td>
                <td data-col="portal" className="uppercase">
                  {carrier.portalStatus.replaceAll("_", " ")}
                </td>
                <td data-col="cova" className="text-xs">
                  {rule
                    ? `${formatMoney(rule.minCovA)} – ${formatMoney(rule.maxCovA)}`
                    : "—"}
                </td>
                <td data-col="roof" className="text-xs">
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
                <td data-col="dont" className="text-xs">
                  {carrier.dontWriteNotes}
                </td>
                <td data-col="naic">{carrier.naic ?? "—"}</td>
                <td data-col="lines" className="text-xs">
                  {(carrier.writtenLines ?? []).join(", ") || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      </ColumnPicker>
    </AppShell>
  );
}
