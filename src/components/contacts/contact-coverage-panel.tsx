import Link from "next/link";
import { ElsewhereCoverageEditor } from "@/components/coverage/elsewhere-coverage-editor";
import { PolicyStatusBadge } from "@/components/policy/policy-status-badge";
import { RecordLink } from "@/components/record-links";
import type { DeclaredCoverageLine } from "@/lib/coverage/declared-coverage";
import {
  classifyCoverageLine,
  gapLineLabel,
  type GapPolicyInput,
} from "@/lib/coverage/gaps";
import { formatDay, formatMoney } from "@/lib/domain";
import type { ElsewhereCoverageRow } from "@/lib/db/schema";
import { isInForcePolicyStatus } from "@/lib/lifecycle/client-status";
import { cn } from "@/lib/utils";

export type CoveragePolicyRow = GapPolicyInput & {
  premium?: string | number | null;
  renewalDate?: Date | string | null;
  expirationDate?: Date | string | null;
  carrierName?: string | null;
  policyType?: string | null;
};

/**
 * Coverage tab — two groups:
 * 1. With us (read-only FitFirst policies)
 * 2. Elsewhere (agent-entered rows; renewal date is the chase trigger)
 */
export function ContactCoveragePanel({
  contactId,
  partyName,
  isAna,
  policies,
  focusPolicyId,
  elsewhereCoverage = [],
  declaredCoverage: _declaredCoverage,
}: {
  contactId: string;
  partyName: string;
  isAna?: boolean;
  quoteCount?: number;
  policies: CoveragePolicyRow[];
  focusPolicyId?: string | null;
  elsewhereCoverage?: ElsewhereCoverageRow[];
  /** Kept for callers; Elsewhere JSONB is source of truth on this tab. */
  declaredCoverage?: DeclaredCoverageLine[];
}) {
  void _declaredCoverage;
  const inForce = policies.filter((policy) => isInForcePolicyStatus(policy.status));

  return (
    <div className="space-y-5" data-ff-contact-coverage="">
      <p className="text-xs text-muted-foreground">
        Household coverage on this Contact. <strong>With us</strong> comes from FitFirst policies.
        <strong> Elsewhere</strong> is agent-entered — renewal date drives Opportunities chase.
        Quotes are not coverage.
      </p>

      {isAna ? (
        <p className="text-sm text-muted-foreground" data-ff-contact-coverage-ana="">
          Ana Dib is still shopping. Quotes are not coverage. Coverage A is $321,000. Do not bind Ana.
        </p>
      ) : null}

      <section className="space-y-2" data-ff-coverage-with-us="">
        <h3 className="text-sm font-semibold text-[#002868]">With us</h3>
        {inForce.length === 0 ? (
          <p className="text-sm text-muted-foreground" data-ff-contact-coverage-empty="">
            {partyName} has no in-force FitFirst policy yet.
          </p>
        ) : (
          <ul
            className="divide-y divide-border rounded-md border border-border"
            data-ff-contact-coverage-inforce=""
          >
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
                  <div className="grid grid-cols-[1.2fr_0.9fr_1fr_0.8fr_0.9fr_0.9fr] gap-x-3 gap-y-1 items-center max-[900px]:grid-cols-2">
                    <div className="min-w-0">
                      <p className="text-[10px] font-medium uppercase tracking-[0.04em] text-muted-foreground">
                        Line
                      </p>
                      <p className="truncate">
                        {gapLineLabel(classifyCoverageLine(row.lineOfBusiness))}
                        {row.policyType ? (
                          <span className="text-xs text-muted-foreground"> · {row.policyType}</span>
                        ) : null}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-medium uppercase tracking-[0.04em] text-muted-foreground">
                        Carrier
                      </p>
                      <p className="truncate">{row.carrierName || "—"}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-medium uppercase tracking-[0.04em] text-muted-foreground">
                        Policy #
                      </p>
                      <RecordLink href={`/policies/${row.id}`}>
                        {row.policyNumber || "Policy"}
                      </RecordLink>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-medium uppercase tracking-[0.04em] text-muted-foreground">
                        Status
                      </p>
                      <PolicyStatusBadge status={row.status} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-medium uppercase tracking-[0.04em] text-muted-foreground">
                        Renewal / exp
                      </p>
                      <p>{formatDay(renewal)}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-medium uppercase tracking-[0.04em] text-muted-foreground">
                        Premium
                      </p>
                      <p>{formatMoney(row.premium)}</p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-2" data-ff-coverage-elsewhere="">
        <h3 className="text-sm font-semibold text-[#002868]">Elsewhere</h3>
        <p className="text-[11px] text-muted-foreground">
          Lines the household holds with another carrier. Add / edit / remove — renewal date is the
          Opportunities chase trigger.
        </p>
        <ElsewhereCoverageEditor recordId={contactId} value={elsewhereCoverage} />
      </section>

      <p className="text-[11px] text-muted-foreground">
        Full policy list (including lapsed) is under{" "}
        <Link href="#policies" className="text-primary hover:underline">
          Policies
        </Link>
        . Gaps and renewals surface on Opportunities — not a second board.
      </p>
    </div>
  );
}
