import Link from "next/link";
import type { DeskLineSettings } from "@/lib/desk/line-settings";
import { PipelineViewDefaultStar } from "@/components/deals/pipeline-view-default-star";
import { PipelineViewsMenu } from "@/components/deals/pipeline-views-menu";
import type { PipelineStageBoard, PipelineStageView } from "@/lib/wire/pipeline-cards";
import {
  dealsHref,
  parseRenewalsView,
  pipelineTabLabel,
  type PipelineDeskHrefOpts,
  type PipelineViewId,
  type RenewalsViewId,
} from "@/lib/wire/pipeline";
import { parseDealsView, type DealsViewId } from "@/lib/deals/deals-views";
import { PIPELINE_VIEW_COOKIE, RENEWALS_VIEW_COOKIE, type PipelineViewCookie } from "@/lib/wire/pipeline-view-cookies";
import { chipTabClass, FF_CHIP_TAB_GROUP } from "@/lib/ui/chip-tabs";

type BoardTab = { slug: string; name: string };

const RENEWAL_VIEWS: Array<[RenewalsViewId, string]> = [
  ["board", "Board"],
  ["stack", "Stack"],
  ["list", "List"],
];
const DEAL_VIEWS: Array<[DealsViewId, string]> = [
  ["stack", "Stack"],
  ["radar", "Radar"],
  ["list", "List"],
];

const ACTIVE_SLUGS = ["p-c", "health", "life"] as const;
const CLOSED_SLUGS = ["won-lost", "archive"] as const;
const SKIP_SLUGS = new Set(["law", "legal", "flood", "renewals"]);
const PC_SUBS = [
  { id: "home", label: "Home" },
  { id: "auto", label: "Auto" },
  { id: "flood", label: "Flood" },
  { id: "commercial", label: "Commercial" },
] as const;

function chipClass(on: boolean) {
  return chipTabClass(on);
}

