import Link from "next/link";
import { disconnectEsignStub, saveEsignStub } from "@/app/actions/esign-settings";
import { SettingsShell } from "@/components/settings/settings-shell";
import { ByoOauthCard } from "@/components/settings/byo-oauth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { currentDeskSession } from "@/lib/auth/session";
import { getEsignSettings } from "@/lib/db/queries";
import { ESIGN_SETTINGS_PROVIDER_LABEL, ESIGN_SETTINGS_PROVIDERS } from "@/lib/domain";
import { listCatalogItems } from "@/lib/integrations/catalog-store";

export const dynamic = "force-dynamic";

export default async function EsignSettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [session, settings, query, items] = await Promise.all([
    currentDeskSession(),
    getEsignSettings(),
    searchParams,
    listCatalogItems(),
  ]);
  const docusign = items.find((item) => item.id === "docusign");
  const notice = typeof query.notice === "string" ? query.notice : undefined;
  const provider = settings?.provider ?? "none";

  return (
    <SettingsShell title="E-sign" current="esign">
      {notice === "esign-stub" ? (
        <p className="mb-3 rounded-md border border-dashed border-border px-3 py-2 text-sm">
          Preference saved. No vendor was called.
        </p>
      ) : null}
      {notice === "esign-disconnected" ? (
        <p className="mb-3 rounded-md border border-dashed border-border px-3 py-2 text-sm">
          Provider marked disconnected. Signed apps stay on the Deal.
        </p>
      ) : null}
      {notice === "credentials-saved" ? (
        <p className="mb-3 rounded-md border border-[var(--ff-green)]/30 bg-[var(--ff-green-bg)] px-3 py-2 text-sm">
          DocuSign app credentials saved.
        </p>
      ) : null}
      {notice === "credentials-cleared" ? (
        <p className="mb-3 rounded-md border border-dashed border-border px-3 py-2 text-sm">
          DocuSign app keys cleared. Environment credentials still apply if they are set. Signed apps
          stay on the Deal.
        </p>
      ) : null}

      {docusign ? (
        <div className="mb-4 max-w-xl">
          <ByoOauthCard item={docusign} canEdit={session.isAdmin} returnTo="/settings/esign" />
        </div>
      ) : null}

      <form action={saveEsignStub} className="ff-card max-w-xl space-y-3 p-4">
        <fieldset disabled={!session.isAdmin} className="space-y-3">
          <div>
            <Label className="text-xs">Provider</Label>
            <select
              name="provider"
              defaultValue={provider}
              className="mt-1 h-8 w-full rounded-md border border-input bg-card px-2 text-sm"
            >
              {ESIGN_SETTINGS_PROVIDERS.map((p) => (
                <option key={p} value={p}>
                  {ESIGN_SETTINGS_PROVIDER_LABEL[p]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-xs">Account label</Label>
            <Input
              name="accountLabel"
              defaultValue={settings?.accountLabel ?? ""}
              className="mt-1 h-8"
              placeholder="Agency DocuSign · BYO later"
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
          <p className="text-helper text-muted-foreground">
            Status: {settings?.connected ? "preferred vendor saved" : "not connected"}
            {settings?.lastConnectStatus ? ` · last ${settings.lastConnectStatus}` : ""}
          </p>
          {session.isAdmin ? (
            <Button type="submit" size="sm">
              Save e-sign preference
            </Button>
          ) : null}
        </fieldset>
      </form>
      {session.isAdmin && settings?.connected ? (
        <form action={disconnectEsignStub} className="mt-3">
          <Button type="submit" size="sm" variant="outline">
            Disconnect
          </Button>
        </form>
      ) : null}
      <p className="mt-4 text-sm">
        <Link href="/esign" className="text-primary hover:underline">
          Open e-sign envelopes
        </Link>
      </p>
    </SettingsShell>
  );
}
