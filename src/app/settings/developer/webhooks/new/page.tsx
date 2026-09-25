import { saveDeveloperWebhook } from "@/app/actions/developer-hub";
import { SettingsShell } from "@/components/settings/settings-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireAdminPage } from "@/lib/auth/guards";
import { WEBHOOK_EVENTS, WEBHOOK_EVENT_LABEL } from "@/lib/developer-hub/types";

export const dynamic = "force-dynamic";

export default async function NewDeveloperWebhookPage() {
  await requireAdminPage();

  return (
    <SettingsShell title="New outbound webhook" current="webhooks">

      <form action={saveDeveloperWebhook} className="ff-card max-w-xl space-y-3 p-4">
        <div>
          <Label className="text-xs">Name</Label>
          <Input name="name" className="mt-1 h-8" required />
        </div>
        <div>
          <Label className="text-xs">Event</Label>
          <select
            name="event"
            className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
            defaultValue="deal.stage_changed"
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
          <Input
            name="targetUrl"
            className="mt-1 h-8"
            placeholder="http://127.0.0.1:43147/api/dev/webhooks/inbound/desk-echo"
            required
          />
        </div>
        <div>
          <Label className="text-xs">Shared secret (optional)</Label>
          <Input name="secret" className="mt-1 h-8" />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="enabled" defaultChecked />
          Enabled
        </label>
        <Button type="submit" size="sm">
          Create webhook
        </Button>
      </form>
    </SettingsShell>
  );
}
