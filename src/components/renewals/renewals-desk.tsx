import Link from "next/link";
import { DealWorkspaceBar } from "@/components/deals/deal-workspace-bar";
import { DealWorkQueuePanel } from "@/components/deals/deal-work-queue-panel";
import { PipelineBookModeToggle } from "@/components/pipeline/book-mode-toggle";
import { RenewalsFilteredViews } from "@/components/renewals/renewals-filtered-views";
import { RenewalsHealthStrip } from "@/components/renewals/renewals-health-strip";
import { RenewalsPulse } from "@/components/renewals/renewals-pulse";
import { TodayActivityCorner } from "@/components/renewals/today-activity-corner";
import { currentDeskSession } from "@/lib/auth/session";
import { rollupRenewalHealth } from "@/lib/health/load";
import { roleHealthSummary } from "@/lib/renewal/health-rollup";
import { readDefaultRenewalsView } from "@/app/actions/pipeline-view-prefs";
import { loadDealPipelineDesk } from "@/lib/deals/pipeline-desk-data";
import { loadDeskLineSettings } from "@/lib/db/line-settings";
import { RENEWAL_QUEUE_DISCLAIMER } from "@/lib/domain-ams";
import { loadRenewalsBoard } from "@/lib/renewal/board-data";
import {
  filterRenewalCards,
  isRenewalArchiveStage,
  renewalStagesForPipeline,
} from "@/lib/renewal/board-filter";
import { visiblePipelineBoards } from "@/lib/desk/line-settings";
import {
  parseRenewalsView,
  pipelineBookToggleHrefs,
  renewalsHref,
  SEEDED_PIPELINES,
} from "@/lib/wire/pipeline";
import { RENEWALS_VIEW_COOKIE } from "@/lib/wire/pipeline-view-cookies";
import { PipelineFilterPopover } from "@/components/filters/pipeline-filter-popover";
import { loadPageFilterPrefs } from "@/lib/page-filters/store";
import {
  buildRenewalPipelineFilterFields,
  matchesRenewalContains,
  matchesRenewalPipelineColumnFilters,
  RENEWAL_PIPELINE_FILTER_KEYS,
  RENEWAL_PIPELINE_PRESERVE_PARAMS,
} from "@/lib/renewal/pipeline-column-filters";
import { firstParam, pickFilterParams } from "@/lib/saved-filters";

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export async function RenewalsDesk({
  searchParams,
  canEditStages = false,
  canDrag: _canDrag = true,
}: {
  searchParams: Record<string, string | string[] | undefined>;
  canEditStages?: boolean;
  canDrag?: boolean;
}) {
  const pipeline = first(searchParams.pipeline);
  const viewParam = first(searchParams.view);
  const stage = first(searchParams.stage);
  const queue = first(searchParams.queue);
  const pcSub = first(searchParams.pcSub);
  const lifeSub = first(searchParams.lifeSub);
  const healthSub = first(searchParams.healthSub);
  const notice = first(searchParams.notice);
  const error = first(searchParams.error);
  const savedDefaultView = await readDefaultRenewalsView();
  const view = parseRenewalsView(viewParam ?? savedDefaultView ?? undefined);

  const [{ stageRows, pipelineId, cards }, settings, desk, pageFilterPrefs, session] = await Promise.all([
    loadRenewalsBoard(180),
    loadDeskLineSettings(),
    loadDealPipelineDesk(queue),
    loadPageFilterPrefs("renewals-pipeline"),
    currentDeskSession(),
  ]);

  const boards = visiblePipelineBoards(
    SEEDED_PIPELINES.filter((board) =>
      ["p-c", "health", "life", "won-lost", "archive"].includes(board.slug),
    ),
    settings,
  );
  const columnFilter = pickFilterParams(searchParams, [...RENEWAL_PIPELINE_FILTER_KEYS]);
  const q = firstParam(searchParams.q) ?? "";
  const stageFilter = columnFilter.stage ?? stage;
  const filtered = filterRenewalCards(
    cards,
    { pipeline, stage: stageFilter, pcSub, lifeSub, healthSub },
    settings,
  ).filter(
    (card) =>
      matchesRenewalPipelineColumnFilters(card, columnFilter) &&
      matchesRenewalContains(card, q),
  );
  const pipelineFilterFields = buildRenewalPipelineFilterFields(cards, pageFilterPrefs);
  const visibleStages = renewalStagesForPipeline(stageRows, pipeline);
  const archiveEmpty = pipeline === "archive";
  const hasFilter = Boolean(pipeline || stage || pcSub || lifeSub || healthSub);
  const showAgencyHealth = session.isAdmin;
  const hasOwnedBook = Boolean(
    session.userId && filtered.some((card) => card.ownerId === session.userId),
  );
  const healthRollup = rollupRenewalHealth(
    filtered
      .filter((card) => card.clientHealth)
      .map((card) => ({
        ownerId: card.ownerId,
        ownerName: card.ownerName ?? "Unassigned",
        clientHealth: card.clientHealth!,
        contactId: card.contactId,
        accountId: card.accountId,
      })),
    showAgencyHealth || !hasOwnedBook ? undefined : { ownerId: session.userId },
  );
  const weakest = filtered
    .map((card) => card.clientHealth)
    .filter((row): row is NonNullable<typeof row> => Boolean(row))
    .sort((a, b) => a.score - b.score)[0] ?? null;

  return (
    <div className="space-y-3" data-ff-renewals-workspace="" data-ff-renewals-desk="">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="mb-0" data-ff-pipeline-book-toggle-wrap="">
          <PipelineBookModeToggle mode="renewals" {...pipelineBookToggleHrefs(view)} />
        </div>
        <p className="text-sm text-muted-foreground">
          <Link href="/renewals/queue" className="text-primary hover:underline">
            Classic queue
          </Link>
          {" · "}
          <Link href="/book-health" className="text-primary hover:underline">
            Book health
          </Link>
        </p>
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {notice === "reminder_set" ? (
        <p className="text-sm text-navy">Cross-sell reminder task created.</p>
      ) : null}
      {notice === "template_queued" ? (
        <p className="text-sm text-navy">
          Email template queued on the outbound stub — nothing sent.
        </p>
      ) : null}
      {notice === "chase_logged" ? (
        <p className="text-sm text-navy">Chase logged. One-click send will not nag this band again.</p>
      ) : null}
      {notice === "review_saved" ? (
        <p className="text-sm text-navy">Mini-review saved on the client — not the policy.</p>
      ) : null}
      {notice === "review_skipped" ? (
        <p className="text-sm text-navy">Skipped once. Next time the review stays up.</p>
      ) : null}

      <DealWorkspaceBar
        boards={boards.map((item) => ({ slug: item.slug, name: item.name }))}
        pipeline={pipeline}
        view={view}
        defaultView={savedDefaultView}
        stage={stage}
        pcSub={pcSub}
        lifeSub={lifeSub}
        healthSub={healthSub}
        settings={settings}
        canEditStages={canEditStages}
        stagePipelineId={pipelineId}
        stageRows={stageRows}
        hrefBuilder={renewalsHref}
        cookieKey={RENEWALS_VIEW_COOKIE}
        boardWhenNoPipeline={null}
      />

      {desk.queueType ? (
        <DealWorkQueuePanel
          type={desk.queueType}
          items={desk.queueItems}
          closeHref={renewalsHref({
            pipeline,
            view,
            stage,
            pcSub,
            lifeSub,
            healthSub,
          })}
        />
      ) : null}

      <TodayActivityCorner
        counts={desk.todayCounts}
        active={desk.queueType}
        basePath="/renewals"
      />

      <div data-ff-renewals-below-activity>
        <PipelineFilterPopover
          moduleId="renewals-pipeline"
          fields={pipelineFilterFields}
          searchPlaceholder="Contains client, policy, carrier…"
          preserveParams={RENEWAL_PIPELINE_PRESERVE_PARAMS}
          canConfigure={canEditStages}
        />
        {hasFilter ? (
          <p className="mb-3 text-sm">
            <Link href={renewalsHref({ view })} className="text-primary hover:underline">
              Clear filter
            </Link>
          </p>
        ) : null}

        {archiveEmpty &&
        filtered.length === 0 &&
        !visibleStages.some((item) => isRenewalArchiveStage(item.slug)) ? (
          <p className="text-sm text-muted-foreground" data-ff-renewals-archive-empty="">
            No archived renewals yet. This book does not park cards on Archived — shopping stays on
            All / P&amp;C / Health / Life, and bound or lost sit on Won-Lost.
          </p>
        ) : (
          <>
            <RenewalsPulse daysUntil={filtered.map((card) => card.daysUntil)} />
            <RenewalsHealthStrip
              summary={roleHealthSummary({
                cards: filtered,
                isOwner: session.isAdmin,
                viewerId: session.userId,
                viewerName: session.name,
              })}
              book={healthRollup.book}
              agents={showAgencyHealth ? healthRollup.agents : []}
              weakest={weakest}
            />
            <RenewalsFilteredViews
              cards={filtered}
              searchModuleId="renewals-pipeline"
              initialQuery={q}
            />
          </>
        )}
      </div>

      <p className="max-w-3xl text-xs text-muted-foreground">{RENEWAL_QUEUE_DISCLAIMER}</p>
    </div>
  );
}
