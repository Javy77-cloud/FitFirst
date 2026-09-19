import {
  clearByoOauthCredentials,
  disconnectByoOauth,
  smokeTestByoProvider,
  startByoOauth,
} from "@/app/actions/byo-oauth";
import { ByoOauthCredentialsForm } from "@/components/settings/byo-oauth-credentials-form";
import { ConnectionBadge } from "@/components/settings/connection-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AGENCY_PAYS_VENDOR } from "@/lib/integrations/catalog";
import type { CatalogItem } from "@/lib/integrations/catalog-store";
import { gmailConnectCopy } from "@/lib/integrations/connect-policy";
import { byoOauthSpec, isByoOauthProviderId, type ByoOauthReturnPath } from "@/lib/integrations/oauth-specs";
import { socialConnectStatus, socialConnectStatusLabel } from "@/lib/social/byo";

export function ByoOauthCard({
  item,
  canEdit,
  returnTo = "/settings/integrations",
  soloDesk = false,
}: {
  item: CatalogItem;
  canEdit: boolean;
  returnTo?: ByoOauthReturnPath;
  soloDesk?: boolean;
}) {
  if (!isByoOauthProviderId(item.id)) return null;
  const spec = byoOauthSpec(item.id);
  const ready = item.hasCredentials;
  const connected = item.connected && item.connectMode === "byo";
  const status = socialConnectStatus({
    connected,
    hasCredentials: item.hasCredentials,
    connectMode: item.connectMode,
    paidWall: false,
    lastOauthError: item.lastOauthError,
  });
  const connectLabel =
    item.id === "gmail"
      ? soloDesk
        ? "Connect personal Gmail"
        : "Connect Gmail"
      : item.id === "yahoo"
        ? "Connect Yahoo Mail"
        : item.id === "google_calendar"
          ? "Connect Google Calendar"
          : item.id === "outlook_calendar"
            ? "Connect Outlook Calendar"
            : item.id === "google_meet"
              ? "Connect Google Meet"
              : "Connect DocuSign sandbox";

  return (
    <article
      id={item.id}
      className="flex flex-col rounded-md border border-border bg-card p-3"
      data-provider={item.id}
      data-connected={connected ? "true" : "false"}
      data-connect-status={status}
      data-has-credentials={item.hasCredentials ? "true" : "false"}
      data-has-stored-credentials={item.hasStoredCredentials ? "true" : "false"}
      data-has-env-credentials={item.hasEnvCredentials ? "true" : "false"}
      data-oauth-byo="1"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2.5">
          <span
            aria-hidden
            className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-secondary text-[11px] font-semibold text-navy"
          >
            {item.initials}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <h3 className="text-sm font-semibold text-navy">{item.name}</h3>
              {item.optional ? (
                <span className="rounded-sm bg-secondary px-1.5 py-0.5 text-caption font-semibold uppercase text-muted-foreground">
                  Optional
                </span>
              ) : null}
            </div>
            <p className="mt-0.5 text-helper text-muted-foreground">{item.blurb}</p>
          </div>
        </div>
        <ConnectionBadge
          connected={connected}
          label={socialConnectStatusLabel(status)}
        />
      </div>

      <p className="mt-2 text-helper text-muted-foreground">{AGENCY_PAYS_VENDOR}</p>
      <p className="text-helper text-muted-foreground">{item.byoNote}</p>
      <p className="mt-1 text-helper text-muted-foreground">{spec.worksWhen}</p>
      {item.id === "gmail" ? (
        <p className="mt-1 text-helper text-navy">{gmailConnectCopy(soloDesk)}</p>
      ) : null}
      {item.hasEnvCredentials ? (
        <p className="mt-1 text-helper text-navy">
          {item.hasStoredCredentials
            ? `Settings-pasted ${spec.vendor} keys override environment. Replace or Clear to change which pair Connect uses.`
            : `Using ${spec.vendor} client from environment. Saving a Client ID + Secret here overrides it.`}
        </p>
      ) : null}
      {connected && item.accountLabel ? (
        <p className="mt-1 text-xs text-navy" data-connected-account="">
          {item.accountLabel}
          {item.tokenAccountEmail ? ` · ${item.tokenAccountEmail}` : ""}
          {item.lastConnectStatus ? ` · ${item.lastConnectStatus}` : ""}
        </p>
      ) : null}
      {item.lastOauthError ? (
        <p className="mt-2 rounded-md border border-dashed border-border bg-secondary/50 px-2.5 py-2 text-helper text-navy">
          <span className="font-semibold">{spec.vendor} OAuth wall.</span> {item.lastOauthError}
        </p>
      ) : null}

      {canEdit ? (
        <div className="mt-3 space-y-3">
          <ByoOauthCredentialsForm item={item} spec={spec} returnTo={returnTo} />

          <div className="flex flex-wrap items-center gap-2">
            {ready ? (
              <form action={startByoOauth}>
                <input type="hidden" name="provider" value={item.id} />
                <input type="hidden" name="next" value={returnTo} />
                <Button type="submit" size="sm">
                  {connectLabel}
                </Button>
              </form>
            ) : null}
            <form action={clearByoOauthCredentials} data-ff-byo-clear={item.id}>
              <input type="hidden" name="provider" value={item.id} />
              <input type="hidden" name="next" value={returnTo} />
              <Button type="submit" size="sm" variant="ghost">
                Clear app keys
              </Button>
            </form>
            {connected ? (
              <form action={disconnectByoOauth}>
                <input type="hidden" name="provider" value={item.id} />
                <input type="hidden" name="next" value={returnTo} />
                <Button type="submit" size="sm" variant="outline">
                  Disconnect
                </Button>
              </form>
            ) : null}
          </div>
          <p className="text-caption text-muted-foreground" data-ff-byo-clear-copy="">
            {item.hasEnvCredentials
              ? `Clear removes Settings-pasted ${spec.clientIdLabel} and ${spec.clientSecretLabel}. ${spec.vendor} environment credentials still apply after clear.`
              : `Clear removes Settings-pasted ${spec.clientIdLabel} and ${spec.clientSecretLabel}. Paste a new pair to connect.`}
          </p>

          {connected ? (
            <div className="flex flex-wrap items-end gap-2">
              {spec.smokeTests.includes("read") ? (
                <form action={smokeTestByoProvider}>
                  <input type="hidden" name="provider" value={item.id} />
                  <input type="hidden" name="next" value={returnTo} />
                  <input type="hidden" name="kind" value="read" />
                  <Button type="submit" size="sm" variant="outline">
                    Read latest
                  </Button>
                </form>
              ) : null}
              {spec.smokeTests.includes("send") ? (
                <form action={smokeTestByoProvider} className="flex flex-wrap items-end gap-2">
                  <input type="hidden" name="provider" value={item.id} />
                  <input type="hidden" name="next" value={returnTo} />
                  <input type="hidden" name="kind" value="send" />
                  <div>
                    <Label className="text-xs">Smoke-test to</Label>
                    <Input
                      name="to"
                      type="email"
                      defaultValue={item.tokenAccountEmail ?? ""}
                      className="mt-1 h-8 w-56"
                      placeholder="you@gmail.com"
                    />
                  </div>
                  <Button type="submit" size="sm" variant="outline">
                    Send test
                  </Button>
                </form>
              ) : null}
              {spec.smokeTests.includes("busy") ? (
                <form action={smokeTestByoProvider}>
                  <input type="hidden" name="provider" value={item.id} />
                  <input type="hidden" name="next" value={returnTo} />
                  <input type="hidden" name="kind" value="busy" />
                  <Button type="submit" size="sm" variant="outline">
                    Sync busy now
                  </Button>
                </form>
              ) : null}
              {spec.smokeTests.includes("ping") ? (
                <form action={smokeTestByoProvider}>
                  <input type="hidden" name="provider" value={item.id} />
                  <input type="hidden" name="next" value={returnTo} />
                  <input type="hidden" name="kind" value="ping" />
                  <Button type="submit" size="sm" variant="outline">
                    Ping account
                  </Button>
                </form>
              ) : null}
            </div>
          ) : null}
          {ready ? <p className="text-caption text-muted-foreground">{spec.stubbed}</p> : null}
        </div>
      ) : (
        <p className="mt-3 text-helper text-muted-foreground">
          Agency Admin pastes or replaces the {spec.vendor} app and starts OAuth. {AGENCY_PAYS_VENDOR}
        </p>
      )}
    </article>
  );
}
