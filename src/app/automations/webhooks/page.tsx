import Link from "next/link";
import { removeInboundHook, saveInboundHook } from "@/app/actions/developer-hub";
import { AutomationsDeveloperFrame } from "@/components/automations/developer-frame";
import { StatusChip } from "@/components/developer-hub/status-chip";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireSignedIn } from "@/lib/auth/guards";
import {
  listDeveloperWebhooks,
  listInboundHooks,
  listInboundPayloads,
} from "@/lib/developer-hub/store";
import { WEBHOOK_EVENT_LABEL, isWebhookEvent } from "@/lib/developer-hub/types";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AutomationsWebhooksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireSignedIn();
  const query = await searchParams;
  const notice = typeof query.notice === "string" ? query.notice : undefined;
  const [hooks, inbound, payloads] = session.isAdmin
    ? await Promise.all([listDeveloperWebhooks(), listInboundHooks(), listInboundPayloads(undefined, 6)])
    : [[], [], []];

  return (
    <AutomationsDeveloperFrame
      title="Webhooks"
      isAdmin={session.isAdmin}
      actions={
        <Link href="/automations/webhooks/new" className={cn(buttonVariants())}>
          New outbound
        </Link>
      }
    >
      <p className="mb-3 max-w-3xl text-sm text-muted-foreground">
        Outbound desk events enqueue a local delivery. Send test POSTs localhost only. Inbound
        Signals: <code>POST /api/dev/webhooks/inbound/[slug]</code>.
      </p>
      {notice === "inbound" ? (
        <p className="mb-3 rounded-md bg-fit-green-bg px-3 py-2 text-sm text-navy">Inbound slug saved.</p>
      ) : null}
      {session.isAdmin ? (
        <>
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
                          <code className="text-xs">
                            {isWebhookEvent(hook.event) ? WEBHOOK_EVENT_LABEL[hook.event] : hook.event}
                          </code>
                        </td>
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
            <form action={saveInboundHook} className="mt-3 grid gap-3 sm:grid-cols-3 sm:items-end">
              <input type="hidden" name="surface" value="automations" />
              <div>
                <Label className="text-xs">Name</Label>
                <Input name="name" className="mt-1 h-8" required />
              </div>
              <div>
                <Label className="text-xs">Slug</Label>
                <Input name="slug" className="mt-1 h-8" placeholder="desk-echo" />
              </div>
              <Button type="submit" size="sm">
                Add inbound slug
              </Button>
            </form>
            <ul className="mt-3 space-y-2">
              {inbound.map((hook) => (
                <li
                  key={hook.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
                >
                  <code className="text-xs">/api/dev/webhooks/inbound/{hook.slug}</code>
                  <form action={removeInboundHook}>
                    <input type="hidden" name="surface" value="automations" />
                    <input type="hidden" name="id" value={hook.id} />
                    <Button type="submit" size="xs" variant="outline">
                      Remove
                    </Button>
                  </form>
                </li>
              ))}
            </ul>
          </section>
          <section className="ff-card overflow-hidden">
            <div className="border-b border-border px-4 py-2 text-sm font-semibold text-navy">
              Recent inbound
            </div>
            {payloads.length === 0 ? (
              <p className="px-4 py-4 text-sm text-muted-foreground">None yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {payloads.map((row) => (
                  <li key={row.id} className="px-4 py-2 text-xs">
                    {row.slug} · {JSON.stringify(row.payload)}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}
    </AutomationsDeveloperFrame>
  );
}
