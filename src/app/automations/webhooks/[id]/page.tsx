import { notFound } from "next/navigation";
import {
  removeDeveloperWebhook,
  saveDeveloperWebhook,
  testDeveloperWebhook,
} from "@/app/actions/developer-hub";
import { AppShell } from "@/components/app-shell";
import { AutomationsModuleNav } from "@/components/automations/module-nav";
import { AutomationsNotice } from "@/components/automations/notice";
import { HardDeleteForm } from "@/components/desk/hard-delete-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireAdminPage } from "@/lib/auth/guards";
import { getDeveloperWebhook, listWebhookDeliveries } from "@/lib/developer-hub/store";
import { WEBHOOK_EVENTS, WEBHOOK_EVENT_LABEL } from "@/lib/developer-hub/types";

export const dynamic = "force-dynamic";

export default async function WebhookDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage();
  const { id } = await params;
  const query = await searchParams;
  const hook = await getDeveloperWebhook(id);
  if (!hook) notFound();
  const deliveries = await listWebhookDeliveries(hook.id);

  return (
    <AppShell title={hook.name}>
      <AutomationsModuleNav />
      <AutomationsNotice notice={typeof query.notice === "string" ? query.notice : undefined} />
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
        <div className="flex gap-2">
          <Button type="submit" size="sm">
            Save
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
        <div className="border-b border-border px-4 py-2 text-sm font-semibold text-navy">Deliveries</div>
        {deliveries.length === 0 ? (
          <p className="px-4 py-4 text-sm text-muted-foreground">No deliveries yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {deliveries.map((row) => (
              <li key={row.id} className="px-4 py-2 text-sm">
                {row.status} · {row.lastError ?? "ok"} · {row.createdAt.toISOString().slice(0, 19)}
              </li>
            ))}
          </ul>
        )}
      </section>
      <HardDeleteForm action={removeDeveloperWebhook} subject="this webhook" className="mt-4">
        <input type="hidden" name="id" value={hook.id} />
        <Button type="submit" size="sm" variant="destructive">
          Delete webhook
        </Button>
      </HardDeleteForm>
    </AppShell>
  );
}
