import { AdditionalInterestPanel } from "@/components/ams/additional-interest-panel";
import { formatMoney } from "@/lib/domain";
import {
  allowedInterestKinds,
  canHoldInterests,
  isPersonalLinesPolicy,
} from "@/lib/ams/additional-interests";
import { autoCoverageExtras, autoCoverageSchedule } from "@/lib/policy/auto-coverage";
import { resolveLobOverviewFamily } from "@/lib/policy/lob-overview";
import type { PolicyCoverageLine } from "@/lib/db/schema";

type TermRow = {
  id: string;
  role: string;
  premium: string | null;
  aopDeductible: string | null;
  hurricaneDeductible: string | null;
  comprehensiveDeductible: string | null;
  collisionDeductible: string | null;
  coverages: PolicyCoverageLine[] | Record<string, string> | null;
  termEffective: Date;
  termExpiration: Date;
  source?: string | null;
};

type ScheduleRow = {
  key: string;
  label: string;
  limit: string;
  deductible: string;
  premium: string;
  source: "carrier_download" | "manual" | "unknown";
};

function titleCase(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function sourceFlag(source: ScheduleRow["source"]): string {
  if (source === "carrier_download") return "Carrier download";
  if (source === "manual") return "Manual";
  return "—";
}

function buildSchedule(
  policy: {
    coverageA: number | null;
    coverageLimits: Record<string, string> | null;
    faceAmount: string | null;
  },
  current: TermRow | null,
): ScheduleRow[] {
  const rows: ScheduleRow[] = [];
  const termSource =
    current?.source === "carrier_download" || current?.source === "ivans" || current?.source === "al3"
      ? "carrier_download"
      : current
        ? "manual"
        : "unknown";

  if (policy.coverageA != null) {
    rows.push({
      key: "coverage_a",
      label: "Coverage A",
      limit: formatMoney(policy.coverageA),
      deductible: current?.aopDeductible?.trim() || "—",
      premium: current?.premium ? formatMoney(current.premium) : "—",
      source: termSource,
    });
  }
  if (policy.faceAmount) {
    rows.push({
      key: "face",
      label: "Face amount",
      limit: formatMoney(policy.faceAmount),
      deductible: "—",
      premium: "—",
      source: "manual",
    });
  }
  if (policy.coverageLimits) {
    for (const [key, value] of Object.entries(policy.coverageLimits)) {
      if (!value?.trim()) continue;
      rows.push({
        key: `limit_${key}`,
        label: titleCase(key),
        limit: value.trim(),
        deductible: "—",
        premium: "—",
        source: "manual",
      });
    }
  }
  if (current?.coverages) {
    if (Array.isArray(current.coverages)) {
      for (const row of current.coverages) {
        const label = row.label || row.key || "Coverage";
        if (!label) continue;
        const extended = row as PolicyCoverageLine & {
          deductible?: string;
          premium?: string;
          source?: string;
        };
        rows.push({
          key: `term_${row.key || label}`,
          label,
          limit: row.value?.trim() || "—",
          deductible: extended.deductible?.trim() || "—",
          premium: extended.premium?.trim() || "—",
          source:
            extended.source === "carrier_download"
              ? "carrier_download"
              : extended.source === "manual"
                ? "manual"
                : termSource,
        });
      }
    } else {
      for (const [key, value] of Object.entries(current.coverages)) {
        if (!value?.trim()) continue;
        rows.push({
          key: `term_map_${key}`,
          label: titleCase(key),
          limit: value.trim(),
          deductible: "—",
          premium: "—",
          source: termSource,
        });
      }
    }
  }
  for (const [label, value] of [
    ["AOP deductible", current?.aopDeductible],
    ["Hurricane deductible", current?.hurricaneDeductible],
    ["Comprehensive deductible", current?.comprehensiveDeductible],
    ["Collision deductible", current?.collisionDeductible],
  ] as const) {
    if (!value?.trim()) continue;
    if (rows.some((row) => row.deductible === value.trim() && row.label === "Coverage A")) continue;
    rows.push({
      key: `ded_${label}`,
      label,
      limit: "—",
      deductible: value.trim(),
      premium: "—",
      source: termSource,
    });
  }
  return rows;
}

export function PolicyCoverageTab({
  policy,
  terms,
  currentTerm,
  interests = [],
  contactId,
  accountId,
  readOnly = false,
}: {
  policy: {
    id: string;
    coverageA: number | null;
    coverageLimits: Record<string, string> | null;
    faceAmount: string | null;
    lineOfBusiness: string;
    formType: string | null;
    policyType: string | null;
    insuranceType?: string | null;
    policySubType?: string | null;
  };
  terms: TermRow[];
  /** Term the current-term resolver chose. Null means nothing is in force. */
  currentTerm?: TermRow | null;
  interests?: Parameters<typeof AdditionalInterestPanel>[0]["interests"];
  contactId?: string | null;
  accountId?: string | null;
  readOnly?: boolean;
}) {
  const current =
    currentTerm !== undefined
      ? currentTerm
      : (terms.find((term) => term.role === "current") ?? null);
  const auto = resolveLobOverviewFamily(policy) === "auto";
  const termSource: ScheduleRow["source"] =
    current?.source === "carrier_download" || current?.source === "ivans" || current?.source === "al3"
      ? "carrier_download"
      : current
        ? "manual"
        : "unknown";
  const schedule: ScheduleRow[] = auto
    ? autoCoverageSchedule({
        coverageLimits: policy.coverageLimits,
        comprehensiveDeductible: current?.comprehensiveDeductible,
        collisionDeductible: current?.collisionDeductible,
      }).map((row) => ({ ...row, source: termSource }))
    : buildSchedule(policy, current);
  const extras = auto
    ? autoCoverageExtras({
        coverageLimits: policy.coverageLimits,
      })
    : [];
  const showInterests = canHoldInterests({
    ...policy,
    contactId,
    accountId,
  });

  return (
    <div className="space-y-4" data-ff-policy-tab="coverage">
      <section className="ff-card p-4">
        <h2 className="text-base font-semibold text-navy">Coverage schedule</h2>

        {schedule.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No coverage schedule on file yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="ff-table" data-ff-coverage-schedule="">
              <thead>
                <tr>
                  <th>Coverage</th>
                  <th>Limit</th>
                  <th>Deductible</th>
                  <th>Premium</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {schedule.map((row) => (
                  <tr key={row.key}>
                    <td className="font-medium text-navy">{row.label}</td>
                    <td>{row.limit}</td>
                    <td>{row.deductible}</td>
                    <td>{row.premium}</td>
                    <td>
                      <span className="rounded-sm border border-border bg-white px-1.5 py-0.5 text-[11px] font-medium uppercase text-navy">
                        {sourceFlag(row.source)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {extras.length > 0 ? (
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2" data-ff-auto-coverage-extras="">
            {extras.map((row) => (
              <div key={row.key} data-ff-auto-coverage-extra={row.key}>
                <dt className="text-helper text-muted-foreground">{row.label}</dt>
                <dd className="font-medium text-navy">{row.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </section>

      {showInterests ? (
        <div id="mortgagee" data-ff-coverage-mortgagee="">
          <div id="additional-insured" />
          <AdditionalInterestPanel
            policyId={policy.id}
            interests={interests}
            kinds={allowedInterestKinds({
              ...policy,
              contactId,
              accountId,
            })}
            variant={
              isPersonalLinesPolicy({
                ...policy,
                contactId,
              })
                ? "personal"
                : "commercial"
            }
          />
          {readOnly ? null : null}
        </div>
      ) : null}
    </div>
  );
}
