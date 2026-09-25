import Link from "next/link";
import { ClaimList, type ClaimListRow } from "@/components/claims/claim-list";
import { ClaimsDeskNotice } from "@/components/claims/desk-notice";
import { claimCountsLabel, summarizeClaims } from "@/lib/claims";

export function AccountClaimsPanel({
  contactName,
  rows,
}: {
  contactName: string;
  rows: ClaimListRow[];
}) {
  const summary = summarizeClaims(rows);
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <div className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            Claims on this account
          </div>
          <p className="text-lg font-semibold text-navy">{claimCountsLabel(summary)}</p>

        </div>
        <Link href="/claims" className="text-sm text-primary hover:underline">
          All desk claims
        </Link>
      </div>
      <ClaimsDeskNotice compact />
      <div className="ff-card overflow-hidden">
        <ClaimList
          rows={rows}
          showPolicy
          empty="No claims on file. Ana-style shops and contacts without a notice stay at zero."
        />
      </div>
    </section>
  );
}
