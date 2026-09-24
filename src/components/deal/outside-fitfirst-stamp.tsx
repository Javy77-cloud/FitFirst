import {
  OUTSIDE_FITFIRST_STAMP,
  type OutsideStageOverride,
  hasActiveOutsideOverride,
} from "@/lib/deals/outside-stage-override";
import { cn } from "@/lib/utils";

/** Visible agency stamp when stages were forced because quoting happened off FitFirst. */
export function OutsideFitFirstStamp({
  override,
  variant = "chip",
}: {
  override?: OutsideStageOverride | null;
  /** chip = header/rail; hero = big center stamp on empty Markets/Quotes. */
  variant?: "chip" | "hero";
}) {
  if (!hasActiveOutsideOverride(override)) return null;
  const reason = (override && typeof override === "object" ? override.reason : "") || "";

  if (variant === "hero") {
    return (
      <div
        className="ff-outside-fitfirst-hero mx-auto flex min-h-[12rem] w-full max-w-xl flex-col items-center justify-center rounded-xl border-2 border-dashed border-amber-700/40 bg-amber-50/90 px-6 py-10 text-center shadow-sm"
        data-ff-outside-fitfirst-stamp="hero"
        data-ff-outside-fitfirst-hero=""
      >
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-amber-800/80">
          Stages overridden
        </p>
        <p className="mt-2 text-2xl font-bold leading-tight text-amber-950 sm:text-3xl">
          Quoted outside FitFirst
        </p>
        <p className="mt-1 text-sm font-semibold text-amber-900/90">
          Obtained on carrier portal / legacy platform
        </p>
        {reason ? (
          <p
            className="mt-4 max-w-md text-sm font-medium leading-snug text-amber-950/80"
            data-ff-outside-fitfirst-stamp-reason=""
          >
            Why: {reason}
          </p>
        ) : (
          <p className="mt-4 text-sm text-amber-900/70">{OUTSIDE_FITFIRST_STAMP}</p>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "ff-outside-fitfirst-stamp max-w-sm rounded-md border border-amber-700/25 bg-amber-50 px-2.5 py-1.5 text-[11px] font-semibold leading-snug text-amber-950",
      )}
      data-ff-outside-fitfirst-stamp="chip"
      title={reason || OUTSIDE_FITFIRST_STAMP}
    >
      <div>{OUTSIDE_FITFIRST_STAMP}</div>
      {reason ? (
        <div className="mt-0.5 font-medium text-amber-900/80" data-ff-outside-fitfirst-stamp-reason="">
          {reason}
        </div>
      ) : null}
    </div>
  );
}
