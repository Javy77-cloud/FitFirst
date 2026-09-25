import Link from "next/link";
import { PolicyChangeDesk } from "@/components/policy/change-desk";
import { buttonVariants } from "@/components/ui/button";
import { formatDay, formatMoney, formatRatePct } from "@/lib/domain";
import {
  RENEWAL_QUEUE_STAGES,
  RENEWAL_QUEUE_STAGE_LABELS,
  normalizeRenewalQueueStage,
  renewalQueueNextStep,
  type RenewalQueueStage,
} from "@/lib/domain-ams";
import { cn } from "@/lib/utils";

export function PolicyAgencyTab({
  policy,
  contactId,
  renewalStage,
  error,
  notice,
  showLifecycle = true,
  showCommission = true,
  canWriteLifecycle = true,
}: {
  policy: {
    id: string;
    status: string;
    coverageA: number | null;
    premium: string | null;
    commission4Pct?: string | null;
    commission4?: string | null;
    gwp?: string | null;
    producer?: string | null;
    sellingAgency?: string | null;
    renewalDate?: Date | string | null;
    expirationDate?: Date | string | null;
    effectiveDate?: Date | string | null;
  };
  contactId?: string | null;
  /** From renewal_queue when present; otherwise Upcoming stub. */
  renewalStage?: string | null;
  error?: string;
  notice?: string;
  showLifecycle?: boolean;
  showCommission?: boolean;
  canWriteLifecycle?: boolean;
}) {
  const commission =
    policy.commission4Pct != null && policy.commission4Pct !== ""
      ? formatRatePct(policy.commission4Pct)
      : policy.commission4 != null && policy.commission4 !== ""
        ? formatRatePct(policy.commission4)
        : null;
  const renewalLabel = policy.renewalDate
    ? formatDay(policy.renewalDate)
    : policy.expirationDate
      ? formatDay(policy.expirationDate)
      : "—";

  const stage: RenewalQueueStage =
    normalizeRenewalQueueStage(renewalStage ?? "upcoming") ?? "upcoming";

  return (
    <div className="space-y-4" data-ff-policy-tab="agency">
      {/* 1. Agency actions — lifecycle on top, operational below */}
      <section className="ff-card space-y-4 p-4" data-ff-policy-agency-actions="">
        <div>
          <h2 className="text-base font-semibold text-navy">Agency actions</h2>

        </div>

        {showLifecycle ? (
          <div data-ff-policy-agency-lifecycle="">
            <h3 className="text-sm font-semibold text-navy">Lifecycle</h3>
            <div className="mt-2">
              {canWriteLifecycle ? (
                <PolicyChangeDesk
                  policyId={policy.id}
                  coverageA={policy.coverageA}
                  premium={policy.premium}
                  status={policy.status}
                />
              ) : null}
            </div>
          </div>
        ) : null}

        <div data-ff-policy-agency-operational="">
          <h3 className="text-sm font-semibold text-navy">Operational</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            <Link
              href={`/certificates?policy=${policy.id}`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Certificates
            </Link>
            <Link
              href={`/inspections?policy=${policy.id}`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Inspections
            </Link>
            <Link
              href={`/work-queue?policy=${policy.id}`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Work queue
            </Link>
            <Link
              href={`/claims/new?policy=${policy.id}${contactId ? `&contact=${contactId}` : ""}`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Log FNOL
            </Link>
            <Link
              href={`/renewals?policy=${policy.id}`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Renewals board
            </Link>
          </div>
        </div>
      </section>

      {/* 2. Commission breakdown (admin-only tab) */}
      {showCommission ? (
      <section className="ff-card p-4" data-ff-policy-agency-commission="">
        <h2 className="text-base font-semibold text-navy">Commission breakdown</h2>

        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-helper text-muted-foreground">Premium / GWP</dt>
            <dd className="font-medium text-navy">
              {formatMoney(policy.premium)}
              {policy.gwp ? ` · GWP ${formatMoney(policy.gwp)}` : ""}
            </dd>
          </div>
          <div>
            <dt className="text-helper text-muted-foreground">Commission %</dt>
            <dd className="font-medium text-navy">{commission ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-helper text-muted-foreground">Producer</dt>
            <dd className="font-medium text-navy">{policy.producer?.trim() || "—"}</dd>
          </div>
          <div>
            <dt className="text-helper text-muted-foreground">Selling agency</dt>
            <dd className="font-medium text-navy">{policy.sellingAgency?.trim() || "—"}</dd>
          </div>
        </dl>
      </section>
      ) : null}

      {/* 3. Renewal pipeline status */}
      <section className="ff-card p-4" data-ff-policy-agency-renewal="">
        <h2 className="text-base font-semibold text-navy">Renewal pipeline status</h2>

        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-helper text-muted-foreground">Renewal / X-date</dt>
            <dd className="font-medium text-navy">{renewalLabel}</dd>
          </div>
          <div>
            <dt className="text-helper text-muted-foreground">Pipeline stage</dt>
            <dd className="font-medium text-navy" data-ff-policy-renewal-stage={stage}>
              {RENEWAL_QUEUE_STAGE_LABELS[stage]}
            </dd>
          </div>
          <div>
            <dt className="text-helper text-muted-foreground">Next step</dt>
            <dd className="font-medium text-navy">{renewalQueueNextStep(stage) || "—"}</dd>
          </div>
        </dl>
        <ol className="mt-3 flex flex-wrap gap-1.5" data-ff-policy-renewal-pipeline="">
          {RENEWAL_QUEUE_STAGES.map((s) => (
            <li
              key={s}
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase",
                s === stage
                  ? "border-[#002868] bg-[#002868] text-white"
                  : "border-border bg-card text-muted-foreground",
              )}
            >
              {RENEWAL_QUEUE_STAGE_LABELS[s]}
            </li>
          ))}
        </ol>
        {notice ? <p className="mt-2 text-sm text-navy">{notice}</p> : null}
        {error ? (
          <p className="mt-2 text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
      </section>

      {/* 4. Download reconciliation — empty until download runs */}
      <section className="ff-card p-4" data-ff-policy-agency-download="">
        <h2 className="text-base font-semibold text-navy">Download reconciliation</h2>

        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
          <div data-ff-policy-recon="matched">
            <dt className="text-helper text-muted-foreground">Matched</dt>
            <dd className="font-medium text-navy">—</dd>
          </div>
          <div data-ff-policy-recon="discrepancies">
            <dt className="text-helper text-muted-foreground">Discrepancies</dt>
            <dd className="font-medium text-navy">—</dd>
          </div>
          <div data-ff-policy-recon="failed">
            <dt className="text-helper text-muted-foreground">Failed</dt>
            <dd className="font-medium text-navy">—</dd>
          </div>
        </dl>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-helper text-muted-foreground">Last download</dt>
            <dd className="font-medium text-navy">—</dd>
          </div>
          <div>
            <dt className="text-helper text-muted-foreground">Reconciliation status</dt>
            <dd className="font-medium text-navy">Not run</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
