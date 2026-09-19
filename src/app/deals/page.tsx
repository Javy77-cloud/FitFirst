import { AppShell } from "@/components/app-shell";
import { SavedToast } from "@/components/desk/saved-toast";
import { DealWorkspaceBar } from "@/components/deals/deal-workspace-bar";
import { DealWorkQueuePanel } from "@/components/deals/deal-work-queue-panel";
import { AddNewDealDialog } from "@/components/deals/add-new-deal-dialog";
import { DealsCommandWorkspace } from "@/components/deals/deals-command-workspace";
import { TodayActivityCorner } from "@/components/desk/today-activity-corner";
import { PipelineBookModeToggle } from "@/components/pipeline/book-mode-toggle";
import { RenewalsDesk } from "@/components/renewals/renewals-desk";
import { requireSignedIn } from "@/lib/auth/guards";
import { sessionSeesAgencyBook } from "@/lib/auth/session";
import { loadDealPipelineDesk } from "@/lib/deals/pipeline-desk-data";
import { getPipelineBoard, listBoundPendingDeals, listDeals, listUsers, type DealListFilter } from "@/lib/db/queries";
import { loadDeskLineSettings } from "@/lib/db/line-settings";
import {
  EDITABLE_DEAL_PIPELINE_SLUGS,
  pipelineBookToggleHrefs,
} from "@/lib/wire/pipeline";
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
import { defaultDealsView, parseDealsView } from "@/lib/deals/deals-views";
import { matchesDealLens } from "@/lib/deals/deals-lenses";
import { scheduleDealColdChaseNotices } from "@/lib/deals/cold-chase-sync";
import { loadDealVelocityTouches, ownerScorecards, presentRadarCards, agentVelocityScores } from "@/lib/deals/radar-desk";
import { rankByScore } from "@/lib/deals/velocity";

export const dynamic = "force-dynamic";

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

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
  const roleDefault = defaultDealsView(session);
  const savedDefaultView = await readDefaultPipelineView();
  const view = parseDealsView(first(params.view) ?? savedDefaultView ?? roleDefault, roleDefault);
  const q = first(params.q) ?? "";
  const queue = first(params.queue);
  const heat = first(params.heat);
  const lens = first(params.lens);
  const scope = first(params.scope);
  const valueBand = first(params.valueBand);
  const columnFilter = pickFilterParams(params, [...DEAL_PIPELINE_FILTER_KEYS]);
  const filter: DealListFilter = {
    stage: columnFilter.stage,
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
    }),
    filter.attention === "bound_pending" ? listBoundPendingDeals() : listDeals(filter),
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
  const rawRows = (listRows ?? []).filter((row) => matchesDealPipelineColumnFilters(row.deal, columnFilter));
  const optionDeals = rawRows.map((row) => row.deal);
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
  const touches = await loadDealVelocityTouches(rawRows.map((row) => row.deal.id));
  const presented = presentRadarCards(rawRows, touches, users);
  scheduleDealColdChaseNotices(presented);
  const canSeeTeam = sessionSeesAgencyBook(session);
  const filtered = presented.filter((card) => {
    if (q) {
      const hay = `${card.title} ${card.insured} ${card.phone ?? ""}`.toLowerCase();
      if (!hay.includes(q.toLowerCase())) return false;
    }
    return matchesDealLens(card, {
      heat,
      lens,
      scope,
      valueBand,
      viewerId: session.userId,
      canSeeTeam,
    });
  });
  const scores = agentVelocityScores(presented);
  const selfScore = session.userId ? scores.get(session.userId) : undefined;
  const rankLabel =
    selfScore != null && scores.size > 1
      ? rankByScore([...scores.values()], selfScore).label
      : selfScore != null && scores.size === 1
        ? rankByScore([selfScore], selfScore).label
        : null;
  const notice = first(params.notice);
  const saved = first(params.saved) === "1";

  return (
    <AppShell title="Deals / Pipeline" eyebrow="">
      <SavedToast show={saved} message="Deal saved." listHref="/deals" />
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
        <PipelineBookModeToggle mode="new" {...pipelineBookToggleHrefs(view)} />
      </div>

      <DealWorkspaceBar
        boards={boards.map((item) => ({ slug: item.slug, name: item.name }))}
        pipeline={selectedPipeline}
        boardWhenNoPipeline={null}
        view={view}
        defaultView={savedDefaultView}
        family={filter.family}
        pcSub={filter.pcSub}
        lifeSub={filter.lifeSub}
        healthSub={filter.healthSub}
        attention={filter.attention}
        heat={heat}
        lens={lens}
        scope={scope}
        valueBand={valueBand}
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
          .filter((item) => (EDITABLE_DEAL_PIPELINE_SLUGS as readonly string[]).includes(item.slug))
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

      <TodayActivityCorner counts={desk.todayCounts} active={desk.queueType} basePath="/deals" />

      <div className="deal-list-below-activity" data-ff-deal-list-below-activity>
        <div
          className="mb-3 rounded-xl border border-border/80 bg-card/80 px-3 py-2 shadow-sm"
          data-ff-pipeline-filter-chrome=""
        >
          <div className="min-w-0 flex-1">
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
          <div className="shrink-0" data-ff-deals-list-actions="">
            <AddNewDealDialog triggerSize="sm" />
          </div>
        </div>
        <DealsCommandWorkspace
          view={view}
          cards={filtered}
          canSeeTeam={canSeeTeam}
          scorecards={ownerScorecards(filtered)}
          rankLabel={rankLabel}
          href={{
            view,
            pipeline: selectedPipeline,
            family: filter.family,
            pcSub: filter.pcSub,
            lifeSub: filter.lifeSub,
            healthSub: filter.healthSub,
            heat,
            lens,
            scope,
            valueBand,
            q,
          }}
        />
      </div>
    </AppShell>
  );
}
