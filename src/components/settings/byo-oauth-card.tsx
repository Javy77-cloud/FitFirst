import {
  clearByoOauthCredentials,
  disconnectByoOauth,
  saveByoOauthCredentials,
  smokeTestByoProvider,
  startByoOauth,
} from "@/app/actions/byo-oauth";
import { ConnectionBadge } from "@/components/settings/connection-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AGENCY_PAYS_VENDOR } from "@/lib/integrations/catalog";
import type { CatalogItem } from "@/lib/integrations/catalog-store";
import { gmailConnectCopy } from "@/lib/integrations/connect-policy";
import {
  byoOauthSpec,
  isByoOauthProviderId,
  type ByoOauthReturnPath,
} from "@/lib/integrations/oauth-specs";
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
  const status = socialConnectStatus({
    connected: item.connected && item.connectMode === "byo",
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
      data-connected={item.connected && item.connectMode === "byo" ? "true" : "false"}
      data-connect-status={status}
      data-has-credentials={item.hasCredentials ? "true" : "false"}
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
          connected={item.connected && item.connectMode === "byo"}
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
        <p className="mt-1 text-helper text-navy">Using {spec.vendor} client from environment. Settings paste overrides it.</p>
      ) : null}
      {item.connected && item.connectMode === "byo" && item.accountLabel ? (
        <p className="mt-1 text-xs text-navy">
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
          <form action={saveByoOauthCredentials} className="space-y-2">
            <input type="hidden" name="provider" value={item.id} />
            <input type="hidden" name="next" value={returnTo} />
            <div>
              <Label className="text-xs">{spec.clientIdLabel}</Label>
              <Input
                name="clientId"
                defaultValue={item.clientId ?? ""}
                className="mt-1"
                autoComplete="off"
                placeholder={spec.developerAppName}
              />
            </div>
            <div>
              <Label className="text-xs">{spec.clientSecretLabel}</Label>
              <Input
                name="clientSecret"
                type="password"
                defaultValue={item.hasCredentials && !item.hasEnvCredentials ? "••••••••••••" : ""}
                className="mt-1"
                autoComplete="new-password"
                placeholder={item.hasCredentials ? "Saved · leave to keep" : "Agency secret only"}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="submit" size="sm" variant="outline">
                Save credentials
              </Button>
              <a
                href={spec.developerUrl}
                target="_blank"
                rel="noopener"
                className="text-helper text-primary hover:underline"
              >
                Create free {spec.vendor} app
              </a>
            </div>
          </form>

          <div className="flex flex-wrap items-center gap-2">
            <form action={startByoOauth}>
              <input type="hidden" name="provider" value={item.id} />
              <input type="hidden" name="next" value={returnTo} />
              <Button type="submit" size="sm">
                {connectLabel}
              </Button>
            </form>
            {item.hasCredentials && !item.hasEnvCredentials ? (
              <form action={clearByoOauthCredentials}>
                <input type="hidden" name="provider" value={item.id} />
                <input type="hidden" name="next" value={returnTo} />
                <Button type="submit" size="sm" variant="ghost">
                  Clear app keys
                </Button>
              </form>
            ) : null}
            {item.connected && item.connectMode === "byo" ? (
              <form action={disconnectByoOauth}>
                <input type="hidden" name="provider" value={item.id} />
                <input type="hidden" name="next" value={returnTo} />
                <Button type="submit" size="sm" variant="outline">
                  Disconnect
                </Button>
              </form>
            ) : null}
          </div>

          {item.connected && item.connectMode === "byo" ? (
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
          <p className="text-caption text-muted-foreground">{spec.stubbed}</p>
        </div>
      ) : (
        <p className="mt-3 text-helper text-muted-foreground">
          Agency Admin pastes the {spec.vendor} app and starts OAuth. {AGENCY_PAYS_VENDOR}
        </p>
      )}
    </article>
  );
}
