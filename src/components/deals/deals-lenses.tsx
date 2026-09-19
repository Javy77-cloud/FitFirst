import Link from "next/link";
import { dealsViewHref, type DealsViewId } from "@/lib/deals/deals-views";
import { DEAL_LENSES, parseDealHeat, parseDealLens, parseDealScope, parseValueBand } from "@/lib/deals/deals-lenses";
import { HEAT_LABELS, type HeatState } from "@/lib/deals/velocity";
import { chipTabClass, FF_CHIP_TAB_GROUP } from "@/lib/ui/chip-tabs";
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
  const scope = parseDealScope(href.scope);
  const valueBand = parseValueBand(href.valueBand);
  const base = {
    view: href.view,
    pipeline: href.pipeline,
    family: href.family,
    pcSub: href.pcSub,
    lifeSub: href.lifeSub,
    healthSub: href.healthSub,
    q: href.q,
  };

  return (
    <div className="ff-deals-lenses" data-ff-deals-lenses="">
      <div className="ff-heat-lenses" aria-label="Heat">
        {(["hot", "cooling", "near_cold", "cold"] as const).map((id) => (
          <Link
            key={id}
            href={dealsViewHref({
              ...base,
              heat: heat === id ? null : id,
              lens: href.lens,
              scope: href.scope,
              valueBand: href.valueBand,
            })}
            className={cn("ff-heat-lens", `ff-heat-${id}`, heat === id && "is-on")}
            data-ff-heat-chip={id}
            title={HEAT_LABELS[id]}
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
            href={dealsViewHref({ ...base, heat: href.heat, lens: href.lens, valueBand: href.valueBand, scope: scope === "mine" ? null : "mine" })}
            className={chipTabClass(scope === "mine")}
          >
            Mine
          </Link>
          <Link
            href={dealsViewHref({ ...base, heat: href.heat, lens: href.lens, valueBand: href.valueBand, scope: scope === "team" ? null : "team" })}
            className={chipTabClass(scope === "team" || !scope)}
          >
            Team
          </Link>
        </div>
      ) : null}
      <div className={FF_CHIP_TAB_GROUP} aria-label="Saved lenses">
        <Link
          href={dealsViewHref({
            ...base,
            heat: href.heat,
            lens: href.lens,
            scope: href.scope,
            valueBand: valueBand === "high" ? null : "high",
          })}
          className={chipTabClass(valueBand === "high")}
        >
          High value
        </Link>
        {DEAL_LENSES.map((item) => (
          <Link
            key={item.id}
            href={dealsViewHref({
              ...base,
              lens: lens === item.id ? null : item.id,
              heat: null,
              scope: null,
              valueBand: null,
            })}
            className={chipTabClass(lens === item.id)}
            data-ff-deal-lens={item.id}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
