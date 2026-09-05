import { Col } from "@/components/column-picker";
import { SheetTbody } from "@/components/sheet/sheet-table";
import { PolicyStatusBadge } from "@/components/policy/policy-status-badge";
import { RecordLink } from "@/components/record-links";
import { formatMoney } from "@/lib/domain";
import { toNumber } from "@/lib/commissions/math";

export function RelatedRollups({
  premium,
  commission,
}: {
  premium: number;
  commission: number;
}) {
  return (
    <div className="mb-3 grid gap-2 sm:grid-cols-2">
      <div className="rounded-md border border-border px-3 py-2 text-sm">
        <div className="text-xs text-muted-foreground">Total premium (these policies)</div>
        <div className="font-semibold text-navy">{formatMoney(premium)}</div>
      </div>
      <div className="rounded-md border border-border px-3 py-2 text-sm">
        <div className="text-xs text-muted-foreground">Total commission (these policies)</div>
        <div className="font-semibold text-navy">{formatMoney(commission)}</div>
      </div>
    </div>
  );
}

export function RelatedPolicies({
  rows,
}: {
  rows: Array<{
    policy: { id: string; policyNumber: string; status: string; premium: string | number | null };
    carrier?: { name: string } | null;
    deal?: { id: string; title: string } | null;
  }>;
}) {
  const premium = rows.reduce((sum, row) => sum + toNumber(row.policy.premium), 0);
  return (
    <div>
      <p className="mb-2 text-xs text-muted-foreground">
        {rows.length} policies · premium rollup {formatMoney(premium)} (from these rows, not a quote).
      </p>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No policies on this record.</p>
      ) : (
        <table className="ff-table">
          <thead>
            <tr>
              <Col table="related-policies" col="number" as="th">Policy</Col>
              <Col table="related-policies" col="status" as="th">Status</Col>
              <Col table="related-policies" col="carrier" as="th">Carrier</Col>
              <Col table="related-policies" col="premium" as="th">Premium</Col>
            </tr>
          </thead>
          <SheetTbody>
            {rows.map(({ policy, carrier, deal }) => (
              <tr key={policy.id}>
                <Col table="related-policies" col="number">
                  <RecordLink href={`/policies/${policy.id}`}>{policy.policyNumber}</RecordLink>
                  {deal ? (
                    <div className="text-[11px]">
                      <RecordLink href={`/deals/${deal.id}`}>{deal.title}</RecordLink>
                    </div>
                  ) : null}
                </Col>
                <Col table="related-policies" col="status">
                  <PolicyStatusBadge status={policy.status} />
                </Col>
                <Col table="related-policies" col="carrier">{carrier?.name ?? "—"}</Col>
                <Col table="related-policies" col="premium" sortValue={policy.premium}>
                  {formatMoney(policy.premium)}
                </Col>
              </tr>
            ))}
          </SheetTbody>
        </table>
      )}
    </div>
  );
}

export function RelatedDeals({
  deals,
}: {
  deals: Array<{ id: string; title: string; pipelineStage?: string }>;
}) {
  if (deals.length === 0) {
    return <p className="text-sm text-muted-foreground">No deals linked.</p>;
  }
  return (
    <ul className="divide-y divide-border rounded-md border border-border">
      {deals.map((deal) => (
        <li key={deal.id} className="px-3 py-2 text-sm">
          <RecordLink href={`/deals/${deal.id}`}>{deal.title}</RecordLink>
          {deal.pipelineStage ? (
            <span className="ml-2 text-xs uppercase text-muted-foreground">{deal.pipelineStage}</span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export function dayInput(value?: Date | string | null) {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}
