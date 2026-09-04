import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { StagePill } from "@/components/fit-badge";
import { archiveWonDeal, moveDealOnBoard } from "@/app/actions/pipeline";
import {
  addPipelineStage,
  createPipelineDeal,
  deletePipelineStage,
  relabelPipelineStage,
} from "@/app/actions/pipeline-admin";
import { getPipelineBoard } from "@/lib/db/queries";
import { pipelineHref } from "@/lib/wire/pipeline";
import { currentDeskSession } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Col } from "@/components/column-picker";

export const dynamic = "force-dynamic";

export default async function PipelinePage({
  searchParams,
}: {
  searchParams: Promise<{ pipeline?: string; view?: string }>;
}) {
  const { pipeline: slug, view } = await searchParams;
  const data = await getPipelineBoard(slug || "p-c");
  const session = await currentDeskSession();
  if (!data) {
    return (
      <AppShell title="Pipeline">
        <p className="text-sm text-muted-foreground">No pipelines seeded yet. Run db:seed.</p>
      </AppShell>
    );
  }
  const { board, boards, cards } = data;
  const tableView = view === "table";

  return (
    <AppShell title={`${board.name} pipeline`}>
      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
        {boards.map((item) => (
          <Link
            key={item.id}
            href={`${pipelineHref(item.slug)}${tableView ? "&view=table" : ""}`}
            className={
              item.slug === board.slug
                ? "rounded-md bg-primary px-2.5 py-1 text-primary-foreground"
                : "rounded-md border border-border bg-card px-2.5 py-1 text-navy hover:border-primary"
            }
          >
            {item.name}
            {item.slug === "won-lost" ? " / ARCHIVE" : ""}
            {!item.seeded ? " · admin" : ""}
          </Link>
        ))}
        <span className="ml-auto flex gap-2">
          <Link
            href={`${pipelineHref(board.slug)}`}
            className={!tableView ? "font-semibold text-primary" : "text-muted-foreground"}
          >
            Columns
          </Link>
          <Link
            href={`${pipelineHref(board.slug)}&view=table`}
            className={tableView ? "font-semibold text-primary" : "text-muted-foreground"}
          >
            Table
          </Link>
        </span>
      </div>

      <form action={createPipelineDeal} className="mb-4 flex flex-wrap items-end gap-2 rounded-md border border-border bg-card p-3">
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

      {session.isAdmin ? (
        <details className="mb-4 rounded-md border border-border bg-card p-3 text-sm">
          <summary className="cursor-pointer font-medium text-navy">Admin · stages</summary>
          <form action={addPipelineStage} className="mt-3 flex flex-wrap gap-2">
            <input type="hidden" name="pipelineId" value={board.id} />
            <Input name="name" required placeholder="New stage name" className="h-8 w-44" />
            <Button type="submit" size="sm" variant="outline">
              Add stage
            </Button>
          </form>
          <ul className="mt-3 space-y-2">
            {board.stages.map((stage) => (
              <li key={stage.id} className="flex flex-wrap items-center gap-2">
                <form action={relabelPipelineStage} className="flex items-center gap-2">
                  <input type="hidden" name="stageId" value={stage.id} />
                  <Input name="name" defaultValue={stage.name} className="h-8 w-40" />
                  <button type="submit" className="text-xs text-primary hover:underline">
                    Relabel
                  </button>
                </form>
                {!stage.seeded ? (
                  <form action={deletePipelineStage}>
                    <input type="hidden" name="stageId" value={stage.id} />
                    <button type="submit" className="text-xs text-destructive hover:underline">
                      Delete
                    </button>
                  </form>
                ) : (
                  <span className="text-[11px] text-muted-foreground">seeded</span>
                )}
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      {tableView ? (
        <section className="ff-card overflow-hidden">
          <table className="ff-table">
            <thead>
              <tr>
                <Col table="pipeline" col="title" as="th">Deal</Col>
                <Col table="pipeline" col="stage" as="th">Stage</Col>
                <Col table="pipeline" col="line" as="th">Line</Col>
              </tr>
            </thead>
            <tbody>
              {cards.map((deal) => (
                <tr key={deal.id}>
                  <Col table="pipeline" col="title">
                    <Link href={`/deals/${deal.id}`} className="font-medium text-primary hover:underline">
                      {deal.title}
                    </Link>
                  </Col>
                  <Col table="pipeline" col="stage" sortValue={deal.pipelineStage}>
                    <StagePill stage={deal.pipelineStage} />
                  </Col>
                  <Col table="pipeline" col="line">{deal.lineOfBusiness}</Col>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {board.stages.map((stage) => {
            const column = cards.filter(
              (deal) =>
                (deal.pipelineStageSlug || deal.pipelineStage) === stage.slug ||
                (stage.slug === "closed_won" && deal.pipelineStage === "bound" && !deal.archivedAt) ||
                (stage.slug === "quote_sent" && deal.pipelineStage === "quote_sent") ||
                (stage.slug === "archive" && Boolean(deal.archivedAt)),
            );
            return (
              <section key={stage.id} className="ff-card overflow-hidden">
                <div className="border-b border-border px-3 py-2 text-sm font-semibold text-navy">
                  {stage.name}
                </div>
                {column.length === 0 ? (
                  <p className="px-3 py-4 text-xs text-muted-foreground">Empty.</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {column.map((deal) => (
                      <li key={deal.id} className="px-3 py-2 text-sm">
                        <Link href={`/deals/${deal.id}`} className="font-medium text-primary hover:underline">
                          {deal.title}
                        </Link>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <StagePill stage={deal.pipelineStage} />
                          {stage.slug === "closed_won" ? (
                            <form action={archiveWonDeal}>
                              <input type="hidden" name="dealId" value={deal.id} />
                              <button type="submit" className="text-[11px] text-primary hover:underline">
                                Move to ARCHIVE
                              </button>
                            </form>
                          ) : null}
                          {stage.slug !== "closed_won" && stage.slug !== "archive" ? (
                            <form action={moveDealOnBoard} className="flex items-center gap-1">
                              <input type="hidden" name="dealId" value={deal.id} />
                              <input type="hidden" name="pipelineSlug" value={board.slug} />
                              <select
                                name="stageSlug"
                                defaultValue={stage.slug}
                                className="h-7 rounded border border-input bg-card px-1 text-[11px]"
                              >
                                {board.stages.map((option) => (
                                  <option key={option.slug} value={option.slug}>
                                    {option.name}
                                  </option>
                                ))}
                              </select>
                              <button type="submit" className="text-[11px] text-primary hover:underline">
                                Move
                              </button>
                            </form>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
