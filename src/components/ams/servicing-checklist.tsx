import { createServicingTask, toggleServicingCheck } from "@/app/actions/ams";
import { Button } from "@/components/ui/button";
import type { ServicingChecklist } from "@/lib/ams/checklist";

export function ServicingChecklistCard({
  policyId,
  checklist,
}: {
  policyId: string;
  checklist: ServicingChecklist;
}) {
  return (
    <section className="ff-card mb-4 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold text-navy">Servicing checklist</h2>
        <p className="text-sm text-muted-foreground">
          {checklist.readyCount} complete · {checklist.missingCount} incomplete
        </p>
      </div>
      <p className="mt-1 text-base text-muted-foreground">
        Renewal docs, inspection, mortgagee, and ID cards live on this Policy. Mark complete
        when the packet lands. Incomplete items open an in-desk Task — no email.
      </p>
      <ul className="mt-3 divide-y divide-border rounded-md border border-border">
        {checklist.items.map((item) => (
          <li key={item.key} className="flex flex-col gap-2 px-3 py-2 sm:flex-row sm:items-start sm:gap-3">
            <span
              className={`shrink-0 text-xs font-semibold uppercase ${
                item.ok ? "text-[var(--ff-green)]" : "text-muted-foreground"
              }`}
            >
              {item.ok ? "Complete" : "Incomplete"}
            </span>
            <div className="min-w-0 flex-1">
              <div className="font-medium text-navy">{item.label}</div>
              <div className="text-sm text-muted-foreground">{item.detail}</div>
            </div>
            {item.toggleable ? (
              <div className="flex flex-wrap gap-1">
                <form action={toggleServicingCheck}>
                  <input type="hidden" name="policyId" value={policyId} />
                  <input type="hidden" name="itemKey" value={item.key} />
                  <input type="hidden" name="status" value={item.ok ? "incomplete" : "complete"} />
                  <Button type="submit" size="sm" variant={item.ok ? "outline" : "default"}>
                    {item.ok ? "Reopen" : "Mark complete"}
                  </Button>
                </form>
                {!item.ok && !item.taskId ? (
                  <form action={createServicingTask}>
                    <input type="hidden" name="policyId" value={policyId} />
                    <input type="hidden" name="itemKey" value={item.key} />
                    <Button type="submit" size="sm" variant="secondary">
                      Create task
                    </Button>
                  </form>
                ) : null}
                {item.taskId ? (
                  <span className="self-center text-xs uppercase text-muted-foreground">Task open</span>
                ) : null}
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
