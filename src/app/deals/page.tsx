import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { buttonVariants } from "@/components/ui/button";
import { DealDocsUpload } from "@/components/deal/deal-docs-upload";
import { DealStageChips, DealWorkspaceBar } from "@/components/deals/deal-workspace-bar";
import { DealsTable } from "@/components/deals/deals-table";
import { PipelineCreateDealForm } from "@/components/pipeline/create-deal-form";
import { PipelineWorkspace } from "@/components/pipeline/workspace";
import { requireSignedIn } from "@/lib/auth/guards";
import {
  getPipelineBoard,
  listBoundPendingDeals,
  listDealLookup,
  listDeals,
  listPartyTypeahead,
  listUsersById,
  type DealListFilter,
} from "@/lib/db/queries";
import { loadDeskLineSettings } from "@/lib/db/line-settings";
import { lineForPipelineSlug } from "@/lib/desk/line-settings";
import { cn } from "@/lib/utils";
import { parsePipelineView } from "@/lib/wire/pipeline";
import { presentPipelineCard } from "@/lib/wire/pipeline-cards";

export const dynamic = "force-dynamic";

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

const STAGE_HINT: Record<string, string> = {
  open: "Open quotes — shopping, quoting, comparing.",
  quote_sent: "Quote sent. Still not coverage.",
  won: "Closed won / bound this book. Issue may still be outstanding.",
};

export default async function DealsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireSignedIn();
  const params = await searchParams;
  const pipeline = first(params.pipeline);
  const view = parsePipelineView(first(params.view));
  const stage = first(params.stage);
  const filter: DealListFilter = {
    stage,
    attention: first(params.attention),
    family: first(params.family),
    pcSub: first(params.pcSub),
    lifeSub: first(params.lifeSub),
    healthSub: first(params.healthSub),
  };
  const boardSlug = pipeline || "p-c";
  const selectedPipeline = pipeline || (view === "table" ? undefined : "p-c");
  const [boardData, listRows, users, lineSettings, lookup, parties] = await Promise.all([
    getPipelineBoard(boardSlug, {
      lifeSub: filter.lifeSub,
      healthSub: filter.healthSub,
      pcSub: pipeline === "p-c" || !pipeline ? filter.pcSub : undefined,
      stage: view === "table" && pipeline ? stage : undefined,
    }),
    filter.attention === "bound_pending"
      ? listBoundPendingDeals()
      : view === "table" && !pipeline
        ? listDeals(filter)
        : Promise.resolve(null),
    listUsersById(),
    loadDeskLineSettings(),
    listDealLookup(),
    listPartyTypeahead(),
  ]);
  const boards = boardData?.boards ?? [];
  const settings = boardData?.lineSettings ?? lineSettings;
  const tableRows =
    filter.attention === "bound_pending" || (view === "table" && !pipeline)
      ? (listRows ?? [])
      : view === "table" && boardData
        ? boardData.cards
        : [];
  const presented = (boardData?.cards ?? []).map(presentPipelineCard);
  const board = boardData?.board ?? null;
  const notice = first(params.notice);
  const hint =
    filter.attention === "bound_pending"
      ? "Bound, waiting on the carrier to issue. No in-force policy on the file."
      : pipeline === "won-lost"
        ? "Closed Won and Closed Lost from every shopping board. Archive is its own tab — parking here does not cancel emails hung on won date."
        : pipeline === "archive"
          ? "Parked deals only. Drag a Closed Won shop here later; won-date emails stay queued."
          : pipeline === "flood"
            ? "Flood shopping. Same stages as the other boards — add, remove, or reorder as Admin."
            : view === "funnel"
              ? "Counts by stage. Click a bar to open the table for that stage."
              : view === "board"
                ? "Drag deals between columns. Use the up/down arrow on a stage header to fold it. Call or schedule a meeting from the card."
                : filter.stage
                  ? (STAGE_HINT[filter.stage] ?? `Stage · ${filter.stage}`)
                  : "Deals and the pipeline are the same book. Table is the list. Board and Funnel sit on the same filters — P&C, Health, Life, Flood, Won-Lost, Archive. Quotes are not coverage.";

  return (
    <AppShell
      title="Deals"
      actions={
        <Link href="/deals/new" className={cn(buttonVariants())}>
          New shopping deal
        </Link>
      }
    >
      <p className="mb-3 text-sm text-muted-foreground">{hint}</p>
      {notice === "need-deal" ? (
        <p className="mb-3 rounded-md border border-dashed border-border px-3 py-2 text-sm">
          Choose an existing Deal (person or business name) before files are stored.
        </p>
      ) : null}
      {notice === "no-files" ? (
        <p className="mb-3 rounded-md border border-dashed border-border px-3 py-2 text-sm">
          Add at least one file on a line.
        </p>
      ) : null}

      <DealWorkspaceBar
        boards={boards.map((item) => ({ slug: item.slug, name: item.name }))}
        pipeline={selectedPipeline}
        view={view}
        stage={stage}
        family={filter.family}
        pcSub={filter.pcSub}
        lifeSub={filter.lifeSub}
        healthSub={filter.healthSub}
        attention={filter.attention}
        settings={settings}
      />

      {board && board.kind === "shopping" && (pipeline || view !== "table") ? (
        <PipelineCreateDealForm
          parties={parties}
          pipelineSlug={board.slug}
          lineOfBusiness={lineForPipelineSlug(board.slug)}
          lifeOptions={settings.lifeOptions}
          healthOptions={settings.healthOptions}
          stages={board.stages}
        />
      ) : null}

      {board && pipeline ? (
        <DealStageChips
          stages={board.stages}
          pipeline={board.slug}
          stage={stage}
          lifeSub={filter.lifeSub}
          healthSub={filter.healthSub}
          pcSub={filter.pcSub}
          family={filter.family}
          attention={filter.attention}
        />
      ) : null}

      {view === "table" ? (
        <>
          {pipeline ||
          filter.stage ||
          filter.attention ||
          filter.family ||
          filter.lifeSub ||
          filter.healthSub ||
          filter.pcSub ? (
            <p className="mb-3 text-sm">
              <Link href="/deals" className="text-primary hover:underline">
                Clear filter
              </Link>
            </p>
          ) : null}
          <div className="mb-4">
            <DealDocsUpload deals={lookup} parties={parties} />
          </div>
          <DealsTable rows={tableRows} users={users} />
        </>
      ) : board ? (
        <PipelineWorkspace
          canEditStages={session.isAdmin}
          board={{
            id: board.id,
            slug: board.slug,
            name: board.name,
            kind: board.kind,
            seeded: board.seeded,
            stages: board.stages.map((item) => ({
              id: item.id,
              slug: item.slug,
              name: item.name,
              sortOrder: item.sortOrder,
              color: item.color,
              seeded: item.seeded,
            })),
          }}
          cards={presented}
          view={view}
          stageFilter={stage}
        />
      ) : (
        <p className="text-sm text-muted-foreground">
          No pipeline boards yet. Table still lists every deal on this book.
        </p>
      )}
    </AppShell>
  );
}
