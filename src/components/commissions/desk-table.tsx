import Link from "next/link";
import { CommissionStatusPill } from "@/components/commissions/status-pill";
import { DeskColumnTable } from "@/components/lists/desk-column-table";
import { RecordLink } from "@/components/record-links";
import { formatDay, formatMoney } from "@/lib/domain";
import { insuranceFamilyFromPolicy } from "@/lib/desk/policy-family";
import { COMMISSIONS_LIST_COLUMNS } from "@/lib/list-columns";

export type CommissionDeskRow = {
  id: string;
  agentId?: string | null;
  policyId: string | null;
  policyNumber: string | null;
  agentName: string;
  insuranceType?: string | null;
  lineOfBusiness?: string | null;
  policyType?: string | null;
  policySubType?: string | null;
  status: string;
  amount: number | string | null;
  dueDate?: Date | string | null;
  paidDate?: Date | string | null;
};

function bookLabel(row: CommissionDeskRow): string {
  return insuranceFamilyFromPolicy({
    insuranceType: row.insuranceType,
    lineOfBusiness: row.lineOfBusiness,
    policySubType: row.policySubType,
  });
}

function subtypeLabel(row: CommissionDeskRow): string {
  return row.policySubType || row.policyType || row.lineOfBusiness || "—";
}

export function CommissionDeskTable({
  rows,
  showProducer,
  empty,
}: {
  rows: CommissionDeskRow[];
  showProducer?: boolean;
  empty: string;
}) {
  const columns = showProducer
    ? COMMISSIONS_LIST_COLUMNS
    : COMMISSIONS_LIST_COLUMNS.filter((column) => column.id !== "producer");

  return (
    <DeskColumnTable
      moduleId={showProducer ? "commissions-admin" : "commissions"}
      columns={columns}
      empty={empty}
      rows={rows.map((row) => ({
        key: row.id,
        cells: {
          policy: row.policyId ? (
            <RecordLink href={`/policies/${row.policyId}`}>{row.policyNumber ?? "Policy"}</RecordLink>
          ) : (
            (row.policyNumber ?? "—")
          ),
          type: bookLabel(row),
          subtype: subtypeLabel(row),
          producer: row.agentId ? (
            <Link href={`/commissions/agents/${row.agentId}`} className="text-primary hover:underline">
              {row.agentName}
            </Link>
          ) : (
            row.agentName
          ),
          status: <CommissionStatusPill status={row.status} />,
          amount: formatMoney(row.amount),
          date: (
            <span className="text-xs text-muted-foreground">
              {row.status === "paid" ? formatDay(row.paidDate) : formatDay(row.dueDate)}
            </span>
          ),
        },
      }))}
    />
  );
}
