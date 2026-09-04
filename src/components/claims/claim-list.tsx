import Link from "next/link";
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
  policyId: string;
  policyNumber?: string;
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
    return <p className="px-4 py-6 text-base text-muted-foreground">{empty}</p>;
  }

  return (
    <table className="ff-table">
      <thead>
        <tr>
          <th>Reported</th>
          {showPolicy ? <th>Policy</th> : null}
          <th>Why</th>
          <th>How</th>
          <th>Carrier #</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id}>
            <td>
              <Link href={`/claims/${row.id}`} className="font-medium text-primary hover:underline">
                {formatDate(row.dateReported)}
              </Link>
              <div className="text-base text-muted-foreground">
                Loss {formatDate(row.dateOfLoss)}
              </div>
            </td>
            {showPolicy ? (
              <td>
                <Link href={`/policies/${row.policyId}`} className="text-primary hover:underline">
                  {row.policyNumber ?? "Policy"}
                </Link>
              </td>
            ) : null}
            <td>
              <div className="font-medium">{claimCauseLabel(row.causeType)}</div>
              <div className="text-base text-muted-foreground">
                {row.description || "No short text"}
              </div>
            </td>
            <td>{claimChannelLabel(row.reportedHow)}</td>
            <td className="font-mono text-xs">{row.carrierClaimNumber || "—"}</td>
            <td>
              <ClaimStatusBadge status={row.status} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
