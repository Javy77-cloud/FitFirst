import Link from "next/link";
import { updateDealStage } from "@/app/actions/crm";
import { StagePill } from "@/components/fit-badge";
import { Button } from "@/components/ui/button";
import { DEAL_STAGES } from "@/lib/domain";
import { LINE_LABELS } from "@/lib/crm/bind";
import type { Deal } from "@/lib/db/schema";

const MOVABLE = DEAL_STAGES.filter((stage) => stage !== "bound");

export function PipelineBoard({ deals }: { deals: Deal[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
      {DEAL_STAGES.map((stage) => {
        const column = deals.filter((deal) => deal.pipelineStage === stage);
        return (
          <section key={stage} className="ff-card min-h-48 overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-3 py-2">
              <StagePill stage={stage} />
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
                    {deal.pipelineStage !== "bound" ? (
                      <form action={updateDealStage} className="mt-2 flex items-center gap-1">
                        <input type="hidden" name="dealId" value={deal.id} />
                        <select
                          name="stage"
                          defaultValue={deal.pipelineStage}
                          className="h-7 flex-1 rounded-md border border-input bg-card px-1.5 text-[11px]"
                        >
                          {MOVABLE.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                        <Button type="submit" size="xs" variant="ghost">
                          Move
                        </Button>
                      </form>
                    ) : (
                      <p className="mt-2 text-[11px] text-muted-foreground">
                        Bound — policy already written
                      </p>
                    )}
                  </article>
                ))
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
