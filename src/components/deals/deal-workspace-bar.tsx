import Link from "next/link";
import type { DeskLineSettings } from "@/lib/desk/line-settings";
import {
  dealsHref,
  parsePipelineView,
  pipelineTabLabel,
  type PipelineViewId,
} from "@/lib/wire/pipeline";

type BoardTab = { slug: string; name: string };

const VIEWS: Array<[PipelineViewId, string]> = [
  ["table", "Table"],
  ["board", "Board"],
  ["funnel", "Funnel"],
];

const ACTIVE_SLUGS = ["p-c", "health", "life"] as const;
const CLOSED_SLUGS = ["won-lost", "archive"] as const;
const SKIP_SLUGS = new Set(["law", "legal", "flood"]);
const PC_SUBS = [
  { id: "home", label: "Home" },
  { id: "auto", label: "Auto" },
  { id: "flood", label: "Flood" },
  { id: "commercial", label: "Commercial" },
] as const;

function chipClass(on: boolean) {
  return on
    ? "rounded-md bg-primary px-2.5 py-1 text-primary-foreground"
    : "rounded-md border border-border bg-card px-2.5 py-1 text-navy hover:border-primary";
}

export function DealWorkspaceBar({
  boards,
  pipeline,
  view,
  stage,
  family,
  pcSub,
  lifeSub,
  healthSub,
  attention,
  settings,
}: {
  boards: BoardTab[];
  pipeline?: string | null;
  view?: string | null;
  stage?: string | null;
  family?: string | null;
  pcSub?: string | null;
  lifeSub?: string | null;
  healthSub?: string | null;
  attention?: string | null;
  settings: DeskLineSettings;
}) {
  const parsedView = parsePipelineView(view);
  const extras = {
    view: parsedView === "table" ? null : parsedView,
    stage,
    family: pipeline ? null : family,
    pcSub,
    lifeSub,
    healthSub,
    attention,
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
    <div className="mb-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Link href={dealsHref({ ...extras, pipeline: null, pcSub: null, lifeSub: null, healthSub: null })} className={chipClass(!pipeline)}>
          All
        </Link>
        {left.map((item) => (
          <Link
            key={item.slug}
            href={dealsHref({
              ...extras,
              pipeline: item.slug,
              family: null,
              lifeSub: item.slug === "life" ? lifeSub : null,
              healthSub: item.slug === "health" ? healthSub : null,
              pcSub: item.slug === "p-c" ? pcSub : null,
            })}
            className={chipClass(item.slug === pipeline)}
          >
            {pipelineTabLabel(item)}
          </Link>
        ))}
        {right.length > 0 ? <span className="mx-1 h-6 w-px self-center bg-border" aria-hidden /> : null}
        {right.map((item) => (
          <Link
            key={item.slug}
            href={dealsHref({
              ...extras,
              pipeline: item.slug,
              family: null,
              lifeSub: null,
              healthSub: null,
              pcSub: null,
            })}
            className={chipClass(item.slug === pipeline)}
          >
            {pipelineTabLabel(item)}
          </Link>
        ))}
        <span className="ml-auto flex items-center gap-3" data-testid="deal-pipeline-views" aria-label="Pipeline">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Pipeline
          </span>
          {VIEWS.map(([id, label]) => (
            <Link
              key={id}
              href={dealsHref({
                ...extras,
                pipeline: pipeline || (id === "table" ? null : "p-c"),
                view: id,
                stage: id === "table" ? stage : null,
              })}
              className={parsedView === id ? "font-semibold text-primary" : "text-muted-foreground"}
            >
              {label}
            </Link>
          ))}
        </span>
      </div>
      {subtypeChips.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 text-sm" aria-label="Subtype">
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
                href={dealsHref({
                  ...extras,
                  pipeline,
                  family: null,
                  pcSub: item.key === "pcSub" && !on ? item.id : null,
                  healthSub: item.key === "healthSub" && !on ? item.id : null,
                  lifeSub: item.key === "lifeSub" && !on ? item.id : null,
                })}
                className={chipClass(on)}
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
