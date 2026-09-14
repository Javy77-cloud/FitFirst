import Link from "next/link";
import { ClaimStatusBadge } from "@/components/claims/status-badge";
import { formatDay } from "@/lib/domain";
import { claimCauseLabel } from "@/lib/claims";

export type PolicyClaimsTabRow = {
  id: string;
  status: string;
  causeType: string;
  description: string | null;
  dateReported: Date;
  dateOfLoss: Date | null;
  carrierClaimNumber: string | null;
};

export function PolicyClaimsTab({
  policyId,
  contactId,
  claims,
}: {
  policyId: string;
  contactId?: string | null;
  claims: PolicyClaimsTabRow[];
}) {
  return (
    <div className="space-y-4" data-ff-policy-tab="claims">
      <section className="ff-card p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-base font-semibold text-navy">Claims</h2>
          <Link
            href={`/claims/new?policy=${policyId}${contactId ? `&contact=${contactId}` : ""}`}
            className="text-sm text-primary hover:underline"
          >
            Log FNOL
          </Link>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Claim number, loss date, status. Amount is shown only when stored on the claim record
          (none today — no invented figures).
        </p>
        {claims.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No claims on this policy.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border rounded-md border border-border">
            {claims.map((claim) => (
              <li key={claim.id} className="flex flex-wrap items-start justify-between gap-3 px-3 py-2 text-sm">
                <div>
                  <Link href={`/claims/${claim.id}`} className="font-medium text-primary hover:underline">
                    {claim.carrierClaimNumber || `Claim ${claim.id.slice(0, 8)}`}
                  </Link>
                  <p className="text-muted-foreground">
                    {claimCauseLabel(claim.causeType)}
                    {claim.description ? ` · ${claim.description}` : ""}
                  </p>
                  <p className="text-muted-foreground">
                    Reported {formatDay(claim.dateReported)}
                    {claim.dateOfLoss ? ` · Loss ${formatDay(claim.dateOfLoss)}` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <ClaimStatusBadge status={claim.status} />
                  <p className="mt-1 text-muted-foreground">Amount —</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
