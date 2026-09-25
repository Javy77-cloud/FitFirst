import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDay } from "@/lib/domain";
import { LOSS_RUN_STUB_DISCLAIMER } from "@/lib/ams/loss-runs";
import type { Claim } from "@/lib/db/schema";

export function LossRunPanel({
  policyId,
  claims,
}: {
  policyId: string;
  claims: Claim[];
}) {
  return (
    <section className="ff-card mb-4 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold text-navy">Loss runs / claims summary</h2>
        <a
          href={`/api/policies/${policyId}/loss-runs.csv`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          Export CSV stub
        </a>
      </div>
      <p className="mt-1 text-base text-muted-foreground">{LOSS_RUN_STUB_DISCLAIMER}</p>
      {claims.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No desk claims on this Policy.</p>
      ) : (
        <table className="ff-table mt-3">
          <thead>
            <tr>
              <th>Loss</th>
              <th>Cause</th>
              <th>Status</th>
              <th>Carrier #</th>
            </tr>
          </thead>
          <tbody>
            {claims.map((claim) => (
              <tr key={claim.id}>
                <td className="font-medium">
                  <Link href={`/claims/${claim.id}`} className="text-primary hover:underline">
                    {formatDay(claim.dateOfLoss)}
                  </Link>
                </td>
                <td className="capitalize">{claim.causeType?.replaceAll("_", " ") ?? "—"}</td>
                <td>{claim.status.replaceAll("_", " ")}</td>
                <td className="font-mono text-xs">{claim.carrierClaimNumber ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
