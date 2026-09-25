import { completeSuspenseTask } from "@/app/actions/ams";
import { Button } from "@/components/ui/button";
import type { PacketTask } from "@/lib/ams/packet-tasks";
import { servicingDocKeyFromTaskKind } from "@/lib/domain-ams";
import { isSuspenseDocKey } from "@/lib/ams/suspense";

export function SuspensePanel({
  packetTasks,
  policyId,
}: {
  packetTasks: PacketTask[];
  policyId: string;
}) {
  const open = packetTasks.filter((task) => {
    if (task.status !== "open") return false;
    const key = servicingDocKeyFromTaskKind(task.kind);
    return key != null && isSuspenseDocKey(key);
  });

  return (
    <section className="ff-card mb-4 p-4">
      <h2 className="text-base font-semibold text-navy">Suspense / follow-ups</h2>

      {open.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          No open AOR or ID-card follow-ups on this Policy.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-border rounded-md border border-border">
          {open.map((task) => (
            <li key={task.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
              <div>
                <div className="font-medium text-navy">{task.title}</div>

              </div>
              <form action={completeSuspenseTask}>
                <input type="hidden" name="taskId" value={task.id} />
                <input type="hidden" name="returnTo" value={`/policies/${policyId}`} />
                <Button type="submit" size="sm" variant="outline">
                  Mark collected
                </Button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
