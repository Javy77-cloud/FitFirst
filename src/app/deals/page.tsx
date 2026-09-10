import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { SavedToast } from "@/components/desk/saved-toast";
import { buttonVariants } from "@/components/ui/button";
import { DealWorkspaceBar } from "@/components/deals/deal-workspace-bar";
import { DealWorkQueuePanel } from "@/components/deals/deal-work-queue-panel";
import { DealsTable } from "@/components/deals/deals-table";
import { TodayActivityStrip } from "@/components/deals/today-activity-strip";
import { PipelineWorkspace } from "@/components/pipeline/workspace";
import { requireSignedIn } from "@/lib/auth/guards";
import { loadDealPipelineDesk } from "@/lib/deals/pipeline-desk-data";
import {
  getPipelineBoard,
  listBoundPendingDeals,
  listDeals,
  listUsers,
  type DealListFilter,
} from "@/lib/db/queries";
import { loadDeskLineSettings } from "@/lib/db/line-settings";
import { cn } from "@/lib/utils";
import { isPipelineSheetView, parsePipelineView } from "@/lib/wire/pipeline";
import { presentPipelineCard } from "@/lib/wire/pipeline-cards";
import { listModuleTags } from "@/app/actions/record-tags";
import { readDefaultPipelineView } from "@/app/actions/pipeline-view-prefs";

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
  const viewParam = first(params.view);
  const savedDefaultView = await readDefaultPipelineView();
  const view = parsePipelineView(viewParam ?? savedDefaultView ?? undefined);
  const stage = first(params.stage);
  const q = first(params.q) ?? "";
  const queue = first(params.queue);
  const filter: DealListFilter = {
    stage,
    attention: first(params.attention),
    family: first(params.family),
    pcSub: first(params.pcSub),
    lifeSub: first(params.lifeSub),
    healthSub: first(params.healthSub),
  };
  const boardSlug = pipeline || "p-c";
  const selectedPipeline = pipeline || (isPipelineSheetView(view) ? undefined : "p-c");
  const [boardData, listRows, userRows, lineSettings, desk, tagCatalog] = await Promise.all([
    getPipelineBoard(boardSlug, {
      lifeSub: filter.lifeSub,
      healthSub: filter.healthSub,
      pcSub: pipeline === "p-c" || !pipeline ? filter.pcSub : undefined,
      stage: isPipelineSheetView(view) && pipeline ? stage : undefined,
    }),
    filter.attention === "bound_pending"
      ? listBoundPendingDeals()
      : isPipelineSheetView(view) && !pipeline
        ? listDeals(filter)
        : Promise.resolve(null),
    listUsers(),
    loadDeskLineSettings(),
    loadDealPipelineDesk(queue),
    listModuleTags("deals").catch(() => []),
  ]);
  const boards = boardData?.boards ?? [];
  const settings = boardData?.lineSettings ?? lineSettings;
  const tableRows =
    filter.attention === "bound_pending" || (isPipelineSheetView(view) && !pipeline)
      ? (listRows ?? [])
      : isPipelineSheetView(view) && boardData
        ? boardData.cards
        : [];
  const users = new Map(userRows.map((user) => [user.id, user.name]));
  const agents = userRows.map((user) => ({ id: user.id, name: user.name }));
  const presented = (boardData?.cards ?? []).map(presentPipelineCard);
  const board = boardData?.board ?? null;
  const notice = first(params.notice);
  const saved = first(params.saved) === "1";
  // Tip sep7gn: no list/grid/board/funnel instructional blurbs under the title.
  const hint =
    filter.attention === "bound_pending"
      ? "Bound, waiting on the carrier to issue. No in-force policy on the file."
      : pipeline === "won-lost"
        ? "Closed Won and Closed Lost from every shopping board. Archived is its own tab — parking here does not cancel emails hung on won date."
        : pipeline === "archive"
          ? "Parked deals only. Drag a Closed Won shop here later; won-date emails stay queued."
          : pipeline === "flood"
            ? "Flood shopping. Same stages as the other boards — add, remove, or reorder as Admin."
            : filter.stage
              ? (STAGE_HINT[filter.stage] ?? `Stage · ${filter.stage}`)
              : "";

  return (
    <AppShell
      title="Deals / Pipeline"
      eyebrow=""
      actions={
        <Link href="/deals/new" className={cn(buttonVariants())}>
          New shopping deal
        </Link>
      }
    >
      <SavedToast show={saved} message="Deal saved." listHref="/deals" />
      {hint ? <p className="mb-3 text-sm text-muted-foreground">{hint}</p> : null}
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
      {notice === "selected" ? (
        <p className="mb-3 rounded-md border border-dashed border-border px-3 py-2 text-sm">
          Existing deal selected. Attach files to that record — no duplicate was created.
        </p>
      ) : null}
      {notice === "created" ? (
        <p className="mb-3 rounded-md border border-dashed border-border px-3 py-2 text-sm">
          New deal created. Search for it, then attach files.
        </p>
      ) : null}

      <DealWorkspaceBar
        boards={boards.map((item) => ({ slug: item.slug, name: item.name }))}
        pipeline={selectedPipeline}
        view={view}
        defaultView={savedDefaultView}
        stage={stage}
        family={filter.family}
        pcSub={filter.pcSub}
        lifeSub={filter.lifeSub}
        healthSub={filter.healthSub}
        attention={filter.attention}
        settings={settings}
      />

      {desk.queueType ? <DealWorkQueuePanel type={desk.queueType} items={desk.queueItems} /> : null}

      <div
        className="deal-upload-activity -mt-2 mb-32"
        data-testid="deal-upload-activity"
        style={{
          display: "flex",
          flexDirection: "row",
          flexWrap: "nowrap",
          alignItems: "center",
          gap: 4,
        }}
      >
        <div
          className="deal-today-slot"
          style={{
            flex: 1,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <TodayActivityStrip counts={desk.todayCounts} active={desk.queueType} />
        </div>
      </div>

      {isPipelineSheetView(view) ? (
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
          <DealsTable
            rows={tableRows}
            users={users}
            agents={agents}
            initialQuery={q}
            nextByDeal={desk.nextByDeal}
            mode={view}
          />
        </>
      ) : board ? (
        <PipelineWorkspace
          canEditStages={session.isAdmin}
          agents={agents}
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
          tagCatalog={tagCatalog}
        />
      ) : (
        <p className="text-sm text-muted-foreground">
          No pipeline boards yet. Table still lists every deal on this book.
        </p>
      )}
    </AppShell>
  );
}
