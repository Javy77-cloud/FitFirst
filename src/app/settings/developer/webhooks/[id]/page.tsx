import Link from "next/link";
import { notFound } from "next/navigation";
import {
  removeDeveloperWebhook,
  saveDeveloperWebhook,
  testDeveloperWebhook,
} from "@/app/actions/developer-hub";
import { SettingsShell } from "@/components/settings/settings-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireAdminPage } from "@/lib/auth/guards";
import { isLocalDeliveryUrl } from "@/lib/developer-hub/events";
import { getDeveloperWebhook, listWebhookDeliveries } from "@/lib/developer-hub/store";
import { WEBHOOK_EVENTS, WEBHOOK_EVENT_LABEL } from "@/lib/developer-hub/types";

export const dynamic = "force-dynamic";

export default async function DeveloperWebhookDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage();
  const { id } = await params;
  const query = await searchParams;
  const notice = typeof query.notice === "string" ? query.notice : undefined;
  const status = typeof query.status === "string" ? query.status : undefined;
  const hook = await getDeveloperWebhook(id);
  if (!hook) notFound();
  const deliveries = await listWebhookDeliveries(hook.id);

  return (
    <SettingsShell title={hook.name} current="webhooks">
      {notice === "saved" || notice === "created" ? (
        <p className="mb-3 rounded-md bg-fit-green-bg px-3 py-2 text-sm text-navy">Webhook saved.</p>
      ) : null}
      {notice === "test" ? (
        <p className="mb-3 rounded-md border border-dashed border-border px-3 py-2 text-sm">
          Test queued as <code>{status ?? "pending"}</code>.{" "}
          {isLocalDeliveryUrl(hook.targetUrl)
            ? "Localhost URL — FitFirst POSTed."
            : "Remote URL — stub attempt only."}
        </p>
      ) : null}

      <form action={saveDeveloperWebhook} className="ff-card max-w-xl space-y-3 p-4">
        <input type="hidden" name="id" value={hook.id} />
        <div>
          <Label className="text-xs">Name</Label>
          <Input name="name" defaultValue={hook.name} className="mt-1 h-8" required />
        </div>
        <div>
          <Label className="text-xs">Event</Label>
          <select
            name="event"
            defaultValue={hook.event}
            className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
          >
            {WEBHOOK_EVENTS.map((event) => (
              <option key={event} value={event}>
                {WEBHOOK_EVENT_LABEL[event]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label className="text-xs">Target URL</Label>
          <Input name="targetUrl" defaultValue={hook.targetUrl} className="mt-1 h-8" required />
        </div>
        <div>
          <Label className="text-xs">Shared secret</Label>
          <Input name="secret" defaultValue={hook.secret ?? ""} className="mt-1 h-8" />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="enabled" defaultChecked={hook.enabled} />
          Enabled
        </label>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" size="sm">
            Save webhook
          </Button>
        </div>
      </form>

      <form action={testDeveloperWebhook} className="mt-3">
        <input type="hidden" name="id" value={hook.id} />
        <Button type="submit" size="sm" variant="outline">
          Send test
        </Button>
      </form>

      <section className="ff-card mt-4 max-w-3xl overflow-hidden">
        <div className="border-b border-border px-4 py-2 text-sm font-semibold text-navy">
          Delivery queue
        </div>
        {deliveries.length === 0 ? (
          <p className="px-4 py-4 text-sm text-muted-foreground">
            No deliveries. Change a deal stage or send a test.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="ff-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Status</th>
                  <th>Attempts</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {deliveries.map((row) => (
                  <tr key={row.id}>
                    <td className="whitespace-nowrap text-xs">
                      {row.createdAt.toISOString().replace("T", " ").slice(0, 19)}
                    </td>
                    <td>{row.status}</td>
                    <td>{row.attemptCount}</td>
                    <td className="max-w-[280px] truncate text-xs text-muted-foreground">
                      {row.lastError ?? JSON.stringify(row.payload)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <form action={removeDeveloperWebhook} className="mt-4">
        <input type="hidden" name="id" value={hook.id} />
        <Button type="submit" size="sm" variant="destructive">
          Delete webhook
        </Button>
      </form>
      <p className="mt-3 text-sm">
        <Link href="/settings/developer/webhooks" className="text-primary hover:underline">
          All webhooks
        </Link>
      </p>
    </SettingsShell>
  );
}
