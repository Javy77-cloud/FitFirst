import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { StagePill } from "@/components/fit-badge";
import { archiveWonDeal, moveDealOnBoard } from "@/app/actions/pipeline";
import { getPipelineBoard } from "@/lib/db/queries";
import { pipelineHref } from "@/lib/wire/pipeline";

export const dynamic = "force-dynamic";

export default async function PipelinePage({
  searchParams,
}: {
  searchParams: Promise<{ pipeline?: string }>;
}) {
  const { pipeline: slug } = await searchParams;
  const data = await getPipelineBoard(slug || "p-c");
  if (!data) {
    return (
      <AppShell title="Pipeline">
        <p className="text-sm text-muted-foreground">No pipelines seeded yet. Run db:seed.</p>
      </AppShell>
    );
  }
  const { board, boards, cards } = data;

  return (
    <AppShell title={`${board.name} pipeline`}>
      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        {boards.map((item) => (
          <Link
            key={item.id}
            href={pipelineHref(item.slug)}
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
      </div>
      <p className="mb-4 text-xs text-muted-foreground">
        Real links — P-C, Health, Life, Won-Lost/ARCHIVE, plus Flood (admin-added). Closed Won
        writes a Policy. Moving a won deal to ARCHIVE later does not cancel emails hung on won
        date.
      </p>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {board.stages.map((stage) => {
          const column = cards.filter((deal) => (deal.pipelineStageSlug || deal.pipelineStage) === stage.slug
            || (stage.slug === "closed_won" && deal.pipelineStage === "bound" && !deal.archivedAt)
            || (stage.slug === "quote_sent" && deal.pipelineStage === "quote_sent")
            || (stage.slug === "archive" && Boolean(deal.archivedAt)));
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
    </AppShell>
  );
}
