import Link from "next/link";
import { saveInboundHook, removeInboundHook } from "@/app/actions/developer-hub";
import { StatusChip } from "@/components/developer-hub/status-chip";
import { SettingsShell } from "@/components/settings/settings-shell";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireAdminPage } from "@/lib/auth/guards";
import {
  listDeveloperWebhooks,
  listInboundHooks,
  listInboundPayloads,
} from "@/lib/developer-hub/store";
import { WEBHOOK_EVENT_LABEL, isWebhookEvent } from "@/lib/developer-hub/types";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DeveloperWebhooksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage();
  const query = await searchParams;
  const notice = typeof query.notice === "string" ? query.notice : undefined;
  const [hooks, inbound, payloads] = await Promise.all([
    listDeveloperWebhooks(),
    listInboundHooks(),
    listInboundPayloads(undefined, 8),
  ]);

  return (
    <SettingsShell
      title="Webhooks"
      current="webhooks"
      actions={
        <Link href="/settings/developer/webhooks/new" className={cn(buttonVariants())}>
          New outbound
        </Link>
      }
    >
      <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
        Outbound: subscribe to desk events. Matching in-app writes enqueue a delivery row. Send
        test POSTs when the URL is localhost; otherwise it records a stub attempt. Inbound
        Signals: <code>POST /api/dev/webhooks/inbound/[slug]</code> stores the payload and creates
        an admin Alert.
      </p>
      {notice === "deleted" ? (
        <p className="mb-3 rounded-md border border-dashed border-border px-3 py-2 text-sm">Webhook deleted.</p>
      ) : null}
      {notice === "inbound" ? (
        <p className="mb-3 rounded-md bg-fit-green-bg px-3 py-2 text-sm text-navy">Inbound slug saved.</p>
      ) : null}

      <section className="ff-card mb-4 overflow-hidden">
        <div className="border-b border-border px-4 py-2 text-sm font-semibold text-navy">
          Outbound
        </div>
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
                        href={`/settings/developer/webhooks/${hook.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {hook.name}
                      </Link>
                    </td>
                    <td>
                      <code className="text-xs">
                        {isWebhookEvent(hook.event) ? WEBHOOK_EVENT_LABEL[hook.event] : hook.event}
                      </code>
                    </td>
                    <td className="max-w-[280px] truncate text-xs">{hook.targetUrl}</td>
                    <td>
                      {hook.enabled ? (
                        <StatusChip status="working" />
                      ) : (
                        <span className="text-xs text-muted-foreground">Off</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="ff-card mb-4 p-4">
        <div className="text-sm font-semibold text-navy">Inbound Signals</div>
        <p className="mt-1 text-xs text-muted-foreground">
          Public-ish POST path. No third-party deps. Creates an in-app Alert for admin.
        </p>
        <form action={saveInboundHook} className="mt-3 grid gap-3 sm:grid-cols-3 sm:items-end">
          <div>
            <Label className="text-xs">Name</Label>
            <Input name="name" className="mt-1 h-8" placeholder="Carrier status" required />
          </div>
          <div>
            <Label className="text-xs">Slug</Label>
            <Input name="slug" className="mt-1 h-8" placeholder="carrier-status" />
          </div>
          <Button type="submit" size="sm">
            Add inbound slug
          </Button>
        </form>
        <ul className="mt-4 space-y-2">
          {inbound.length === 0 ? (
            <li className="text-sm text-muted-foreground">No inbound slugs.</li>
          ) : (
            inbound.map((hook) => (
              <li
                key={hook.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
              >
                <div>
                  <div className="font-medium text-navy">{hook.name}</div>
                  <code className="text-xs">/api/dev/webhooks/inbound/{hook.slug}</code>
                </div>
                <form action={removeInboundHook}>
                  <input type="hidden" name="id" value={hook.id} />
                  <Button type="submit" size="xs" variant="outline">
                    Remove
                  </Button>
                </form>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="ff-card overflow-hidden">
        <div className="border-b border-border px-4 py-2 text-sm font-semibold text-navy">
          Recent inbound payloads
        </div>
        {payloads.length === 0 ? (
          <p className="px-4 py-4 text-sm text-muted-foreground">None yet. POST to a slug to store one.</p>
        ) : (
          <ul className="divide-y divide-border">
            {payloads.map((row) => (
              <li key={row.id} className="px-4 py-2 text-xs">
                <span className="font-medium text-navy">{row.slug}</span>{" "}
                <span className="text-muted-foreground">
                  {row.createdAt.toISOString().replace("T", " ").slice(0, 19)}
                </span>
                <div className="mt-1 truncate font-mono">{JSON.stringify(row.payload)}</div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </SettingsShell>
  );
}
