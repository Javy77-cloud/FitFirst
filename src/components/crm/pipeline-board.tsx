import Link from "next/link";
import { updateDealStage } from "@/app/actions/crm";
import { StagePill } from "@/components/fit-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { LINE_LABELS } from "@/lib/crm/bind";
import { cn } from "@/lib/utils";
import type { Deal, PipelineStageRow } from "@/lib/db/schema";

export function PipelineBoard({
  deals,
  stages,
}: {
  deals: Deal[];
  stages: PipelineStageRow[];
}) {
  const known = new Set(stages.map((stage) => stage.slug));
  const columns = [
    ...stages,
    ...(deals.some((deal) => !known.has(deal.pipelineStage))
      ? [
          {
            id: "unstaged",
            tenantId: "",
            slug: "_unstaged",
            label: "Unstaged",
            sortOrder: 999,
            locked: false,
            createdAt: new Date(),
          } satisfies PipelineStageRow,
        ]
      : []),
  ];
  const movable = stages.filter((stage) => stage.slug !== "bound");

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Same shops as the list. Move stages here; bind is the only path into Bound.
        </p>
        <Link href="/deals/new" className={cn(buttonVariants({ size: "sm" }))}>
          Create deal
        </Link>
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
        {columns.map((stage) => {
          const column =
            stage.slug === "_unstaged"
              ? deals.filter((deal) => !known.has(deal.pipelineStage))
              : deals.filter((deal) => deal.pipelineStage === stage.slug);
          return (
            <section key={stage.id} className="ff-card min-h-48 overflow-hidden">
              <div className="flex items-center justify-between border-b border-border px-3 py-2">
                <StagePill stage={stage.label} />
                <span className="text-[11px] text-muted-foreground">{column.length}</span>
              </div>
              <div className="space-y-2 p-2">
                {column.length === 0 ? (
                  <p className="px-1 py-6 text-center text-xs text-muted-foreground">None</p>
                ) : (
                  column.map((deal) => (
                    <article key={deal.id} className="rounded-md border border-border bg-background p-2.5">
                      <Link
                        href={`/deals/${deal.id}`}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        {deal.title}
                      </Link>
                      <div className="mt-1 text-[11px] text-muted-foreground">
                        {LINE_LABELS[deal.lineOfBusiness as keyof typeof LINE_LABELS] ??
                          deal.lineOfBusiness}{" "}
                        · {deal.state}
                      </div>
                      {deal.pipelineStage !== "bound" && movable.length > 0 ? (
                        <form action={updateDealStage} className="mt-2 flex items-center gap-1">
                          <input type="hidden" name="dealId" value={deal.id} />
                          <select
                            name="stage"
                            defaultValue={
                              movable.some((option) => option.slug === deal.pipelineStage)
                                ? deal.pipelineStage
                                : movable[0]?.slug
                            }
                            className="h-7 flex-1 rounded-md border border-input bg-card px-1.5 text-[11px]"
                          >
                            {movable.map((option) => (
                              <option key={option.id} value={option.slug}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <Button type="submit" size="xs" variant="ghost">
                            Move
                          </Button>
                        </form>
                      ) : deal.pipelineStage === "bound" ? (
                        <p className="mt-2 text-[11px] text-muted-foreground">
                          Bound — policy already written
                        </p>
                      ) : null}
                    </article>
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
