import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { createPipelineDeal } from "@/app/actions/pipeline-admin";
import { PipelineWorkspace } from "@/components/pipeline/workspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getPipelineBoard } from "@/lib/db/queries";
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
  searchParams: Promise<{ pipeline?: string; view?: string }>;
}) {
  const { pipeline: slug, view } = await searchParams;
  const data = await getPipelineBoard(slug || "p-c");
  if (!data) {
    return (
      <AppShell title="Pipeline">
        <p className="text-sm text-muted-foreground">No pipelines seeded yet. Run db:seed.</p>
      </AppShell>
    );
  }
  const { board, boards, cards } = data;
  const tableView = view === "table";
  const presented = cards.map(presentPipelineCard);

  return (
    <AppShell title={pipelinePageTitle(board)}>
      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
        {boards.map((item) => (
          <Link
            key={item.id}
            href={pipelineHref(item.slug, tableView ? "table" : undefined)}
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
            href={pipelineHref(board.slug)}
            className={!tableView ? "font-semibold text-primary" : "text-muted-foreground"}
          >
            Board
          </Link>
          <Link
            href={pipelineHref(board.slug, "table")}
            className={tableView ? "font-semibold text-primary" : "text-muted-foreground"}
          >
            Table
          </Link>
        </span>
      </div>

      <form
        action={createPipelineDeal}
        className="mb-4 flex flex-wrap items-end gap-2 rounded-md border border-border bg-card p-3"
      >
        <input type="hidden" name="pipelineSlug" value={board.slug} />
        <Input name="title" required placeholder="New deal title" className="h-8 w-56" />
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
