import type { PacketTask } from "@/lib/ams/packet-tasks";
import { servicingDocKeyFromTaskKind } from "@/lib/domain-ams";
import { isSuspenseDocKey } from "@/lib/ams/suspense";

export function SuspensePanel({
  packetTasks,
}: {
  packetTasks: PacketTask[];
}) {
  const open = packetTasks.filter((task) => {
    if (task.status !== "open") return false;
    const key = servicingDocKeyFromTaskKind(task.kind);
    return key != null && isSuspenseDocKey(key);
  });

  return (
    <section className="ff-card mb-4 p-4">
      <h2 className="text-base font-semibold text-navy">Suspense / follow-ups</h2>
      <p className="mt-1 text-base text-muted-foreground">
        Missing AOR or ID cards open an in-app Task automatically. Dec stays a manual collect
        when that slot is empty.
      </p>
      {open.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          No open AOR or ID-card follow-ups on this Policy.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-border rounded-md border border-border">
          {open.map((task) => (
            <li key={task.id} className="px-3 py-2">
              <div className="font-medium text-navy">{task.title}</div>
              <p className="text-sm text-muted-foreground">Open servicing task · in-app only</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
