import Link from "next/link";
import { toggleGuidedAutomation } from "@/app/actions/automations";
import { AppShell } from "@/components/app-shell";
import { AutomationBuilderForm } from "@/components/automations/builder-form";
import { AutomationsModuleNav } from "@/components/automations/module-nav";
import { AutomationsNotice } from "@/components/automations/notice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireSignedIn } from "@/lib/auth/guards";
import {
  AUTOMATION_ACTION_LABEL,
  AUTOMATION_CONDITION_LABEL,
  AUTOMATION_TRIGGER_LABEL,
  isAutomationAction,
  isAutomationCondition,
  isAutomationTrigger,
} from "@/lib/automations/types";
import { listGuidedAutomations } from "@/lib/db/automation-queries";
import { listEmailTemplates } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

function labelTrigger(kind: string) {
  return isAutomationTrigger(kind) ? AUTOMATION_TRIGGER_LABEL[kind] : kind;
}
function labelCondition(kind: string) {
  return isAutomationCondition(kind) ? AUTOMATION_CONDITION_LABEL[kind] : kind;
}
function labelAction(kind: string) {
  return isAutomationAction(kind) ? AUTOMATION_ACTION_LABEL[kind] : kind;
}

export default async function AutomationsBuilderPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireSignedIn();
  const query = await searchParams;
  const [rows, templates] = await Promise.all([
    listGuidedAutomations({ isAdmin: session.isAdmin }),
    listEmailTemplates(),
  ]);

  return (
    <AppShell title="Guided automation builder">
      <AutomationsModuleNav />
      <AutomationsNotice
        notice={typeof query.notice === "string" ? query.notice : undefined}
        error={typeof query.error === "string" ? query.error : undefined}
      />

      <div className="grid gap-4 lg:grid-cols-[380px_minmax(0,1fr)]">
        {session.isAdmin ? (
          <AutomationBuilderForm
            templates={templates.map((template) => ({ id: template.id, name: template.name }))}
          />
        ) : (
          <section className="ff-card p-4 text-sm text-muted-foreground">
            Builder is Admin-only. You can still open{" "}
            <Link href="/automations/playbooks" className="text-primary hover:underline">
              Playbooks
            </Link>{" "}
            to see Tasks and Alerts already fired on your book.
          </section>
        )}
        <section className="ff-card overflow-hidden">
          {rows.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">No automations yet.</p>
          ) : (
            <table className="ff-table">
              <thead>
                <tr>
                  <th>Automation</th>
                  <th>Trigger</th>
                  <th>Condition</th>
                  <th>Action</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <div className="font-medium">{row.name}</div>
                      {row.isExample ? (
                        <div className="mt-1">
                          <Badge variant="outline">Seeded</Badge>
                        </div>
                      ) : null}
                      <div className="mt-1 max-w-[220px] truncate text-[11px] text-muted-foreground">
                        {row.actionValue}
                      </div>
                    </td>
                    <td className="text-xs">
                      {labelTrigger(row.triggerKind)}
                      {row.triggerValue ? (
                        <div className="text-muted-foreground">{row.triggerValue}</div>
                      ) : null}
                    </td>
                    <td className="text-xs">
                      {labelCondition(row.conditionKind)}
                      {row.conditionValue ? (
                        <div className="text-muted-foreground">{row.conditionValue}</div>
                      ) : null}
                    </td>
                    <td className="text-xs">{labelAction(row.actionKind)}</td>
                    <td>
                      {session.isAdmin ? (
                        <form action={toggleGuidedAutomation}>
                          <input type="hidden" name="id" value={row.id} />
                          <input type="hidden" name="enabled" value={row.enabled ? "false" : "true"} />
                          <Button type="submit" size="xs" variant="ghost">
                            {row.enabled ? "On" : "Off"}
                          </Button>
                        </form>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {row.enabled ? "On" : "Off"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

        </section>
      </div>
    </AppShell>
  );
}
