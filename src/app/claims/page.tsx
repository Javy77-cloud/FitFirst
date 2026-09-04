import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { ColumnPicker, Col } from "@/components/column-picker";
import { ClaimsDeskNotice } from "@/components/claims/desk-notice";
import { ClaimStatusBadge } from "@/components/claims/status-badge";
import { ClaimStatusPipeline } from "@/components/claims/status-pipeline";
import { SheetTbody } from "@/components/sheet/sheet-table";
import { buttonVariants } from "@/components/ui/button";
import { claimCauseLabel, claimChannelLabel, summarizeClaimPipeline, summarizeClaims } from "@/lib/claims";
import { listDeskClaims } from "@/lib/db/claim-queries";
import { defaultColumns } from "@/lib/desk/columns";
import { formatDay } from "@/lib/domain";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ClaimsPage() {
  const rows = await listDeskClaims();
  const summary = summarizeClaims(rows.map((row) => row.claim));
  const pipeline = summarizeClaimPipeline(rows.map((row) => row.claim));

  return (
    <AppShell
      title="Claims log"
      actions={
        <Link href="/claims/new" className={cn(buttonVariants({ size: "lg" }))}>
          FNOL intake
        </Link>
      }
      columns={<ColumnPicker tableKey="claims" initial={defaultColumns("claims")} />}
    >
      <ClaimsDeskNotice />
      <p className="mt-3 mb-4 text-sm text-muted-foreground">
        Broker status pipeline — inquiry, referred to carrier, closed. {summary.total} on the log ·{" "}
        {summary.open} open · {pipeline.inquiry} inquiry · {pipeline.referred_to_carrier} referred ·{" "}
        {pipeline.closed} closed. Carrier claim # lives on the card. No reserves. No adjusters.
      </p>

      <ClaimStatusPipeline
        rows={rows.map(({ claim, policy, contact }) => ({
          id: claim.id,
          status: claim.status,
          causeType: claim.causeType,
          description: claim.description,
          dateOfLoss: claim.dateOfLoss,
          dateReported: claim.dateReported,
          carrierClaimNumber: claim.carrierClaimNumber,
          policyId: claim.policyId ?? policy?.id ?? null,
          policyNumber: policy?.policyNumber ?? null,
          contactId: claim.contactId ?? contact?.id ?? null,
          contactName: contact ? `${contact.lastName}, ${contact.firstName}` : null,
        }))}
      />

      <section className="ff-card mt-4 overflow-hidden">
        {rows.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-muted-foreground">
              No FNOL notices on the book yet. Log one here — this does not file with the carrier.
            </p>
            <Link href="/claims/new" className={cn(buttonVariants({ size: "lg" }), "mt-4")}>
              FNOL intake
            </Link>
          </div>
        ) : (
          <table className="ff-table">
            <thead>
              <tr>
                <Col table="claims" col="status" as="th">Status</Col>
                <Col table="claims" col="carrierClaim" as="th">Carrier claim</Col>
                <Col table="claims" col="cause" as="th">Cause</Col>
                <Col table="claims" col="channel" as="th">How they told us</Col>
                <Col table="claims" col="dateReported" as="th">Date reported</Col>
                <Col table="claims" col="dateOfLoss" as="th">Date of loss</Col>
                <Col table="claims" col="description" as="th">Short why</Col>
                <Col table="claims" col="policy" as="th">Policy</Col>
                <Col table="claims" col="party" as="th">Contact</Col>
                <Col table="claims" col="producer" as="th">Producer ping</Col>
              </tr>
            </thead>
            <SheetTbody>
              {rows.map(({ claim, policy, contact, producer }) => (
                <tr key={claim.id}>
                  <Col table="claims" col="status">
                    <Link href={`/claims/${claim.id}`} className="font-medium text-primary hover:underline">
                      <ClaimStatusBadge status={claim.status} />
                    </Link>
                  </Col>
                  <Col table="claims" col="carrierClaim" className="font-mono text-xs">
                    {claim.carrierClaimNumber ?? "—"}
                  </Col>
                  <Col table="claims" col="cause">{claimCauseLabel(claim.causeType ?? "other")}</Col>
                  <Col table="claims" col="channel">{claimChannelLabel(claim.reportedHow ?? "phone")}</Col>
                  <Col table="claims" col="dateReported">{formatDay(claim.dateReported)}</Col>
                  <Col table="claims" col="dateOfLoss">{formatDay(claim.dateOfLoss)}</Col>
                  <Col table="claims" col="description">{claim.description ?? "—"}</Col>
                  <Col table="claims" col="policy">
                    {policy ? (
                      <Link href={`/policies/${policy.id}`} className="text-primary hover:underline">
                        {policy.policyNumber}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </Col>
                  <Col table="claims" col="party">
                    {contact ? (
                      <Link href={`/contacts/${contact.id}`} className="text-primary hover:underline">
                        {contact.lastName}, {contact.firstName}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </Col>
                  <Col table="claims" col="producer">
                    {claim.producerNotifiedAt
                      ? `Pinged ${producer?.name ?? "producer"}`
                      : producer?.name ?? "—"}
                  </Col>
                </tr>
              ))}
            </SheetTbody>
          </table>
        )}
      </section>
    </AppShell>
  );
}
