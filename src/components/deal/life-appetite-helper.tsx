import {
  LIFE_UW_MATRIX_COVERAGE_NOTE,
  lifeOutcomeLabel,
  type LifeAppetiteOutcome,
  type LifeAppetitePrediction,
} from "@/lib/life/appetite-types";
import { lifeBuildSummary, type LifeBuildSnapshot } from "@/lib/life/build";
import { cn } from "@/lib/utils";

const OUTCOME_TONE: Record<LifeAppetiteOutcome, string> = {
  accept: "border-fit-green/40 bg-fit-green-bg text-fit-green",
  preferred: "border-fit-green/40 bg-fit-green-bg text-fit-green",
  select: "border-fit-green/40 bg-fit-green-bg text-fit-green",
  standard: "border-primary/30 bg-primary/5 text-navy",
  graded: "border-fit-yellow/50 bg-fit-yellow-bg text-fit-yellow",
  call_carrier: "border-sky-400/50 bg-sky-50 text-sky-800",
  decline: "border-fit-flag/40 bg-fit-flag/10 text-fit-flag",
  unknown: "border-border bg-muted/40 text-muted-foreground",
};

export function LifeAppetiteHelper({
  selectedLabels,
  tobaccoStatus,
  predictions,
  coverageNote = LIFE_UW_MATRIX_COVERAGE_NOTE,
  build,
  ageYears = null,
  thin = false,
}: {
  selectedLabels: string[];
  tobaccoStatus?: string | null;
  predictions: LifeAppetitePrediction[];
  coverageNote?: string;
  build?: LifeBuildSnapshot | null;
  ageYears?: number | null;
  thin?: boolean;
}) {
  const tobacco = String(tobaccoStatus ?? "").trim();
  const buildLine = lifeBuildSummary(build);
  const ageLine = ageYears != null && Number.isFinite(ageYears) ? `Age: ${ageYears}` : "";
  const empty = thin || predictions.length === 0;
  const counts = predictions.reduce(
    (acc, row) => {
      acc[row.outcome] += 1;
      return acc;
    },
    {
      accept: 0,
      preferred: 0,
      select: 0,
      standard: 0,
      graded: 0,
      call_carrier: 0,
      decline: 0,
      unknown: 0,
    } as Record<LifeAppetiteOutcome, number>,
  );

  return (
    <section
      className="ff-card space-y-3 p-4"
      data-ff-life-appetite=""
      data-ff-life-markets=""
      data-ff-life-appetite-thin={empty ? "true" : "false"}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-navy">Life MATRIX appetite</h3>
          <p className="mt-1 text-xs text-muted-foreground" data-ff-life-appetite-note="">
            {coverageNote} Appetite only — no rate pull.
          </p>
        </div>
        {empty ? null : (
          <p className="text-xs text-muted-foreground" data-ff-life-appetite-stats="">
            {counts.decline} decline · {counts.graded} graded · {counts.call_carrier} call carrier ·{" "}
            {counts.accept + counts.preferred + counts.select + counts.standard} accept · {counts.unknown}{" "}
            unknown
          </p>
        )}
      </div>
      <p
        className="text-xs text-navy"
        data-ff-life-appetite-conditions=""
        data-ff-life-appetite-build={buildLine || undefined}
        data-ff-life-appetite-age={ageLine || undefined}
      >
        {selectedLabels.length
          ? `Conditions: ${selectedLabels.join(", ")}`
          : "No Life conditions selected on the Risk Profile."}
        {tobacco ? ` · Tobacco: ${tobacco}` : ""}
        {ageLine ? ` · ${ageLine}` : ""}
        {buildLine ? ` · ${buildLine}` : ""}
      </p>
      {empty ? (
        <p className="text-sm text-muted-foreground" data-ff-life-appetite-empty="">
          Need age, build, or conditions to score Life MATRIX appetite. This tab stays empty
          instead of inventing In appetite.
        </p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3" data-ff-life-appetite-cards="">
          {predictions.map((row) => (
            <article
              key={`${row.carrierSlug}-${row.productSlug}`}
              className="rounded-md border border-border bg-background px-3 py-2"
              data-ff-life-appetite-card={row.productSlug}
              data-ff-life-appetite-outcome={row.outcome}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-navy">{row.productName}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{row.carrierName}</p>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                    OUTCOME_TONE[row.outcome],
                  )}
                >
                  {lifeOutcomeLabel(row.outcome)}
                </span>
              </div>
              {row.ruleText ? (
                <p className="mt-1 line-clamp-3 text-[11px] text-muted-foreground">{row.ruleText}</p>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export function HealthMarketsEmpty({ usingHealthSherpa = false }: { usingHealthSherpa?: boolean }) {
  return (
    <section className="ff-card space-y-2 p-4" data-ff-health-markets="" data-ff-health-markets-empty="">
      <h3 className="text-sm font-semibold text-navy">Health Markets</h3>
      <p className="text-sm text-muted-foreground">
        Appetite only — no rate pull. There is no Health UW matrix loaded, so this tab stays empty.
        {usingHealthSherpa
          ? " Using HealthSherpa: quote in HealthSherpa, not this Markets tab. Dental / Vision / Short-term stay manual."
          : null}
      </p>
    </section>
  );
}
