import Link from "next/link";
import { CommissionStatusPill } from "@/components/commissions/status-pill";
import { RecordLink } from "@/components/record-links";
import { formatDay, formatMoney } from "@/lib/domain";
import { insuranceFamilyFromPolicy } from "@/lib/desk/policy-family";

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
  if (rows.length === 0) {
    return <p className="px-4 py-6 text-base text-muted-foreground">{empty}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="ff-table">
        <thead>
          <tr>
            <th>Policy</th>
            <th>Type</th>
            <th>Subtype</th>
            {showProducer ? <th>Producer</th> : null}
            <th>Status</th>
            <th>Amount</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>
                {row.policyId ? (
                  <RecordLink href={`/policies/${row.policyId}`}>
                    {row.policyNumber ?? "Policy"}
                  </RecordLink>
                ) : (
                  (row.policyNumber ?? "—")
                )}
              </td>
              <td>{bookLabel(row)}</td>
              <td>{subtypeLabel(row)}</td>
              {showProducer ? (
                <td>
                  {row.agentId ? (
                    <Link
                      href={`/commissions/agents/${row.agentId}`}
                      className="text-primary hover:underline"
                    >
                      {row.agentName}
                    </Link>
                  ) : (
                    row.agentName
                  )}
                </td>
              ) : null}
              <td>
                <CommissionStatusPill status={row.status} />
              </td>
              <td>{formatMoney(row.amount)}</td>
              <td className="text-xs text-muted-foreground">
                {row.status === "paid" ? formatDay(row.paidDate) : formatDay(row.dueDate)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
