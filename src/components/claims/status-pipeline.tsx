import Link from "next/link";
import { updateClaimStatus } from "@/app/actions/claims";
import { ClaimStatusBadge } from "@/components/claims/status-badge";
import { Button } from "@/components/ui/button";
import {
  CLAIM_PIPELINE,
  CLAIM_STATUS_LABELS,
  claimCauseLabel,
  nextClaimStatus,
} from "@/lib/claims";
import { formatDate } from "@/lib/domain";
import { cn } from "@/lib/utils";

export type PipelineClaim = {
  id: string;
  status: string;
  causeType: string | null;
  description: string | null;
  dateOfLoss: Date | null;
  dateReported: Date | null;
  carrierClaimNumber: string | null;
  policyId: string | null;
  policyNumber: string | null;
  contactId: string | null;
  contactName: string | null;
};

export function ClaimStatusPipeline({ rows }: { rows: PipelineClaim[] }) {
  return (
    <div className="grid gap-3 lg:grid-cols-3">
      {CLAIM_PIPELINE.map((status) => {
        const cards = rows.filter((row) => row.status === status);
        return (
          <section key={status} className="ff-card min-h-48 overflow-hidden">
            <header className="flex items-center justify-between border-b border-border px-3 py-2">
              <h2 className="text-sm font-semibold text-navy">{CLAIM_STATUS_LABELS[status]}</h2>
              <span className="text-xs text-muted-foreground">{cards.length}</span>
            </header>
            <div className="space-y-2 p-2">
              {cards.length === 0 ? (
                <p className="px-2 py-6 text-center text-xs text-muted-foreground">
                  Nothing in {CLAIM_STATUS_LABELS[status].toLowerCase()}.
                </p>
              ) : (
                cards.map((row) => <PipelineCard key={row.id} row={row} />)
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function PipelineCard({ row }: { row: PipelineClaim }) {
  const next = nextClaimStatus(row.status);
  return (
    <article className="rounded-md border border-border bg-card px-3 py-2 text-sm">
      <div className="flex items-start justify-between gap-2">
        <Link href={`/claims/${row.id}`} className="font-medium text-primary hover:underline">
          {claimCauseLabel(row.causeType ?? "other")}
        </Link>
        <ClaimStatusBadge status={row.status} />
      </div>
      <p className="mt-1 text-xs text-navy">
        {row.contactName ? (
          row.contactId ? (
            <Link href={`/contacts/${row.contactId}`} className="text-primary hover:underline">
              {row.contactName}
            </Link>
          ) : (
            row.contactName
          )
        ) : (
          "No contact"
        )}
        {" · "}
        {row.policyNumber && row.policyId ? (
          <Link href={`/policies/${row.policyId}`} className="text-primary hover:underline">
            {row.policyNumber}
          </Link>
        ) : (
          "No policy"
        )}
      </p>
      <p className={cn("mt-1 font-mono text-[11px]", row.carrierClaimNumber ? "text-navy" : "text-muted-foreground")}>
        Carrier # {row.carrierClaimNumber || "not yet"}
      </p>
      <p className="mt-1 text-[11px] text-muted-foreground">
        Loss {formatDate(row.dateOfLoss)} · reported {formatDate(row.dateReported)}
      </p>
      {row.description ? (
        <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">{row.description}</p>
      ) : null}
      {next ? (
        <form action={updateClaimStatus} className="mt-2">
          <input type="hidden" name="claimId" value={row.id} />
          <input type="hidden" name="status" value={next} />
          <Button type="submit" size="xs" variant="outline">
            Move to {CLAIM_STATUS_LABELS[next]}
          </Button>
        </form>
      ) : null}
    </article>
  );
}
