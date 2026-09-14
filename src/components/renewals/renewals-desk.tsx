import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { DealWorkspaceBar } from "@/components/deals/deal-workspace-bar";
import { DealWorkQueuePanel } from "@/components/deals/deal-work-queue-panel";
import { TodayActivityStrip } from "@/components/deals/today-activity-strip";
import { PipelineBookModeToggle } from "@/components/pipeline/book-mode-toggle";
import { RenewalsFilteredViews } from "@/components/renewals/renewals-filtered-views";
import { RenewalsList } from "@/components/renewals/renewals-list";
import { readDefaultRenewalsView } from "@/app/actions/pipeline-view-prefs";
import { DEFAULT_TENANT_ID } from "@/lib/domain";
import { db } from "@/lib/db";
import { emailTemplates } from "@/lib/db/schema";
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
import { isPipelineSheetView, parseRenewalsView, renewalsHref, SEEDED_PIPELINES } from "@/lib/wire/pipeline";
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
  canDrag = true,
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

  const [{ stageRows, pipelineId, cards }, templateRows, settings, desk, pageFilterPrefs] = await Promise.all([
    loadRenewalsBoard(180),
    db
      .select({ id: emailTemplates.id, name: emailTemplates.name })
      .from(emailTemplates)
      .where(and(eq(emailTemplates.tenantId, DEFAULT_TENANT_ID)))
      .catch(() => [] as { id: string; name: string }[]),
    loadDeskLineSettings(),
    loadDealPipelineDesk(queue),
    loadPageFilterPrefs("renewals-pipeline"),
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

  return (
    <div className="space-y-3" data-ff-renewals-workspace="" data-ff-renewals-desk="">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="mb-0" data-ff-pipeline-book-toggle-wrap="">
          <PipelineBookModeToggle
            mode="renewals"
            newHref="/deals?view=board"
            renewalsHref="/renewals"
          />
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

      <div className="deal-upload-activity" data-testid="deal-upload-activity">
        <div className="deal-today-slot">
          <TodayActivityStrip
            counts={desk.todayCounts}
            active={desk.queueType}
            basePath="/renewals"
          />
        </div>
      </div>

      <div className="deal-activity-list-spacer" data-ff-activity-list-spacer="" aria-hidden />

      <div className="deal-list-below-activity" data-ff-renewals-below-activity>
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
        ) : isPipelineSheetView(view) && view !== "grid" ? (
          <RenewalsList cards={filtered} initialQuery={q} />
        ) : (
          <RenewalsFilteredViews
            cards={filtered}
            stages={visibleStages}
            view={view === "grid" ? "grid" : view === "funnel" ? "funnel" : "board"}
            pipeline={pipeline}
            viewExtras={{ pcSub, lifeSub, healthSub }}
            templates={templateRows}
            searchModuleId="renewals-pipeline"
            initialQuery={q}
            canDrag={canDrag}
          />
        )}
      </div>

      <p className="max-w-3xl text-xs text-muted-foreground">{RENEWAL_QUEUE_DISCLAIMER}</p>
    </div>
  );
}
