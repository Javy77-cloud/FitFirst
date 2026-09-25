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
import { policyFormBesideLine } from "@/lib/policy/form-label";
import { cn } from "@/lib/utils";

export type AccountCoveragePolicyRow = GapPolicyInput & {
  premium?: string | number | null;
  renewalDate?: Date | string | null;
  expirationDate?: Date | string | null;
  carrierName?: string | null;
  policyType?: string | null;
  policySubType?: string | null;
  formType?: string | null;
};

/**
 * Account Coverage tab — With us (FitFirst policies) + Elsewhere (agent rows).
 * Reuses ElsewhereCoverageEditor from Contact #358.
 */
export function AccountCoveragePanel({
  accountId,
  partyName,
  policies,
  focusPolicyId,
  elsewhereCoverage = [],
  declaredCoverage: _declaredCoverage,
}: {
  accountId: string;
  partyName: string;
  policies: AccountCoveragePolicyRow[];
  focusPolicyId?: string | null;
  elsewhereCoverage?: ElsewhereCoverageRow[];
  declaredCoverage?: DeclaredCoverageLine[];
}) {
  void _declaredCoverage;
  const inForce = policies.filter((policy) => isInForcePolicyStatus(policy.status));

  return (
    <div className="space-y-5" data-ff-account-coverage="">

      <section className="space-y-2" data-ff-coverage-with-us="">
        <h3 className="text-sm font-semibold text-[#002868]">With us</h3>
        {inForce.length === 0 ? (
          <p className="text-sm text-muted-foreground" data-ff-account-coverage-empty="">
            {partyName} has no in-force FitFirst policy yet.
          </p>
        ) : (
          <ul
            className="divide-y divide-border rounded-md border border-border"
            data-ff-account-coverage-inforce=""
          >
            {inForce.map((row) => {
              const focused = focusPolicyId === row.id;
              const renewal = row.renewalDate ?? row.expirationDate;
              const line = gapLineLabel(classifyCoverageLine(row.lineOfBusiness));
              const form = policyFormBesideLine(line, row);
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
                        {line}
                        {form ? (
                          <span className="text-xs text-muted-foreground"> · {form}</span>
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

        <ElsewhereCoverageEditor recordId={accountId} value={elsewhereCoverage} party="account" />
      </section>

      <p className="text-[11px] text-muted-foreground">
        Full policy list (including lapsed) is under{" "}
        <Link href="?tab=policies" className="text-primary hover:underline">
          Policies
        </Link>
        . Gaps and renewals surface on Opportunities — not a second board.
      </p>
    </div>
  );
}
