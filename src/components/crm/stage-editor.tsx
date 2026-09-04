import { createPipelineStage, deletePipelineStage, relabelPipelineStage } from "@/app/actions/crm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PipelineStageRow } from "@/lib/db/schema";

export function StageEditor({ stages }: { stages: PipelineStageRow[] }) {
  return (
    <section className="ff-card p-4">
      <h2 className="text-sm font-semibold text-navy">Admin stage editor</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Add, relabel, or delete columns. Bound is locked — bind is the only way a deal lands there.
      </p>
      <ul className="mt-3 space-y-2">
        {stages.map((stage) => (
          <li key={stage.id} className="flex flex-wrap items-center gap-2">
            <form action={relabelPipelineStage} className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              <input type="hidden" name="stageId" value={stage.id} />
              <Input name="label" defaultValue={stage.name} className="h-8 max-w-xs" />
              <span className="text-[11px] text-muted-foreground">{stage.slug}</span>
              <Button type="submit" size="xs" variant="outline">
                Relabel
              </Button>
            </form>
            {stage.seeded ? (
              <span className="text-[11px] text-muted-foreground">Locked</span>
            ) : (
              <form action={deletePipelineStage}>
                <input type="hidden" name="stageId" value={stage.id} />
                <Button type="submit" size="xs" variant="destructive">
                  Delete
                </Button>
              </form>
            )}
          </li>
        ))}
      </ul>
      <form action={createPipelineStage} className="mt-3 flex flex-wrap items-center gap-2">
        <Input name="label" placeholder="New stage label" className="h-8 max-w-xs" required />
        <Button type="submit" size="sm">
          Add stage
        </Button>
      </form>
    </section>
  );
}
