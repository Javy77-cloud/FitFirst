import { connectDemoInbox, runDueEmailJobs, saveEmailTrigger } from "@/app/actions/templates";
import { AppShell } from "@/components/app-shell";
import { EmailActivityList, SettingsSubnav } from "@/components/templates/email-activity";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { listEmailJobs, listEmailTemplates, listEmailTriggers } from "@/lib/db/template-queries";
import { listSendAccounts } from "@/lib/templates/connectors";
import { EMAIL_DELAY_UNITS, SEND_FROM_LABELS, SEND_FROM_PROVIDERS } from "@/lib/domain";

export const dynamic = "force-dynamic";

export default async function EmailTriggersPage() {
  const [triggers, templates, accounts, jobs] = await Promise.all([
    listEmailTriggers(),
    listEmailTemplates(),
    listSendAccounts(),
    listEmailJobs(),
  ]);
  const anyConnected = accounts.some((account) => account.connected);

  return (
    <AppShell
      title="Email triggers"
      actions={
        <form action={runDueEmailJobs}>
          <Button type="submit" size="sm" variant="outline">
            Run due sends
          </Button>
        </form>
      }
    >
      <SettingsSubnav current="triggers" />
      <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
        Jobs hang off the won date and the policy expiration. Archiving a deal does not drop them.
        Internal renewal work is an in-app task. Client mail goes through whichever inbox is
        connected. Nothing emails the broker.
      </p>

      {!anyConnected ? (
        <div className="mb-4 rounded-md border border-border bg-fit-flag-bg px-3 py-2 text-sm text-navy">
          No inbox connected. Due jobs stay queued and show <strong>connect email to send</strong>.
          Use a demo connect below — live OAuth is not implemented on this desk.
        </div>
      ) : null}

      <section className="mb-4 ff-card p-4">
        <h2 className="text-sm font-semibold text-navy">Send from</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Google, Outlook, Yahoo, Zoho Mail, or IMAP. If the work-email slice is merged, those
          connections win. Otherwise this catalog is the stub.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {accounts.map((account) => (
            <div key={account.provider} className="rounded-md border border-border bg-card p-3">
              <div className="text-sm font-medium">{account.label}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {account.connected ? account.accountEmail ?? "connected" : "disconnected"}
              </div>
              {!account.connected ? (
                <form action={connectDemoInbox} className="mt-2">
                  <input type="hidden" name="provider" value={account.provider} />
                  <Button type="submit" size="xs" variant="outline">
                    Connect demo
                  </Button>
                </form>
              ) : (
                <p className="mt-2 text-[11px] text-fit-green">Demo connected</p>
              )}
            </div>
          ))}
        </div>
      </section>

      <div className="space-y-4">
        {triggers.length === 0 ? (
          <p className="ff-card px-4 py-6 text-sm text-muted-foreground">
            No triggers seeded. Run <code>npm run db:seed</code>.
          </p>
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
                <p className="text-xs text-muted-foreground">
                  {trigger.eventKind === "closed_won"
                    ? "Anchor: Closed Won date"
                    : "Anchor: policy expiration"}
                  {trigger.createBrokerTask ? " · also creates an in-app broker task" : ""}
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
                  defaultChecked={trigger.emailClient}
                />
                Email the client
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="createBrokerTask"
                  value="true"
                  defaultChecked={trigger.createBrokerTask}
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
                    defaultValue={trigger.delayAmount}
                    className="h-8 w-20"
                  />
                  <select
                    name="delayUnit"
                    defaultValue={trigger.delayUnit}
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
                  defaultValue={trigger.templateId}
                  className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
                >
                  {templates.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-muted-foreground">Now: {template.name}</p>
              </div>
              <div>
                <Label className="text-xs">Send from</Label>
                <select
                  name="sendFromProvider"
                  defaultValue={trigger.sendFromProvider}
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
    </AppShell>
  );
}
