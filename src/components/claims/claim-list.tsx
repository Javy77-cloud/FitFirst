import Link from "next/link";
import { ClaimStatusBadge } from "@/components/claims/status-badge";
import { DeskColumnTable } from "@/components/lists/desk-column-table";
import { claimCauseLabel, claimChannelLabel } from "@/lib/claims";
import { formatDate } from "@/lib/domain";
import { CLAIMS_LIST_COLUMNS } from "@/lib/list-columns";
import { haystack } from "@/lib/search/live-query";

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
  initialQuery = "",
}: {
  rows: ClaimListRow[];
  empty: string;
  showPolicy?: boolean;
  initialQuery?: string;
}) {
  const columns = showPolicy
    ? CLAIMS_LIST_COLUMNS
    : CLAIMS_LIST_COLUMNS.filter((column) => column.id !== "policy");

  return (
    <DeskColumnTable
      moduleId={showPolicy ? "claims" : "claim-rows"}
      searchModuleId="claims"
      initialQuery={initialQuery}
      columns={columns}
      empty={empty}
      rows={rows.map((row) => ({
        key: row.id,
        hay: haystack([
          row.policyNumber,
          row.contactName,
          row.causeType,
          row.description,
          row.carrierClaimNumber,
          row.status,
        ]),
        cells: {
          reported: (
            <>
              <Link href={`/claims/${row.id}`} className="font-medium text-primary hover:underline">
                {formatDate(row.dateReported)}
              </Link>
              <div className="text-base text-muted-foreground">Loss {formatDate(row.dateOfLoss)}</div>
            </>
          ),
          policy: row.policyId ? (
            <Link href={`/policies/${row.policyId}`} className="text-primary hover:underline">
              {row.policyNumber ?? "Policy"}
            </Link>
          ) : row.contactId ? (
            <Link href={`/contacts/${row.contactId}`} className="text-primary hover:underline">
              {row.contactName ?? "Contact"}
            </Link>
          ) : (
            "—"
          ),
          why: (
            <>
              <div className="font-medium">{claimCauseLabel(row.causeType)}</div>
              <div className="text-base text-muted-foreground">{row.description || "No short text"}</div>
            </>
          ),
          how: claimChannelLabel(row.reportedHow),
          carrier: <span className="font-mono text-xs">{row.carrierClaimNumber || "—"}</span>,
          status: <ClaimStatusBadge status={row.status} />,
        },
      }))}
    />
  );
}
