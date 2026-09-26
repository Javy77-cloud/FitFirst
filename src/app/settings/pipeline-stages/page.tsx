import { PipelineStageEditor } from "@/components/pipeline/stage-editor";
import { SettingsShell } from "@/components/settings/settings-shell";
import { requireAdminPage } from "@/lib/auth/guards";
import { listPipelines } from "@/lib/db/queries";
import { EDITABLE_DEAL_PIPELINE_SLUGS, pipelineTabLabel } from "@/lib/wire/pipeline";
import { ensureRenewalsPipeline, ensureSeededPipelines } from "@/lib/wire/ensure-pipelines";
import type { PipelineStageView } from "@/lib/wire/pipeline-cards";

export const dynamic = "force-dynamic";

const SETTINGS_BOARD_SLUGS = [...EDITABLE_DEAL_PIPELINE_SLUGS, "renewals"] as const;

export default async function PipelineStagesSettingsPage() {
  await requireAdminPage();
  await ensureSeededPipelines();
  await ensureRenewalsPipeline();
  const pipelines = await listPipelines();
  const boards = SETTINGS_BOARD_SLUGS.flatMap((slug) => {
    const row = pipelines.find((item) => item.slug === slug);
    if (!row) return [];
    const stages: PipelineStageView[] = row.stages.map((stage) => ({
      id: stage.id,
      slug: stage.slug,
      name: stage.name,
      sortOrder: stage.sortOrder,
      color: stage.color,
      seeded: stage.seeded,
    }));
    return [{ id: row.id, slug: row.slug, name: row.name, stages }];
  });

  return (
    <SettingsShell title="Pipeline stages" current="pipeline-stages">
      <p className="mb-4 max-w-3xl text-sm text-muted-foreground" data-ff-admin-stage-settings-note="">
        Rename, add, delete, and reorder stages for Deals and Renewals. Agents change colors from those boards and cannot change the stage list.
      </p>
      <div className="space-y-4" data-ff-admin-stage-settings="">
        {boards.map((board) => (
          <section key={board.id} className="ff-card p-4" data-ff-admin-stage-board={board.slug}>
            <h2 className="text-sm font-semibold text-navy">{pipelineTabLabel(board)}</h2>
            <PipelineStageEditor
              pipelineId={board.id}
              stages={board.stages}
              bare
              returnTo="/settings/pipeline-stages"
            />
          </section>
        ))}
      </div>
    </SettingsShell>
  );
}
