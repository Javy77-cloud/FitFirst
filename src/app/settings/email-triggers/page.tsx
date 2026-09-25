import { runDueEmailJobs, saveEmailTrigger } from "@/app/actions/templates";
import { SettingsShell } from "@/components/settings/settings-shell";
import { EmailActivityList } from "@/components/templates/email-activity";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { listEmailJobs, listEmailTemplates, listEmailTriggers } from "@/lib/db/template-queries";
import { listSendAccounts } from "@/lib/templates/connectors";
import { requireAdminPage } from "@/lib/auth/guards";
import { EMAIL_DELAY_UNITS, SEND_FROM_LABELS, SEND_FROM_PROVIDERS } from "@/lib/domain";

export const dynamic = "force-dynamic";

export default async function EmailTriggersPage() {
  const session = await requireAdminPage();
  const [triggers, templates, accounts, jobs] = await Promise.all([
    listEmailTriggers(),
    listEmailTemplates(),
    listSendAccounts(),
    listEmailJobs(),
  ]);
  const anyConnected = accounts.some((account) => account.connected);

  return (
    <SettingsShell
      title="Email triggers"
      current="triggers"
      actions={
        <form action={runDueEmailJobs}>
          <Button type="submit" size="sm" variant="outline">
            Run due sends
          </Button>
        </form>
      }
    >

      {!anyConnected ? (
        <div className="mb-4 rounded-md border border-border bg-fit-flag-bg px-3 py-2 text-sm text-navy">
          No inbox connected. Due jobs stay queued and show <strong>connect email to send</strong>.
          Use a demo connect below — live OAuth is not implemented on this desk.
        </div>
      ) : null}

      <section className="mb-4 ff-card p-4">
        <h2 className="text-sm font-semibold text-navy">Send from</h2>

        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {accounts.map((account) => (
            <div key={account.provider} className="rounded-md border border-border bg-card p-3">
              <div className="text-sm font-medium">{account.label}</div>
              <div className="mt-1 text-helper text-muted-foreground">
                {account.connected ? account.accountEmail ?? "connected" : "disconnected"}
              </div>
              <p className="mt-2 text-helper text-muted-foreground">
                {account.connected ? "Marked connected" : "Not connected"}
              </p>
            </div>
          ))}
        </div>
      </section>

      <div className="space-y-4">
        {triggers.length === 0 ? (
          <p className="ff-card px-4 py-6 text-sm text-muted-foreground">No email triggers yet.</p>
        ) : (
          triggers.map(({ trigger, template }) => (
            <form
              key={trigger.id}
              action={saveEmailTrigger}
              className="ff-card grid gap-3 p-4 md:grid-cols-2 lg:grid-cols-3"
            >
              <input type="hidden" name="id" value={trigger.id} />
              <div className="lg:col-span-3">
                <div className="text-sm font-semibold text-navy">{trigger.name}</div>
                <p className="text-helper text-muted-foreground">
                  {(trigger.eventKind ?? trigger.kind) === "closed_won"
                    ? "Anchor: Closed Won date"
                    : "Anchor: policy expiration"}
                  {"createBrokerTask" in trigger && trigger.createBrokerTask
                    ? " · also creates an in-app broker task"
                    : ""}
                </p>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="enabled"
                  value="true"
                  defaultChecked={trigger.enabled}
                />
                Enabled
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="emailClient"
                  value="true"
                  defaultChecked={
                    "emailClient" in trigger ? Boolean(trigger.emailClient) : true
                  }
                />
                Email the client
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="createBrokerTask"
                  value="true"
                  defaultChecked={
                    "createBrokerTask" in trigger ? Boolean(trigger.createBrokerTask) : false
                  }
                />
                In-app task for the broker
              </label>
              <div>
                <Label className="text-xs">Delay</Label>
                <div className="mt-1 flex gap-2">
                  <Input
                    name="delayAmount"
                    type="number"
                    min={0}
                    defaultValue={Number(trigger.delayAmount ?? trigger.delayDays ?? 0)}
                    className="h-8 w-20"
                  />
                  <select
                    name="delayUnit"
                    defaultValue={
                      "delayUnit" in trigger && typeof trigger.delayUnit === "string"
                        ? trigger.delayUnit
                        : "days"
                    }
                    className="h-8 rounded-md border border-input bg-card px-2 text-sm"
                  >
                    {EMAIL_DELAY_UNITS.map((unit) => (
                      <option key={unit} value={unit}>
                        {unit}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <Label className="text-xs">Template</Label>
                <select
                  name="templateId"
                  defaultValue={trigger.templateId ?? ""}
                  className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
                >
                  {templates.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-helper text-muted-foreground">Now: {template.name}</p>
              </div>
              <div>
                <Label className="text-xs">Send from</Label>
                <select
                  name="sendFromProvider"
                  defaultValue={
                    "sendFromProvider" in trigger && typeof trigger.sendFromProvider === "string"
                      ? trigger.sendFromProvider
                      : SEND_FROM_PROVIDERS[0]
                  }
                  className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
                >
                  {SEND_FROM_PROVIDERS.map((provider) => (
                    <option key={provider} value={provider}>
                      {SEND_FROM_LABELS[provider]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="lg:col-span-3">
                <Button type="submit" size="sm">
                  Save trigger
                </Button>
              </div>
            </form>
          ))
        )}
      </div>

      <section className="mt-6 ff-card overflow-hidden">
        <div className="border-b border-border px-4 py-2 text-sm font-semibold text-navy">
          Send queue
        </div>
        <EmailActivityList
          jobs={jobs}
          empty="No client sends queued. Closed Won schedules the review and four-month check-in from the won date."
        />
      </section>
    </SettingsShell>
  );
}
