import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { ColumnPicker, Col } from "@/components/column-picker";
import { SheetTbody } from "@/components/sheet/sheet-table";
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
      columns={<ColumnPicker tableKey="carriers" initial={defaultColumns("carriers")} />}
    >
      <p className="mb-3 text-sm text-muted-foreground">
        Agency code, service phones, and carrier info first. Quoting-portal username and password
        stay on the carrier record — Admin only, encrypted. Appetite is on the record. Decline log
        is parked here, not on the left menu.
      </p>
      <p className="mb-3 text-sm">
        <Link href="/logs" className="text-primary hover:underline">
          Open decline log
        </Link>
        {" · "}
        <Link href="/logs/fill-learning" className="text-primary hover:underline">
          Fill Learning
        </Link>
      </p>
      <section className="ff-card overflow-x-auto">
        <table className="ff-table">
          <thead>
            <tr>
              <Col table="carriers" col="name" as="th">Carrier</Col>
              <Col table="carriers" col="naic" as="th">NAIC</Col>
              <Col table="carriers" col="amBest" as="th">AM Best</Col>
              <Col table="carriers" col="territory" as="th">Territory</Col>
              <Col table="carriers" col="agencyCode" as="th">Agency code</Col>
              <Col table="carriers" col="portalLogin" as="th">Portal</Col>
              <Col table="carriers" col="csPhone" as="th">Customer service</Col>
              <Col table="carriers" col="uw" as="th">Underwriter</Col>
              <Col table="carriers" col="uwEmail" as="th">UW email</Col>
              <Col table="carriers" col="uwPhone" as="th">UW phone</Col>
              <Col table="carriers" col="amName" as="th">Account manager</Col>
              <Col table="carriers" col="claimsPhone" as="th">Claims phone</Col>
              <Col table="carriers" col="billingPhone" as="th">Billing phone</Col>
              <Col table="carriers" col="comm" as="th">NB / renewal %</Col>
              <Col table="carriers" col="submission" as="th">Preferred submission</Col>
              <Col table="carriers" col="binding" as="th">Binding authority</Col>
              <Col table="carriers" col="agentPhone" as="th">Agent phone</Col>
              <Col table="carriers" col="website" as="th">Website / portal</Col>
              <Col table="carriers" col="info" as="th">Carrier info</Col>
              <Col table="carriers" col="appetite" as="th">Appetite notes</Col>
              <Col table="carriers" col="lines" as="th">Lines</Col>
            </tr>
          </thead>
          <SheetTbody>
            {unique.map(({ carrier }) => (
              <tr key={carrier.id}>
                <Col table="carriers" col="name">
                  <RecordLink href={`/carriers/${carrier.id}`}>{carrier.name}</RecordLink>
                </Col>
                <Col table="carriers" col="naic">{carrier.naic ?? "—"}</Col>
                <Col table="carriers" col="amBest">{carrier.amBestRating ?? "—"}</Col>
                <Col table="carriers" col="territory">{carrier.territory ?? "—"}</Col>
                <Col table="carriers" col="agencyCode">{carrier.agencyCode ?? "—"}</Col>
                <Col table="carriers" col="portalLogin" className="uppercase">
                  {carrier.portalStatus.replaceAll("_", " ")}
                </Col>
                <Col table="carriers" col="csPhone">{carrier.customerServicePhone ?? "—"}</Col>
                <Col table="carriers" col="uw">{carrier.underwriterName ?? "—"}</Col>
                <Col table="carriers" col="uwEmail">{carrier.underwriterEmail ?? "—"}</Col>
                <Col table="carriers" col="uwPhone">{carrier.underwriterPhone ?? "—"}</Col>
                <Col table="carriers" col="amName">{carrier.accountManagerName ?? "—"}</Col>
                <Col table="carriers" col="claimsPhone">{carrier.claimsPhone ?? "—"}</Col>
                <Col table="carriers" col="billingPhone">{carrier.billingPhone ?? "—"}</Col>
                <Col table="carriers" col="comm">
                  {[carrier.newBusinessCommPct, carrier.renewalCommPct].filter(Boolean).join(" / ") || "—"}
                </Col>
                <Col table="carriers" col="submission">{carrier.preferredSubmission ?? "—"}</Col>
                <Col table="carriers" col="binding">{carrier.bindingAuthority ?? "—"}</Col>
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
                <Col table="carriers" col="appetite">{carrier.appetiteNotes ?? "—"}</Col>
                <Col table="carriers" col="lines">{(carrier.writtenLines ?? []).join(", ") || "—"}</Col>
              </tr>
            ))}
          </SheetTbody>
        </table>
      </section>
    </AppShell>
  );
}
