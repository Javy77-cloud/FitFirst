import Link from "next/link";
import { dealsViewHref, type DealsViewId } from "@/lib/deals/deals-views";
import {
  defaultDealScope,
  lensesAreActive,
  parseDealHeat,
  parseDealLens,
  resolveDealScope,
  visibleLenses,
} from "@/lib/deals/deals-lenses";
import { HEAT_LABELS, HEAT_RULE_HELP, type HeatState } from "@/lib/deals/velocity";
import { chipTabClass, FF_CHIP_TAB_GROUP } from "@/lib/ui/chip-tabs";
import { ON_HOLD_ATTENTION, ON_HOLD_LABEL } from "@/lib/deals/on-hold";
import { cn } from "@/lib/utils";

type LensHrefOpts = {
  view: DealsViewId;
  pipeline?: string | null;
  family?: string | null;
  pcSub?: string | null;
  lifeSub?: string | null;
  healthSub?: string | null;
  heat?: string | null;
  lens?: string | null;
  scope?: string | null;
  valueBand?: string | null;
  q?: string | null;
  attention?: string | null;
  tags?: string | null;
};

const HEAT_TITLES: Record<HeatState, string> = {
  hot: "Hot — silent under 5 days",
  cooling: "Cooling — silent 5–9 days",
  near_cold: "Near cold — silent 10–13 days",
  cold: "Cold — silent 14+ days",
};

export function DealsLenses({
  href,
  canSeeTeam,
  counts,
}: {
  href: LensHrefOpts;
  canSeeTeam: boolean;
  counts: Record<HeatState, number>;
}) {
  const heat = parseDealHeat(href.heat);
  const lens = parseDealLens(href.lens);
  const scope = resolveDealScope({ scope: href.scope, canSeeTeam, view: href.view });
  const base = {
    view: href.view,
    pipeline: href.pipeline,
    family: href.family,
    pcSub: href.pcSub,
    lifeSub: href.lifeSub,
    healthSub: href.healthSub,
    q: href.q,
  };
  const clearHref = dealsViewHref({
    ...base,
    heat: null,
    lens: null,
    scope: defaultDealScope({ canSeeTeam, view: href.view }),
    valueBand: null,
    attention: null,
  });
  const showClear = lensesAreActive({
    heat: href.heat,
    lens: href.lens,
    scope: href.scope,
    attention: href.attention,
    canSeeTeam,
    view: href.view,
  });
  const saved = visibleLenses(canSeeTeam);

  return (
    <div className="ff-deals-lenses" data-ff-deals-lenses="">
      <div className="ff-heat-lenses" aria-label="Heat">
        {(["hot", "cooling", "near_cold", "cold"] as const).map((id) => (
          <Link
            key={id}
            href={dealsViewHref({
              ...base,
              heat: heat === id ? null : id,
              lens: null,
              scope: href.scope,
              valueBand: null,
            })}
            className={cn("ff-heat-lens", `ff-heat-${id}`, heat === id && "is-on")}
            data-ff-heat-chip={id}
            title={HEAT_TITLES[id]}
            aria-label={`${HEAT_LABELS[id]} ${counts[id]}`}
          >
            <i aria-hidden />
            <span>{counts[id]}</span>
          </Link>
        ))}
      </div>
      {canSeeTeam ? (
        <div className={FF_CHIP_TAB_GROUP} aria-label="Book scope">
          <Link
            href={dealsViewHref({
              ...base,
              heat: href.heat,
              lens: null,
              valueBand: null,
              scope: "mine",
            })}
            className={chipTabClass(scope === "mine")}
            data-ff-deal-scope="mine"
          >
            Mine
          </Link>
          <Link
            href={dealsViewHref({
              ...base,
              heat: href.heat,
              lens: null,
              valueBand: null,
              scope: "team",
            })}
            className={chipTabClass(scope === "team")}
            data-ff-deal-scope="team"
          >
            Team
          </Link>
        </div>
      ) : null}
      {saved.length > 0 ? (
        <div className={FF_CHIP_TAB_GROUP} aria-label="Saved lenses">
          {saved.map((item) => (
            <Link
              key={item.id}
              href={dealsViewHref({
                ...base,
                lens: lens === item.id ? null : item.id,
                heat: lens === item.id ? null : item.heat,
                scope: lens === item.id ? defaultDealScope({ canSeeTeam, view: href.view }) : item.scope,
                valueBand: null,
              })}
              className={chipTabClass(lens === item.id)}
              data-ff-deal-lens={item.id}
              title={item.help}
            >
              {item.label}
            </Link>
          ))}
        </div>
      ) : null}

      <div className={FF_CHIP_TAB_GROUP} aria-label="Parking">
        <Link
          href={dealsViewHref({
            ...base,
            heat: null,
            lens: null,
            scope: href.scope,
            valueBand: null,
            attention: href.attention === ON_HOLD_ATTENTION ? null : ON_HOLD_ATTENTION,
          })}
          className={chipTabClass(href.attention === ON_HOLD_ATTENTION)}
          data-ff-deal-on-hold-filter=""
          title="Soft-parked deals — not Lost. Restore returns them to the active stack."
        >
          {ON_HOLD_LABEL}
        </Link>
      </div>

      {showClear ? (
        <Link href={clearHref} className="ff-clear-lenses" data-ff-clear-lenses="">
          Clear lenses
        </Link>
      ) : null}
      <p className="ff-deals-lens-help" data-ff-deals-lens-help="">
        {HEAT_RULE_HELP}
      </p>
    </div>
  );
}
