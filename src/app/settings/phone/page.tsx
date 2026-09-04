import Link from "next/link";
import { disconnectTelephonyStub, saveTelephonyStub } from "@/app/actions/telephony";
import { SettingsShell } from "@/components/settings/settings-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { requireAdminPage } from "@/lib/auth/guards";
import { getTelephonySettings } from "@/lib/db/queries";
import { TELEPHONY_PROVIDER_LABEL, TELEPHONY_PROVIDERS } from "@/lib/domain";

export const dynamic = "force-dynamic";

export default async function PhoneSettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [session, settings, query] = await Promise.all([
    requireAdminPage(),
    getTelephonySettings(),
    searchParams,
  ]);
  const notice = typeof query.notice === "string" ? query.notice : undefined;

  return (
    <SettingsShell title="Phone line" current="phone">
      {!session.isAdmin ? (
        <p className="mb-4 rounded-md border border-border bg-fit-flag-bg px-3 py-2 text-sm">
          Connecting Twilio or a BYO trunk is Admin-only. Agents still log calls on{" "}
          <Link href="/phone" className="text-primary hover:underline">
            Phone
          </Link>
          .
        </p>
      ) : (
        <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
          Agency-paid trunk later. FitFirst does not buy numbers, store Twilio keys, or place PSTN
          calls. The stub remembers which provider you intend so the call log can show line status.
        </p>
      )}
      {notice === "telephony-stub" ? (
        <p className="mb-3 rounded-md border border-dashed border-border px-3 py-2 text-sm">
          Saved as a stub. No vendor was called.
        </p>
      ) : null}
      {notice === "telephony-disconnected" ? (
        <p className="mb-3 rounded-md border border-dashed border-border px-3 py-2 text-sm">
          Line marked disconnected. Call history stays on the desk.
        </p>
      ) : null}

      <form action={saveTelephonyStub} className="ff-card max-w-xl space-y-3 p-4">
        <fieldset disabled={!session.isAdmin} className="space-y-3">
          <div>
            <Label className="text-xs">Provider</Label>
            <select
              name="provider"
              defaultValue={settings?.provider ?? "none"}
              className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
            >
              {TELEPHONY_PROVIDERS.map((p) => (
                <option key={p} value={p}>
                  {TELEPHONY_PROVIDER_LABEL[p]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-xs">Display from (agency number)</Label>
            <Input
              name="displayFrom"
              defaultValue={settings?.displayFrom ?? ""}
              className="mt-1 h-8"
              placeholder="(321) 555-0100"
            />
          </div>
          <div>
            <Label className="text-xs">Account label</Label>
            <Input
              name="accountLabel"
              defaultValue={settings?.accountLabel ?? ""}
              className="mt-1 h-8"
              placeholder="FitFirst main · Twilio SID later"
            />
          </div>
          <div>
            <Label className="text-xs">Notes</Label>
            <Textarea
              name="notes"
              defaultValue={settings?.notes ?? ""}
              className="mt-1 min-h-20"
              placeholder="Agency pays. Do not paste auth tokens."
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Status: {settings?.connected ? "connected (stub)" : "not connected"}
            {settings?.lastConnectStatus ? ` · last ${settings.lastConnectStatus}` : ""}
          </p>
          {session.isAdmin ? (
            <div className="flex flex-wrap gap-2">
              <Button type="submit" size="sm">
                Save phone line
              </Button>
            </div>
          ) : null}
        </fieldset>
      </form>
      {session.isAdmin && settings?.connected ? (
        <form action={disconnectTelephonyStub} className="mt-3">
          <Button type="submit" size="sm" variant="outline">
            Disconnect stub
          </Button>
        </form>
      ) : null}
    </SettingsShell>
  );
}
