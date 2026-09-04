import Link from "next/link";
import { createPipelineDeal } from "@/app/actions/pipeline-admin";
import { AppShell } from "@/components/app-shell";
import { BookFilterBar } from "@/components/desk/book-filter-bar";
import { PipelineWorkspace } from "@/components/pipeline/workspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requireSignedIn } from "@/lib/auth/guards";
import { getPipelineBoard } from "@/lib/db/queries";
import { lineForPipelineSlug } from "@/lib/desk/line-settings";
import {
  pipelineHref,
  pipelinePageTitle,
  pipelineTabLabel,
} from "@/lib/wire/pipeline";
import { presentPipelineCard } from "@/lib/wire/pipeline-cards";

export const dynamic = "force-dynamic";

export default async function PipelinePage({
  searchParams,
}: {
  searchParams: Promise<{ pipeline?: string; view?: string; lifeSub?: string; healthSub?: string }>;
}) {
  const session = await requireSignedIn();
  const { pipeline: slug, view, lifeSub, healthSub } = await searchParams;
  const data = await getPipelineBoard(slug || "p-c", { lifeSub, healthSub });
  if (!data) {
    return (
      <AppShell title="Pipeline">
        <p className="text-sm text-muted-foreground">No pipelines seeded yet. Run db:seed.</p>
      </AppShell>
    );
  }
  const { board, boards, cards, lineSettings } = data;
  const tableView = view === "table";
  const presented = cards.map(presentPipelineCard);
  const subQuery =
    (lifeSub ? `&lifeSub=${encodeURIComponent(lifeSub)}` : "") +
    (healthSub ? `&healthSub=${encodeURIComponent(healthSub)}` : "");

  return (
    <AppShell title={pipelinePageTitle(board)}>
      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
        {boards.map((item) => (
          <Link
            key={item.id}
            href={`${pipelineHref(item.slug, tableView ? "table" : undefined)}${item.slug === board.slug ? subQuery : ""}`}
            className={
              item.slug === board.slug
                ? "rounded-md bg-primary px-2.5 py-1 text-primary-foreground"
                : "rounded-md border border-border bg-card px-2.5 py-1 text-navy hover:border-primary"
            }
          >
            {pipelineTabLabel(item)}
          </Link>
        ))}
        <span className="ml-auto flex gap-2">
          <Link
            href={`${pipelineHref(board.slug)}${subQuery}`}
            className={!tableView ? "font-semibold text-primary" : "text-muted-foreground"}
          >
            Board
          </Link>
          <Link
            href={`${pipelineHref(board.slug, "table")}${subQuery}`}
            className={tableView ? "font-semibold text-primary" : "text-muted-foreground"}
          >
            Table
          </Link>
        </span>
      </div>

      {board.slug === "life" || board.slug === "health" ? (
        <BookFilterBar
          action="/pipeline"
          settings={lineSettings}
          family={board.slug}
          lifeSub={lifeSub}
          healthSub={healthSub}
          hideFamily
          hidden={{
            pipeline: board.slug,
            ...(tableView ? { view: "table" } : {}),
          }}
        />
      ) : null}

      <form
        action={createPipelineDeal}
        className="mb-4 flex flex-wrap items-end gap-2 rounded-md border border-border bg-card p-3"
      >
        <input type="hidden" name="pipelineSlug" value={board.slug} />
        <input type="hidden" name="lineOfBusiness" value={lineForPipelineSlug(board.slug)} />
        <Input name="title" required placeholder="New deal title" className="h-8 w-56" />
        {board.slug === "life" ? (
          <select name="policySubType" className="h-8 rounded-md border border-input bg-card px-2 text-sm">
            <option value="">Life type</option>
            {lineSettings.lifeOptions.map((option) => (
              <option key={option.slug} value={option.label}>
                {option.label}
              </option>
            ))}
          </select>
        ) : null}
        {board.slug === "health" ? (
          <select name="policySubType" className="h-8 rounded-md border border-input bg-card px-2 text-sm">
            <option value="">Health type</option>
            {lineSettings.healthOptions.map((option) => (
              <option key={option.slug} value={option.label}>
                {option.label}
              </option>
            ))}
          </select>
        ) : null}
        <select name="stageSlug" className="h-8 rounded-md border border-input bg-card px-2 text-sm">
          {board.stages.map((stage) => (
            <option key={stage.slug} value={stage.slug}>
              {stage.name}
            </option>
          ))}
        </select>
        <Button type="submit" size="sm">
          Create deal
        </Button>
      </form>

      <PipelineWorkspace
        canEditStages={session.isAdmin}
        board={{
          id: board.id,
          slug: board.slug,
          name: board.name,
          kind: board.kind,
          seeded: board.seeded,
          stages: board.stages.map((stage) => ({
            id: stage.id,
            slug: stage.slug,
            name: stage.name,
            sortOrder: stage.sortOrder,
            seeded: stage.seeded,
          })),
        }}
        cards={presented}
        tableView={tableView}
      />
    </AppShell>
  );
}
