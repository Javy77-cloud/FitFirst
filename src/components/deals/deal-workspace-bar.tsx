import Link from "next/link";
import { BookFilterBar } from "@/components/desk/book-filter-bar";
import { StagePill } from "@/components/fit-badge";
import type { DeskLineSettings } from "@/lib/desk/line-settings";
import { cn } from "@/lib/utils";
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
  const showBookBar =
    !pipeline || pipeline === "p-c" || pipeline === "life" || pipeline === "health" || pipeline === "flood";
  const hideFamily = Boolean(pipeline);
  const boardFamily = pipeline === "life" || pipeline === "health" ? pipeline : family;

  return (
    <div className="mb-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Link
          href={dealsHref({ ...extras, pipeline: null })}
          className={
            !pipeline
              ? "rounded-md bg-primary px-2.5 py-1 text-primary-foreground"
              : "rounded-md border border-border bg-card px-2.5 py-1 text-navy hover:border-primary"
          }
        >
          All
        </Link>
        {boards.map((item) => (
          <Link
            key={item.slug}
            href={dealsHref({
              ...extras,
              pipeline: item.slug,
              family: null,
              lifeSub: item.slug === pipeline ? lifeSub : null,
              healthSub: item.slug === pipeline ? healthSub : null,
              pcSub: item.slug === "p-c" || item.slug === pipeline ? pcSub : null,
            })}
            className={
              item.slug === pipeline
                ? "rounded-md bg-primary px-2.5 py-1 text-primary-foreground"
                : "rounded-md border border-border bg-card px-2.5 py-1 text-navy hover:border-primary"
            }
          >
            {pipelineTabLabel(item)}
          </Link>
        ))}
        <span className="ml-auto flex gap-3">
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
      {showBookBar ? (
        <BookFilterBar
          action="/deals"
          settings={settings}
          family={boardFamily ?? undefined}
          pcSub={pcSub ?? undefined}
          lifeSub={lifeSub ?? undefined}
          healthSub={healthSub ?? undefined}
          hideFamily={hideFamily}
          hidden={{
            ...(pipeline ? { pipeline } : {}),
            ...(parsedView !== "table" ? { view: parsedView } : {}),
            ...(stage ? { stage } : {}),
            ...(attention ? { attention } : {}),
          }}
        />
      ) : null}
    </div>
  );
}

export function DealStageChips({
  stages,
  pipeline,
  stage,
  lifeSub,
  healthSub,
  pcSub,
  family,
  attention,
}: {
  stages: Array<{ id: string; slug: string; name: string; color?: string | null }>;
  pipeline: string;
  stage?: string | null;
  lifeSub?: string | null;
  healthSub?: string | null;
  pcSub?: string | null;
  family?: string | null;
  attention?: string | null;
}) {
  if (stages.length === 0) return null;
  return (
    <div className="mb-3 flex flex-wrap items-center gap-1.5">
      <span className="mr-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Stages
      </span>
      {stages.map((item) => (
        <Link
          key={item.id}
          href={dealsHref({
            pipeline,
            view: "table",
            stage: item.slug,
            lifeSub,
            healthSub,
            pcSub,
            family,
            attention,
          })}
          className={cn(stage === item.slug && "rounded-sm ring-2 ring-primary")}
        >
          <StagePill stage={item.name} color={item.color} />
        </Link>
      ))}
    </div>
  );
}