export function DealWorkspaceBar({
  boards,
  pipeline,
  view,
  defaultView = null,
  stage,
  family,
  pcSub,
  lifeSub,
  healthSub,
  attention,
  heat = null,
  lens = null,
  scope = null,
  valueBand = null,
  settings,
  stagePipelineId = null,
  stageRows = [],
  stageBoards = [],
  canEditStages = false,
  hrefBuilder = dealsHref,
  cookieKey = PIPELINE_VIEW_COOKIE,
  boardWhenNoPipeline = "p-c",
}: {
  boards: BoardTab[];
  pipeline?: string | null;
  view?: string | null;
  /** Saved per-agent cookie default (null = system list fallback). */
  defaultView?: PipelineViewId | DealsViewId | RenewalsViewId | null;
  stage?: string | null;
  family?: string | null;
  pcSub?: string | null;
  lifeSub?: string | null;
  healthSub?: string | null;
  attention?: string | null;
  heat?: string | null;
  lens?: string | null;
  scope?: string | null;
  valueBand?: string | null;
  settings: DeskLineSettings;
  /** Active board for stage colors (⋯ menu). */
  stagePipelineId?: string | null;
  stageRows?: PipelineStageView[];
  /** P&C / Life / Health boards so stage colors work from All and every tab. */
  stageBoards?: PipelineStageBoard[];
  canEditStages?: boolean;
  hrefBuilder?: (opts?: PipelineDeskHrefOpts) => string;
  cookieKey?: PipelineViewCookie;
  /** Board/funnel without a selected filter tab. Deals uses p-c; renewals stays on All. */
  boardWhenNoPipeline?: string | null;
}) {
  const isRenewals = cookieKey === RENEWALS_VIEW_COOKIE;
  const parsedView = isRenewals ? parseRenewalsView(view) : parseDealsView(view);
  const viewRows = isRenewals ? RENEWAL_VIEWS : DEAL_VIEWS;
  const extras = {
    view: parsedView,
    stage,
    family: pipeline ? null : family,
    pcSub,
    lifeSub,
    healthSub,
    attention,
    heat,
    lens,
    scope,
    valueBand,
  };
  const bySlug = new Map(boards.filter((item) => !SKIP_SLUGS.has(item.slug)).map((item) => [item.slug, item]));
  const left = ACTIVE_SLUGS.map((slug) => bySlug.get(slug)).filter((item): item is BoardTab => Boolean(item));
  const right = CLOSED_SLUGS.map((slug) => bySlug.get(slug)).filter((item): item is BoardTab => Boolean(item));
  const subtypeChips =
    pipeline === "p-c"
      ? PC_SUBS.map((item) => ({ id: item.id, label: item.label, key: "pcSub" as const }))
      : pipeline === "health"
        ? settings.healthOptions.map((item) => ({ id: item.slug, label: item.label, key: "healthSub" as const }))
        : pipeline === "life"
          ? settings.lifeOptions.map((item) => ({ id: item.slug, label: item.label, key: "lifeSub" as const }))
          : [];

  return (
    <div className="deal-workspace-bar mb-1 space-y-2" data-testid="deal-workspace-bar">
      {/* Chip row: gap-x-4 / gap-x-5 retired; live class is gap-x-6. */}
      <div className="flex flex-wrap items-start gap-x-6 gap-y-2 text-sm">
        <div className="min-w-0 space-y-1.5">
          <div className={FF_CHIP_TAB_GROUP} data-testid="deal-line-filters">
            <Link href={hrefBuilder({ ...extras, pipeline: null, pcSub: null, lifeSub: null, healthSub: null })} className={chipClass(!pipeline)} data-active={!pipeline ? "true" : "false"}>
              All
            </Link>
            {left.map((item) => (
              <Link
                key={item.slug}
                href={hrefBuilder({
                  ...extras,
                  pipeline: item.slug,
                  family: null,
                  lifeSub: item.slug === "life" ? lifeSub : null,
                  healthSub: item.slug === "health" ? healthSub : null,
                  pcSub: item.slug === "p-c" ? pcSub : null,
                })}
                className={chipClass(item.slug === pipeline)} data-active={item.slug === pipeline ? "true" : "false"}
              >
                {pipelineTabLabel(item)}
              </Link>
            ))}
          </div>
          {right.length > 0 ? (
            <div
              className="flex items-center justify-start gap-3 text-[11px] text-muted-foreground"
              data-testid="deal-closed-filters"
              data-ff-deal-closed-quiet=""
              data-ff-closed-under-strip=""
            >
              {right.map((item) => (
                <Link
                  key={item.slug}
                  href={hrefBuilder({
                    ...extras,
                    pipeline: item.slug,
                    family: null,
                    lifeSub: null,
                    healthSub: null,
                    pcSub: null,
                  })}
                  className={
                    item.slug === pipeline
                      ? "font-semibold text-navy underline-offset-2"
                      : "hover:text-navy hover:underline"
                  }
                  data-active={item.slug === pipeline ? "true" : "false"}
                >
                  {pipelineTabLabel(item)}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
        <span
          className={`ml-auto ${FF_CHIP_TAB_GROUP}`}
          data-testid="deal-pipeline-views"
          aria-label={isRenewals ? "Board Stack List" : "Stack Radar List"}
        >
          {viewRows.map(([id, label]) => (
            <Link
              key={id}
              href={hrefBuilder({
                ...extras,
                pipeline: pipeline || (isRenewals ? boardWhenNoPipeline : pipeline),
                view: id,
              })}
              className={chipTabClass(parsedView === id)}
              data-active={parsedView === id ? "true" : "false"}
            >
              {label}
            </Link>
          ))}
          <PipelineViewDefaultStar currentView={parsedView} defaultView={defaultView ?? null} cookieKey={cookieKey} />
          <PipelineViewsMenu
            pipelineId={stagePipelineId}
            stages={stageRows}
            stageBoards={stageBoards}
            canEditStages={canEditStages}
          />
        </span>
      </div>
      {subtypeChips.length > 0 ? (
        <div className={FF_CHIP_TAB_GROUP} aria-label="Subtype">
          {subtypeChips.map((item) => {
            const on =
              item.key === "pcSub"
                ? pcSub === item.id
                : item.key === "healthSub"
                  ? healthSub === item.id
                  : lifeSub === item.id;
            return (
              <Link
                key={`${item.key}-${item.id}`}
                href={hrefBuilder({
                  ...extras,
                  pipeline,
                  family: null,
                  pcSub: item.key === "pcSub" && !on ? item.id : null,
                  healthSub: item.key === "healthSub" && !on ? item.id : null,
                  lifeSub: item.key === "lifeSub" && !on ? item.id : null,
                })}
                className={chipClass(on)} data-active={on ? "true" : "false"}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
