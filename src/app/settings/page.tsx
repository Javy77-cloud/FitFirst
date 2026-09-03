import { AppShell } from "@/components/app-shell";
import { listEmailTemplates, listEmailTriggers } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [templates, triggers] = await Promise.all([listEmailTemplates(), listEmailTriggers()]);

  return (
    <AppShell title="Settings">
      <section className="ff-card mb-4 max-w-2xl p-4">
        <h2 className="text-sm font-semibold text-navy">Phone line</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Click-to-call on a record writes an in-app Alerts ping only. There is no Twilio, Vonage,
          or email. The softphone stays a stub.
        </p>
        <div className="mt-4 rounded-md border border-dashed border-border px-3 py-4 text-sm">
          <div className="font-medium text-navy">Connect your phone line later</div>
          <p className="mt-1 text-muted-foreground">
            Bring-your-own trunk. Do not paste vendor keys into the app.
          </p>
          <button
            type="button"
            disabled
            className="mt-3 h-8 rounded-md border border-input bg-muted px-3 text-xs text-muted-foreground"
          >
            Connect phone line (not configured)
          </button>
        </div>
      </section>

      <section className="ff-card mb-4 max-w-2xl space-y-3 p-4">
        <h2 className="text-sm font-semibold text-navy">Email template library</h2>
        <p className="text-xs text-muted-foreground">
          Seeded stubs. Bind can queue a job on won date. This page does not send mail.
        </p>
        {templates.length === 0 ? (
          <p className="text-sm text-muted-foreground">No templates seeded.</p>
        ) : (
          templates.map((tpl) => (
            <div key={tpl.id} className="rounded-md border border-border p-3 text-sm">
              <div className="font-medium text-navy">{tpl.name}</div>
              <div className="text-xs uppercase text-muted-foreground">{tpl.slug}</div>
              <div className="mt-1 text-xs text-muted-foreground">Subject: {tpl.subject}</div>
              <p className="mt-1 text-sm">{tpl.body}</p>
            </div>
          ))
        )}
      </section>

      <section className="ff-card max-w-2xl space-y-3 p-4">
        <h2 className="text-sm font-semibold text-navy">Triggers (stubs only)</h2>
        <p className="text-xs text-muted-foreground">
          Hung on won date, not pipeline stage. ARCHIVE does not cancel these. No SendGrid.
        </p>
        {triggers.length === 0 ? (
          <p className="text-sm text-muted-foreground">No trigger stubs.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {triggers.map((trigger) => (
              <li key={trigger.id} className="rounded-md border border-dashed border-border px-3 py-2">
                <div className="font-medium text-navy">{trigger.name}</div>
                <div className="text-xs text-muted-foreground">
                  {trigger.kind} · +{trigger.delayDays} day · hang off {trigger.hangOff} ·{" "}
                  {trigger.enabled ? "enabled stub" : "off"}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AppShell>
  );
}
