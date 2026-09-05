import { createPacketTask, createServicingTask, toggleServicingCheck } from "@/app/actions/ams";
import { Button } from "@/components/ui/button";
import type { ServicingChecklist } from "@/lib/ams/checklist";
import type { PacketTask } from "@/lib/ams/packet-tasks";
import { SERVICING_DOC_KEYS, SERVICING_DOC_LABELS, type ServicingDocKey } from "@/lib/domain-ams";

export function ServicingChecklistCard({
  policyId,
  checklist,
  packetByKey = {},
  missingPackets = [],
}: {
  policyId: string;
  checklist: ServicingChecklist;
  packetByKey?: Partial<Record<ServicingDocKey, PacketTask>>;
  missingPackets?: ServicingDocKey[];
}) {
  const listedKeys = new Set(checklist.items.map((item) => item.key));
  const extraPackets = SERVICING_DOC_KEYS.filter((key) => {
    if (listedKeys.has(key)) return false;
    if (key === "id_card" && listedKeys.has("id_cards")) return false;
    return true;
  });

  return (
    <section className="ff-card mb-4 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold text-navy">Servicing checklist</h2>
        <p className="text-sm text-muted-foreground">
          {checklist.readyCount} complete · {checklist.missingCount} incomplete
        </p>
      </div>
      <p className="mt-1 text-base text-muted-foreground">
        Dec, ID cards, and AOR live on this Policy after bind. Renewal docs, inspection, and
        mortgagee are desk checks — mark complete when the packet lands. Shopping docs stay on
        the Deal. Missing packet slots and incomplete items can open an in-app Task.
      </p>
      <ul className="mt-3 divide-y divide-border rounded-md border border-border">
        {checklist.items.map((item) => {
          const packetKey = (SERVICING_DOC_KEYS as readonly string[]).includes(item.key)
            ? (item.key as ServicingDocKey)
            : item.key === "id_cards"
              ? "id_card"
              : null;
          const openTask = packetKey ? packetByKey[packetKey] : undefined;
          return (
            <li key={item.key} className="flex flex-col gap-2 px-3 py-2 sm:flex-row sm:items-start sm:gap-3">
              <span
                className={`shrink-0 text-xs font-semibold uppercase ${
                  item.ok ? "text-[var(--ff-green)]" : "text-muted-foreground"
                }`}
              >
                {item.ok ? (item.toggleable ? "Complete" : "On file") : item.toggleable ? "Incomplete" : "Missing"}
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-navy">{item.label}</div>
                <div className="text-sm text-muted-foreground">{item.detail}</div>
                {openTask ? (
                  <p className="mt-1 text-sm text-navy">Task open: {openTask.title}</p>
                ) : null}
                {item.taskId && !openTask ? (
                  <p className="mt-1 text-xs uppercase text-muted-foreground">Task open</p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-1">
                {item.toggleable ? (
                  <>
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
                  </>
                ) : null}
                {!item.ok && packetKey && !openTask ? (
                  <form action={createPacketTask}>
                    <input type="hidden" name="policyId" value={policyId} />
                    <input type="hidden" name="docKey" value={packetKey} />
                    <Button type="submit" size="sm" variant="outline">
                      Collect packet
                    </Button>
                  </form>
                ) : null}
              </div>
            </li>
          );
        })}
        {extraPackets.map((key) => {
          const openTask = packetByKey[key];
          const missing = missingPackets.includes(key);
          return (
            <li key={key} className="flex flex-col gap-2 px-3 py-2 sm:flex-row sm:items-start sm:gap-3">
              <span
                className={`shrink-0 text-xs font-semibold uppercase ${
                  missing ? "text-muted-foreground" : "text-[var(--ff-green)]"
                }`}
              >
                {missing ? "Missing" : "On file"}
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-navy">{SERVICING_DOC_LABELS[key]}</div>
                <div className="text-sm text-muted-foreground">
                  {missing
                    ? "Upload on this Policy — shopping docs stay on the Deal."
                    : "Issued packet is on this record."}
                </div>
                {openTask ? (
                  <p className="mt-1 text-sm text-navy">Task open: {openTask.title}</p>
                ) : null}
              </div>
              {missing && !openTask ? (
                <form action={createPacketTask}>
                  <input type="hidden" name="policyId" value={policyId} />
                  <input type="hidden" name="docKey" value={key} />
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
