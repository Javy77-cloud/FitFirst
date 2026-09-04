import Link from "next/link";
import { Col } from "@/components/column-picker";
import { SheetTbody } from "@/components/sheet/sheet-table";
import { ClaimStatusBadge } from "@/components/claims/status-badge";
import { claimCauseLabel, claimChannelLabel } from "@/lib/claims";
import { formatDate } from "@/lib/domain";

export type ClaimListRow = {
  id: string;
  status: string;
  causeType: string;
  description: string | null;
  reportedHow: string;
  dateReported: Date;
  dateOfLoss: Date | null;
  carrierClaimNumber: string | null;
  policyId: string | null;
  policyNumber?: string;
  contactId?: string | null;
  contactName?: string | null;
};

export function ClaimList({
  rows,
  empty,
  showPolicy = false,
}: {
  rows: ClaimListRow[];
  empty: string;
  showPolicy?: boolean;
}) {
  if (rows.length === 0) {
    return <p className="px-4 py-6 text-sm text-muted-foreground">{empty}</p>;
  }

  return (
    <table className="ff-table">
      <thead>
        <tr>
          <Col table="claim-rows" col="reported" as="th">Reported</Col>
          {showPolicy ? <Col table="claim-rows" col="policy" as="th">Policy</Col> : null}
          <Col table="claim-rows" col="why" as="th">Why</Col>
          <Col table="claim-rows" col="how" as="th">How</Col>
          <Col table="claim-rows" col="carrier" as="th">Carrier #</Col>
          <Col table="claim-rows" col="status" as="th">Status</Col>
        </tr>
      </thead>
      <SheetTbody>
        {rows.map((row) => (
          <tr key={row.id}>
            <Col table="claim-rows" col="reported" sortValue={row.dateReported.toISOString()}>
              <Link href={`/claims/${row.id}`} className="font-medium text-primary hover:underline">
                {formatDate(row.dateReported)}
              </Link>
              <div className="text-[11px] text-muted-foreground">
                Loss {formatDate(row.dateOfLoss)}
              </div>
            </Col>
            {showPolicy ? (
              <Col table="claim-rows" col="policy">
                {row.policyId ? (
                  <Link href={`/policies/${row.policyId}`} className="text-primary hover:underline">
                    {row.policyNumber ?? "Policy"}
                  </Link>
                ) : row.contactId ? (
                  <Link href={`/contacts/${row.contactId}`} className="text-primary hover:underline">
                    {row.contactName ?? "Contact"}
                  </Link>
                ) : (
                  "—"
                )}
              </Col>
            ) : null}
            <Col table="claim-rows" col="why">
              <div className="font-medium">{claimCauseLabel(row.causeType)}</div>
              <div className="text-[11px] text-muted-foreground">
                {row.description || "No short text"}
              </div>
            </Col>
            <Col table="claim-rows" col="how">{claimChannelLabel(row.reportedHow)}</Col>
            <Col table="claim-rows" col="carrier" className="font-mono text-xs">
              {row.carrierClaimNumber || "—"}
            </Col>
            <Col table="claim-rows" col="status" sortValue={row.status}>
              <ClaimStatusBadge status={row.status} />
            </Col>
          </tr>
        ))}
      </SheetTbody>
    </table>
  );
}
