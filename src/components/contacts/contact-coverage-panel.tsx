import Link from "next/link";
import { GapPanel } from "@/components/coverage/gap-panel";
import { PolicyStatusBadge } from "@/components/policy/policy-status-badge";
import { RecordLink } from "@/components/record-links";
import type { DeclaredCoverageLine } from "@/lib/coverage/declared-coverage";
import {
  analyzeCoverageGaps,
  classifyCoverageLine,
  gapLineLabel,
  type GapPolicyInput,
} from "@/lib/coverage/gaps";
import { formatDay, formatMoney } from "@/lib/domain";
import { isInForcePolicyStatus } from "@/lib/lifecycle/client-status";
import { cn } from "@/lib/utils";

export type CoveragePolicyRow = GapPolicyInput & {
  premium?: string | number | null;
  renewalDate?: Date | string | null;
  expirationDate?: Date | string | null;
  carrierName?: string | null;
  policyType?: string | null;
};

export function ContactCoveragePanel({
  partyName,
  isAna,
  quoteCount,
  policies,
  focusPolicyId,
  declaredCoverage,
}: {
  partyName: string;
  isAna?: boolean;
  quoteCount?: number;
  policies: CoveragePolicyRow[];
  focusPolicyId?: string | null;
  declaredCoverage?: DeclaredCoverageLine[];
}) {
  const report = analyzeCoverageGaps({
    policies,
    partyName,
    isAna,
    quoteCount,
    declaredCoverage,
  });
  const inForce = policies.filter((policy) => isInForcePolicyStatus(policy.status));

  return (
    <div className="space-y-4" data-ff-contact-coverage="">
      <p className="text-xs text-muted-foreground">
        Household in-force summary on this Contact. Individual limits and endorsements stay on
        each Policy. Quotes are not coverage.
      </p>
      {inForce.length === 0 ? (
        <p className="text-sm text-muted-foreground" data-ff-contact-coverage-empty="">
          {report.emptyReason}
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-md border border-border" data-ff-contact-coverage-inforce="">
          {inForce.map((row) => {
            const focused = focusPolicyId === row.id;
            const renewal = row.renewalDate ?? row.expirationDate;
            return (
              <li
                key={row.id}
                id={`coverage-policy-${row.id}`}
                data-ff-coverage-policy={row.id}
                data-ff-focus={focused ? "1" : undefined}
                className={cn("px-3 py-2 text-sm", focused && "bg-amber-50 ring-1 ring-amber-300")}
              >
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <RecordLink href={`/policies/${row.id}`}>{row.policyNumber || "Policy"}</RecordLink>
                  <PolicyStatusBadge status={row.status} />
                  <span className="text-xs text-muted-foreground">
                    {gapLineLabel(classifyCoverageLine(row.lineOfBusiness))}
                  </span>
                  {row.carrierName ? (
                    <span className="text-xs text-muted-foreground">{row.carrierName}</span>
                  ) : null}
                  <span className="text-xs text-muted-foreground">{formatMoney(row.premium)}</span>
                  <span className="text-xs text-muted-foreground">Renewal {formatDay(renewal)}</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <GapPanel report={report} embedded />
      <p className="text-[11px] text-muted-foreground">
        Full policy list (including lapsed) is under{" "}
        <Link href="#policies" className="text-primary hover:underline">
          Policies
        </Link>
        . Gaps that fire write one in-app row on the notification board — not a second board.
      </p>
    </div>
  );
}
