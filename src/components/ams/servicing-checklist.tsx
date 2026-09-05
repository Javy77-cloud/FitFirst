import { createPacketTask } from "@/app/actions/ams";
import { Button } from "@/components/ui/button";
import type { ServicingChecklist } from "@/lib/ams/checklist";
import type { PacketTask } from "@/lib/ams/packet-tasks";
import { SERVICING_DOC_KEYS, type ServicingDocKey } from "@/lib/domain-ams";

export function ServicingChecklistCard({
  checklist,
  policyId,
  packetByKey,
}: {
  checklist: ServicingChecklist;
  policyId: string;
  packetByKey: Partial<Record<ServicingDocKey, PacketTask>>;
}) {
  return (
    <section className="ff-card mb-4 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold text-navy">Servicing checklist</h2>
        <p className="text-sm text-muted-foreground">
          {checklist.readyCount} ready · {checklist.missingCount} open
        </p>
      </div>
      <p className="mt-1 text-base text-muted-foreground">
        Dec, ID cards, and AOR live on this Policy after bind. Shopping docs stay on the Deal.
        Missing packet slots can open an in-app Task.
      </p>
      <ul className="mt-3 divide-y divide-border rounded-md border border-border">
        {checklist.items.map((item) => {
          const packetKey = (SERVICING_DOC_KEYS as readonly string[]).includes(item.key)
            ? (item.key as ServicingDocKey)
            : null;
          const openTask = packetKey ? packetByKey[packetKey] : undefined;
          return (
            <li key={item.key} className="flex flex-col gap-2 px-3 py-2 sm:flex-row sm:items-start sm:gap-3">
              <span
                className={`shrink-0 text-xs font-semibold uppercase ${
                  item.ok ? "text-[var(--ff-green)]" : "text-muted-foreground"
                }`}
              >
                {item.ok ? "On file" : "Missing"}
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-navy">{item.label}</div>
                <div className="text-sm text-muted-foreground">{item.detail}</div>
                {openTask ? (
                  <p className="mt-1 text-sm text-navy">Task open: {openTask.title}</p>
                ) : null}
              </div>
              {!item.ok && packetKey && !openTask ? (
                <form action={createPacketTask}>
                  <input type="hidden" name="policyId" value={policyId} />
                  <input type="hidden" name="docKey" value={packetKey} />
                  <Button type="submit" size="sm" variant="outline">
                    Create task
                  </Button>
                </form>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
