import Link from "next/link";
import { removeInboundHook, saveInboundHook } from "@/app/actions/developer-hub";
import { AppShell } from "@/components/app-shell";
import { AutomationsModuleNav } from "@/components/automations/module-nav";
import { AutomationsNotice } from "@/components/automations/notice";
import { StatusChip } from "@/components/developer-hub/status-chip";
import { HardDeleteForm } from "@/components/desk/hard-delete-form";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireSignedIn } from "@/lib/auth/guards";
import { listDeveloperWebhooks, listInboundHooks, listInboundPayloads } from "@/lib/developer-hub/store";
import { WEBHOOK_EVENT_LABEL, isWebhookEvent } from "@/lib/developer-hub/types";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function WebhooksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireSignedIn();
  const query = await searchParams;
  const [hooks, inbound, payloads] = await Promise.all([
    listDeveloperWebhooks(),
    listInboundHooks(),
    listInboundPayloads(undefined, 8),
  ]);

  return (
    <AppShell
      title="Webhooks"
      actions={
        <Link href="/automations/webhooks/new" className={cn(buttonVariants())}>
          New outbound
        </Link>
      }
    >
      <AutomationsModuleNav />
      <AutomationsNotice
        notice={typeof query.notice === "string" ? query.notice : undefined}
        error={typeof query.error === "string" ? query.error : undefined}
      />

      <section className="ff-card mb-4 overflow-hidden">
        <div className="border-b border-border px-4 py-2 text-sm font-semibold text-navy">Outbound</div>
        {hooks.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">No outbound webhooks.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="ff-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Event</th>
                  <th>URL</th>
                  <th>Enabled</th>
                </tr>
              </thead>
              <tbody>
                {hooks.map((hook) => (
                  <tr key={hook.id}>
                    <td>
                      <Link
                        href={`/automations/webhooks/${hook.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {hook.name}
                      </Link>
                    </td>
                    <td>
                      {isWebhookEvent(hook.event) ? WEBHOOK_EVENT_LABEL[hook.event] : hook.event}
                    </td>
                    <td className="max-w-[240px] truncate font-mono text-xs">{hook.targetUrl}</td>
                    <td>{hook.enabled ? <StatusChip status="working" /> : "Off"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <section className="ff-card mb-4 p-4">
        <h2 className="text-sm font-semibold text-navy">Inbound Signals</h2>
        <form action={saveInboundHook} className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <div>
            <Label className="text-xs">Name</Label>
            <Input name="name" className="mt-1 h-8" required />
          </div>
          <div>
            <Label className="text-xs">Slug</Label>
            <Input name="slug" className="mt-1 h-8" placeholder="desk-echo" />
          </div>
          <div className="flex items-end">
            <Button type="submit" size="sm">
              Add slug
            </Button>
          </div>
        </form>
        <ul className="mt-3 space-y-2">
          {inbound.map((hook) => (
            <li key={hook.id} className="flex items-center justify-between gap-2 text-sm">
              <span>
                <span className="font-medium text-navy">{hook.name}</span>{" "}
                <code className="text-xs">/api/dev/webhooks/inbound/{hook.slug}</code>
              </span>
              <HardDeleteForm action={removeInboundHook} subject="this inbound hook">
                <input type="hidden" name="id" value={hook.id} />
                <Button type="submit" size="xs" variant="outline">
                  Remove
                </Button>
              </HardDeleteForm>
            </li>
          ))}
        </ul>
      </section>
      <section className="ff-card overflow-hidden">
        <div className="border-b border-border px-4 py-2 text-sm font-semibold text-navy">
          Recent inbound payloads
        </div>
        {payloads.length === 0 ? (
          <p className="px-4 py-4 text-sm text-muted-foreground">No inbound signals yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {payloads.map((row) => (
              <li key={row.id} className="px-4 py-2 font-mono text-xs">
                {row.slug} · {JSON.stringify(row.payload).slice(0, 160)}
              </li>
            ))}
          </ul>
        )}
      </section>
    </AppShell>
  );
}
