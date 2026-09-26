import Link from "next/link";
import { toggleServicingCheck } from "@/app/actions/ams";
import { CreateServicingTaskDialog } from "@/components/ams/create-servicing-task-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  optionalExtraPacketKeys,
  type ChecklistItem,
  type ServicingChecklist,
} from "@/lib/ams/checklist";
import type { PacketTask } from "@/lib/ams/packet-tasks";
import {
  isServicingCheckKey,
  SERVICING_DOC_KEYS,
  SERVICING_DOC_LABELS,
  type ServicingDocKey,
} from "@/lib/domain-ams";
import {
  optionalServicingPacketDocumentsHref,
  policyDocumentsTabHref,
} from "@/lib/policy/policy-documents-href";

function checklistStatusWord(item: ChecklistItem): string {
  if (item.attachDocType) {
    if (item.onFile) return "On file";
    if (item.ok) return "Complete";
    return "Missing";
  }
  if (item.ok) return item.toggleable ? "Complete" : "On file";
  return item.toggleable ? "Incomplete" : "Missing";
}

export function ServicingChecklistCard({
  policyId,
  checklist,
  packetByKey = {},
  missingPackets = [],
  packetOnFile = {},
}: {
  policyId: string;
  checklist: ServicingChecklist;
  packetByKey?: Partial<Record<ServicingDocKey, PacketTask>>;
  /** Auto-required missing slots only (dec). Optional AOR / ID never live here. */
  missingPackets?: ServicingDocKey[];
  /** Accurate file presence for packet slots — used for optional AOR / ID rows. */
  packetOnFile?: Partial<Record<ServicingDocKey, boolean>>;
}) {
  const listedKeys = new Set(checklist.items.map((item) => item.key));
  const optionalPackets = optionalExtraPacketKeys(listedKeys);

  const total = checklist.readyCount + checklist.missingCount;
  const pct = total > 0 ? Math.round((checklist.readyCount / total) * 100) : 0;

  return (
    <section className="ff-card mb-4 p-4" data-ff-servicing-checklist="">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold text-navy">Servicing checklist</h2>
        <p className="text-sm text-muted-foreground">
          {checklist.readyCount} complete · {checklist.missingCount} incomplete
          {checklist.lobFamily !== "classic" ? ` · ${checklist.lobFamily}` : ""}
        </p>
      </div>
      <div className="mt-2" data-ff-checklist-progress="">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Progress</span>
          <span>{pct}%</span>
        </div>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-[var(--ff-green)] transition-all"
            style={{ width: `${pct}%` }}
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      </div>

      <ul className="mt-3 divide-y divide-border rounded-md border border-border">
        {checklist.items.map((item) => {
          const packetKey = (SERVICING_DOC_KEYS as readonly string[]).includes(item.key)
            ? (item.key as ServicingDocKey)
            : item.key === "id_cards"
              ? "id_card"
              : null;
          const openTask = packetKey ? packetByKey[packetKey] : undefined;
          const taskId = item.taskId || openTask?.id || null;
          const statusWord = checklistStatusWord(item);
          const showPacketCollect = Boolean(
            !item.ok && packetKey && missingPackets.includes(packetKey) && !openTask,
          );
          const showCreateTask =
            !item.ok && !taskId && isServicingCheckKey(item.key) && !showPacketCollect;
          return (
            <li
              key={item.key}
              className="flex flex-col gap-2 px-3 py-2 sm:flex-row sm:items-start sm:gap-3"
              data-ff-checklist-item={item.key}
              data-ok={item.ok ? "true" : "false"}
            >
              <span
                className={`shrink-0 text-xs font-semibold uppercase ${
                  item.ok ? "text-[var(--ff-green)]" : "text-muted-foreground"
                }`}
                data-ff-checklist-status={statusWord}
              >
                {statusWord}
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-navy">{item.label}</div>
                <div className="text-sm text-muted-foreground">{item.detail}</div>
                {!item.ok && taskId ? (
                  <p className="mt-1 text-sm">
                    <Link
                      href={`/tasks?q=${encodeURIComponent(item.label)}`}
                      className="text-primary hover:underline"
                      data-ff-checklist-task-link={taskId}
                    >
                      Open linked task
                    </Link>
                  </p>
                ) : openTask ? (
                  <p className="mt-1 text-sm text-navy">Task open: {openTask.title}</p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-1">
                {item.toggleable ? (
                  <form action={toggleServicingCheck}>
                    <input type="hidden" name="policyId" value={policyId} />
                    <input type="hidden" name="itemKey" value={item.key} />
                    <input
                      type="hidden"
                      name="status"
                      value={item.ok ? "incomplete" : "complete"}
                    />
                    <Button
                      type="submit"
                      size="sm"
                      variant={item.ok ? "outline" : "default"}
                      data-ff-checklist-mark={item.key}
                    >
                      {item.ok ? "Reopen" : "Mark complete"}
                    </Button>
                  </form>
                ) : null}
                {showCreateTask ? (
                  <CreateServicingTaskDialog
                    policyId={policyId}
                    itemKey={item.key}
                    mode="servicing"
                    label="Create task"
                    triggerVariant="secondary"
                  />
                ) : null}
                {showPacketCollect && packetKey ? (
                  <CreateServicingTaskDialog
                    policyId={policyId}
                    itemKey={packetKey}
                    mode="packet"
                    label="Collect packet"
                    triggerVariant="outline"
                  />
                ) : null}
                {item.attachDocType ? (
                  <Link
                    href={policyDocumentsTabHref(policyId, item.attachDocType)}
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                    data-ff-checklist-documents={item.key}
                  >
                    Documents
                  </Link>
                ) : null}
              </div>
            </li>
          );
        })}
        {optionalPackets.map((key) => {
          const openTask = packetByKey[key];
          const onFile = Boolean(packetOnFile[key]);
          return (
            <li
              key={key}
              className="flex flex-col gap-2 px-3 py-2 sm:flex-row sm:items-start sm:gap-3"
              data-ff-checklist-item={key}
              data-ff-optional-packet=""
              data-ok={onFile ? "true" : "false"}
              data-optional="true"
            >
              <span
                className={`shrink-0 text-xs font-semibold uppercase ${
                  onFile ? "text-[var(--ff-green)]" : "text-muted-foreground"
                }`}
              >
                {onFile ? "On file" : "Optional"}
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-navy">{SERVICING_DOC_LABELS[key]}</div>

                {openTask ? (
                  <p className="mt-1 text-sm">
                    <Link
                      href={`/tasks?q=${encodeURIComponent(openTask.title)}`}
                      className="text-primary hover:underline"
                    >
                      Open linked task
                    </Link>
                  </p>
                ) : null}
              </div>
              <Link
                href={optionalServicingPacketDocumentsHref(policyId, key)}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                data-ff-optional-packet-docs={key}
                data-ff-checklist-documents={key}
              >
                Documents
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
