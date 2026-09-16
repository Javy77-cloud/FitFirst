import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { SavedToast } from "@/components/desk/saved-toast";
import { DealWorkspaceBar } from "@/components/deals/deal-workspace-bar";
import { DealWorkQueuePanel } from "@/components/deals/deal-work-queue-panel";
import { AddNewDealDialog } from "@/components/deals/add-new-deal-dialog";
import { DealsTable } from "@/components/deals/deals-table";
import { TodayActivityStrip } from "@/components/deals/today-activity-strip";
import { PipelineWorkspace } from "@/components/pipeline/workspace";
import { PipelineBookModeToggle } from "@/components/pipeline/book-mode-toggle";
import { RenewalsDesk } from "@/components/renewals/renewals-desk";
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
import { EDITABLE_DEAL_PIPELINE_SLUGS, isPipelineSheetView, parsePipelineView } from "@/lib/wire/pipeline";
import { presentPipelineCard } from "@/lib/wire/pipeline-cards";
import { listModuleTags } from "@/app/actions/record-tags";
import { readDefaultPipelineView } from "@/app/actions/pipeline-view-prefs";
import { PipelineFilterPopover } from "@/components/filters/pipeline-filter-popover";
import { loadPageFilterPrefs } from "@/lib/page-filters/store";
import {
  buildDealPipelineFilterFields,
  DEAL_PIPELINE_FILTER_KEYS,
  DEAL_PIPELINE_PRESERVE_PARAMS,
  matchesDealPipelineColumnFilters,
} from "@/lib/deals/pipeline-column-filters";
import { pickFilterParams } from "@/lib/saved-filters";

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
  const book = first(params.book) === "renewals" ? "renewals" : "new";
  if (book === "renewals") {
    return (
      <AppShell title="Deals / Pipeline" eyebrow="">
        <RenewalsDesk searchParams={params} canEditStages={session.isAdmin} />
      </AppShell>
    );
  }
  const viewParam = first(params.view);
  const savedDefaultView = await readDefaultPipelineView();
  const view = parsePipelineView(viewParam ?? savedDefaultView ?? undefined);
  const stage = first(params.stage);
  const q = first(params.q) ?? "";
  const queue = first(params.queue);
  const columnFilter = pickFilterParams(params, [...DEAL_PIPELINE_FILTER_KEYS]);
  const filter: DealListFilter = {
    stage: columnFilter.stage ?? stage,
    attention: first(params.attention),
    family: first(params.family),
    pcSub: first(params.pcSub),
    lifeSub: first(params.lifeSub),
    healthSub: first(params.healthSub),
    ownerId: columnFilter.assigned,
  };
  const boardSlug = pipeline || "p-c";
  const selectedPipeline = pipeline || undefined;
  const [boardData, listRows, userRows, lineSettings, desk, tagCatalog, pageFilterPrefs] = await Promise.all([
    getPipelineBoard(boardSlug, {
      lifeSub: filter.lifeSub,
      healthSub: filter.healthSub,
      pcSub: pipeline === "p-c" ? filter.pcSub : undefined,
      stage: isPipelineSheetView(view) && pipeline ? stage : undefined,
    }),
    filter.attention === "bound_pending"
      ? listBoundPendingDeals()
      : !pipeline
        ? listDeals(filter)
        : Promise.resolve(null),
    listUsers(),
    loadDeskLineSettings(),
    loadDealPipelineDesk(queue),
    listModuleTags("deals").catch(() => []),
    loadPageFilterPrefs("deals-pipeline"),
  ]);
  const boards = boardData?.boards ?? [];
  const settings = boardData?.lineSettings ?? lineSettings;
  const users = new Map(userRows.map((user) => [user.id, user.name]));
  const agents = userRows.map((user) => ({ id: user.id, name: user.name }));
  const board = boardData?.board ?? null;
  const rawTableRows =
    filter.attention === "bound_pending" || !pipeline
      ? (listRows ?? [])
      : isPipelineSheetView(view) && boardData
        ? boardData.cards
        : [];
  const tableRows = rawTableRows.filter((row) =>
    matchesDealPipelineColumnFilters(row.deal, columnFilter),
  );
  const boardCards = (
    !pipeline && listRows
      ? listRows
      : (boardData?.cards ?? [])
  ).filter((row) => matchesDealPipelineColumnFilters(row.deal, columnFilter));
  const presented = boardCards.map(presentPipelineCard);
  const optionDeals = [
    ...boardCards.map((row) => row.deal),
    ...(listRows ?? []).map((row) => row.deal),
  ];
  const pipelineFilterFields = buildDealPipelineFilterFields({
    deals: optionDeals,
    agents,
    stages: [
      ...(board?.stages ?? []).map((item) => ({ slug: item.slug, name: item.name })),
      ...(boardData?.boards ?? []).flatMap((item) =>
        item.stages.map((stageRow) => ({ slug: stageRow.slug, name: stageRow.name })),
      ),
    ],
    tags: tagCatalog.map((tag) => tag.name),
    prefs: pageFilterPrefs,
  });
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
    <AppShell title="Deals / Pipeline" eyebrow="">
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

      <div className="mb-4" data-ff-pipeline-book-toggle-wrap="">
        <PipelineBookModeToggle
          mode="new"
          newHref="/deals?view=list"
          renewalsHref="/renewals"
        />
      </div>

      <DealWorkspaceBar
        boards={boards.map((item) => ({ slug: item.slug, name: item.name }))}
        pipeline={selectedPipeline}
        boardWhenNoPipeline={null}
        view={view}
        defaultView={savedDefaultView}
        stage={stage}
        family={filter.family}
        pcSub={filter.pcSub}
        lifeSub={filter.lifeSub}
        healthSub={filter.healthSub}
        attention={filter.attention}
        settings={settings}
        canEditStages={session.isAdmin}
        stagePipelineId={board?.id ?? null}
        stageRows={
          board
            ? board.stages.map((item) => ({
                id: item.id,
                slug: item.slug,
                name: item.name,
                sortOrder: item.sortOrder,
                color: item.color,
                seeded: item.seeded,
              }))
            : []
        }
        stageBoards={(boardData?.boards ?? [])
          .filter((item) =>
            (EDITABLE_DEAL_PIPELINE_SLUGS as readonly string[]).includes(item.slug),
          )
          .map((item) => ({
            id: item.id,
            slug: item.slug,
            name: item.name,
            stages: item.stages.map((stageRow) => ({
              id: stageRow.id,
              slug: stageRow.slug,
              name: stageRow.name,
              sortOrder: stageRow.sortOrder,
              color: stageRow.color,
              seeded: stageRow.seeded,
            })),
          }))}
      />

      {desk.queueType ? <DealWorkQueuePanel type={desk.queueType} items={desk.queueItems} /> : null}

      <div className="deal-upload-activity" data-testid="deal-upload-activity">
        <div className="deal-today-slot">
          <TodayActivityStrip counts={desk.todayCounts} active={desk.queueType} />
        </div>
      </div>

      <div className="deal-activity-list-spacer" data-ff-activity-list-spacer="" aria-hidden />

      <div className="deal-list-below-activity" data-ff-deal-list-below-activity>
        <div
          className="mb-3 rounded-xl border border-border/80 bg-card/80 px-3 py-2 shadow-sm"
          data-ff-pipeline-filter-chrome=""
        >
        <PipelineFilterPopover
          moduleId="deals-pipeline"
          fields={pipelineFilterFields}
          searchPlaceholder="Find a deal, insured, or phone…"
          preserveParams={DEAL_PIPELINE_PRESERVE_PARAMS}
          canConfigure={session.isAdmin}
          searchClassName="min-w-48"
          searchInputClassName="h-9 w-64 rounded-lg border-border bg-background"
        />
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
              listFilter={{
                pipeline: selectedPipeline,
                family: filter.family,
                pcSub: filter.pcSub,
                lifeSub: filter.lifeSub,
                healthSub: filter.healthSub,
              }}
            />
          </>
        ) : board ? (
          <>
            <div
              className="mb-3 flex items-center"
              data-ff-deals-board-actions=""
            >
              <AddNewDealDialog />
            </div>
            <PipelineWorkspace
            agents={agents}
            initialQuery={q}
            searchModuleId="deals-pipeline"
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
          </>

        ) : (
          <p className="text-sm text-muted-foreground">
            No pipeline boards yet. Table still lists every deal on this book.
          </p>
        )}
      </div>
    </AppShell>
  );
}
