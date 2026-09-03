import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { ColumnPicker, Col } from "@/components/column-picker";
import { RecordLink } from "@/components/record-links";
import { defaultColumns } from "@/lib/desk/columns";
import { listCarriers } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default async function CarriersPage() {
  const rows = await listCarriers();
  const seen = new Set<string>();
  const unique = rows.filter(({ carrier }) => {
    if (seen.has(carrier.id)) return false;
    seen.add(carrier.id);
    return true;
  });

  return (
    <AppShell
      title="Carriers"
      actions={<ColumnPicker tableKey="carriers" initial={defaultColumns("carriers")} />}
    >
      <p className="mb-3 text-sm text-muted-foreground">
        Portal login, service phones, and carrier info first. Appetite is on the carrier record.
        Decline log is parked here, not on the left menu.
      </p>
      <p className="mb-3 text-sm">
        <Link href="/logs" className="text-primary hover:underline">
          Open decline log
        </Link>
      </p>
      <section className="ff-card overflow-x-auto">
        <table className="ff-table">
          <thead>
            <tr>
              <Col table="carriers" col="name" as="th">Carrier</Col>
              <Col table="carriers" col="portalLogin" as="th">Portal login</Col>
              <Col table="carriers" col="csPhone" as="th">Customer service</Col>
              <Col table="carriers" col="agentPhone" as="th">Agent phone</Col>
              <Col table="carriers" col="website" as="th">Website / portal</Col>
              <Col table="carriers" col="info" as="th">Carrier info</Col>
              <Col table="carriers" col="lines" as="th">Lines</Col>
            </tr>
          </thead>
          <tbody>
            {unique.map(({ carrier }) => (
              <tr key={carrier.id}>
                <Col table="carriers" col="name">
                  <RecordLink href={`/carriers/${carrier.id}`}>{carrier.name}</RecordLink>
                </Col>
                <Col table="carriers" col="portalLogin" className="uppercase">
                  {carrier.portalStatus.replaceAll("_", " ")}
                </Col>
                <Col table="carriers" col="csPhone">{carrier.customerServicePhone ?? "—"}</Col>
                <Col table="carriers" col="agentPhone">{carrier.agentPhone ?? "—"}</Col>
                <Col table="carriers" col="website">
                  {carrier.website || carrier.portalUrl ? (
                    <a
                      href={carrier.website || carrier.portalUrl || "#"}
                      className="text-primary hover:underline"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open
                    </a>
                  ) : (
                    "—"
                  )}
                </Col>
                <Col table="carriers" col="info">{carrier.carrierInfo ?? carrier.dontWriteNotes ?? "—"}</Col>
                <Col table="carriers" col="lines">{(carrier.writtenLines ?? []).join(", ") || "—"}</Col>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </AppShell>
  );
}
