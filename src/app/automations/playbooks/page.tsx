import Link from "next/link";
import { runPlaybookNow, toggleGuidedAutomation } from "@/app/actions/automations";
import { AppShell } from "@/components/app-shell";
import { AutomationsModuleNav } from "@/components/automations/module-nav";
import { AutomationsNotice } from "@/components/automations/notice";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { requireSignedIn } from "@/lib/auth/guards";
import {
  AUTOMATION_ACTION_LABEL,
  AUTOMATION_TRIGGER_LABEL,
  PLAYBOOK_VISIBILITY_LABEL,
  isAutomationAction,
  isAutomationTrigger,
  isPlaybookVisibility,
} from "@/lib/automations/types";
import { outcomeBadges } from "@/lib/automations/engine";
import { recordHref } from "@/lib/desk/record-href";
import {
  countAutomationRunsByPlaybook,
  listAutomationRuns,
  listGuidedAutomations,
} from "@/lib/db/automation-queries";
import { cn } from "@/lib/utils";
import { formatDay } from "@/lib/domain";

export const dynamic = "force-dynamic";

function triggerLabel(kind: string) {
  return isAutomationTrigger(kind) ? AUTOMATION_TRIGGER_LABEL[kind] : kind;
}
function actionLabel(kind: string) {
  return isAutomationAction(kind) ? AUTOMATION_ACTION_LABEL[kind] : kind;
}
function visibilityLabel(value: string) {
  return isPlaybookVisibility(value) ? PLAYBOOK_VISIBILITY_LABEL[value] : "Admin + agent";
}

export default async function AutomationsPlaybooksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireSignedIn();
  const query = await searchParams;
  const [playbooks, runs] = await Promise.all([
    listGuidedAutomations({ isAdmin: session.isAdmin }),
    listAutomationRuns({ isAdmin: session.isAdmin }),
  ]);
  const runCounts = await countAutomationRunsByPlaybook(playbooks.map((row) => row.id));
  const taskFires = runs.filter((row) => row.run.createdTask).length;
  const alertFires = runs.filter((row) => row.run.createdAlert).length;

  return (
    <AppShell
      title="Playbooks"
      actions={
        session.isAdmin ? (
          <Link href="/automations/builder" className={cn(buttonVariants({ size: "sm" }))}>
            New playbook
          </Link>
        ) : null
      }
    >
      <AutomationsModuleNav />
      <AutomationsNotice
        notice={typeof query.notice === "string" ? query.notice : undefined}
        error={typeof query.error === "string" ? query.error : undefined}
      />

      <p className="mb-4 text-xs text-navy">
        You are {session.isAdmin ? "Admin" : "Agent"}.{" "}
        {session.isAdmin
          ? "You see every playbook and can run a demo fire."
          : "You see agent-visible playbooks and the Tasks / Alerts they already fired."}{" "}
        {taskFires} task · {alertFires} alert fires on the book.
      </p>
      {playbooks.length === 0 ? (
        <section className="ff-card px-4 py-6 text-sm text-muted-foreground">
          No playbooks in your view. {session.isAdmin ? "Save one from the builder." : "Ask Admin to share a playbook."}
        </section>
      ) : (
        <div className="grid gap-3">
          {playbooks.map((row) => (
            <section key={row.id} className="ff-card p-4" id={row.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-navy">{row.name}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{row.actionValue}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {row.isExample ? <Badge variant="outline">Seeded</Badge> : null}
                    <Badge variant="outline">{visibilityLabel(row.visibility)}</Badge>
                    {outcomeBadges(row.actionKind).map((badge) => (
                      <Badge key={badge} variant="secondary">
                        {badge}
                      </Badge>
                    ))}
                    <Badge variant={row.enabled ? "default" : "outline"}>
                      {row.enabled ? "On" : "Off"}
                    </Badge>
                  </div>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    {triggerLabel(row.triggerKind)}
                    {row.triggerValue ? ` · ${row.triggerValue}` : ""} → {actionLabel(row.actionKind)} ·{" "}
                    {runCounts.get(row.id) ?? 0} fire{runCounts.get(row.id) === 1 ? "" : "s"}
                  </p>
                </div>
                {session.isAdmin ? (
                  <div className="flex flex-wrap gap-2">
                    <form action={toggleGuidedAutomation}>
                      <input type="hidden" name="id" value={row.id} />
                      <input type="hidden" name="enabled" value={row.enabled ? "false" : "true"} />
                      <Button type="submit" size="xs" variant="outline">
                        {row.enabled ? "Turn off" : "Turn on"}
                      </Button>
                    </form>
                    <form action={runPlaybookNow}>
                      <input type="hidden" name="id" value={row.id} />
                      <Button type="submit" size="xs">
                        Run now
                      </Button>
                    </form>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Read-only for agents</p>
                )}
              </div>
            </section>
          ))}
        </div>
      )}
      <section className="ff-card mt-4 overflow-hidden">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-navy">Fired work</h2>

        </div>
        {runs.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">No playbook fires in your view yet.</p>
        ) : (
          <table className="ff-table">
            <thead>
              <tr>
                <th>Playbook</th>
                <th>Wrote</th>
                <th>Record</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {runs.map(({ run, playbook }) => {
                const href = run.activityId
                  ? `/tasks/${run.activityId}`
                  : recordHref(run.entityType, run.entityId);
                return (
                  <tr key={run.id}>
                    <td>
                      <div className="font-medium">{playbook.name}</div>
                      <div className="max-w-[320px] truncate text-[11px] text-muted-foreground">
                        {run.summary}
                      </div>
                    </td>
                    <td className="text-xs">
                      {run.createdTask ? "Task" : ""}
                      {run.createdTask && run.createdAlert ? " + " : ""}
                      {run.createdAlert ? "Alert" : ""}
                    </td>
                    <td>
                      {href ? (
                        <Link href={href} className="text-sm text-primary hover:underline">
                          Open
                        </Link>
                      ) : (
                        <span className="text-xs text-muted-foreground">Desk</span>
                      )}
                    </td>
                    <td className="text-xs text-muted-foreground">
                      {formatDay(run.firedAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </AppShell>
  );
}
