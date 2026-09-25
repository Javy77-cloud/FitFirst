import {
  clearSocialByoCredentials,
  saveSocialByoCredentials,
  startSocialByoOAuth,
} from "@/app/actions/social";
import { disconnectCatalogStub } from "@/app/actions/integrations";
import { ConnectionBadge } from "@/components/settings/connection-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AGENCY_PAYS_VENDOR } from "@/lib/integrations/catalog";
import type { CatalogItem } from "@/lib/integrations/catalog-store";
import {
  isPaidWallPlatform,
  isPlatformHostedSocial,
  platformHostedConnectMissingCopy,
  socialByoSpec,
  socialConnectStatus,
  socialConnectStatusLabel,
} from "@/lib/social/byo";
import { isSocialPlatformId } from "@/lib/social/platforms";

export function SocialByoCard({
  item,
  canEdit,
  returnTo = "/settings/social",
}: {
  item: CatalogItem;
  canEdit: boolean;
  returnTo?: "/settings/social" | "/settings/integrations";
}) {
  if (!isSocialPlatformId(item.id)) return null;
  const spec = socialByoSpec(item.id);
  const paidWall = isPaidWallPlatform(item.id);
  const hosted = isPlatformHostedSocial(item.id);
  const platformReady = hosted ? item.hasEnvCredentials : item.hasCredentials;
  const status = socialConnectStatus({
    connected: item.connected,
    hasCredentials: hosted ? false : item.hasCredentials,
    connectMode: item.connectMode,
    paidWall,
    lastOauthError: item.lastOauthError,
  });
  const statusLabel =
    hosted && item.connected && item.connectMode === "byo"
      ? "Connected"
      : socialConnectStatusLabel(status);
  const connectLabel =
    item.id === "facebook"
      ? "Connect Facebook"
      : item.id === "instagram"
        ? "Connect Instagram"
        : item.id === "google_business_profile"
          ? "Connect with Google"
          : item.id === "linkedin"
            ? "Connect with LinkedIn"
            : "Connect (paid wall)";

  return (
    <article
      id={item.id}
      className="flex flex-col rounded-md border border-border bg-card p-3"
      data-provider={item.id}
      data-connected={item.connected ? "true" : "false"}
      data-connect-status={hosted && item.connected && item.connectMode === "byo" ? "connected" : status}
      data-has-credentials={platformReady ? "true" : "false"}
      data-platform-hosted={hosted ? "1" : undefined}
      data-meta-configured={hosted ? (item.hasEnvCredentials ? "true" : "false") : undefined}
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

          </div>
        </div>
        <ConnectionBadge connected={item.connected && item.connectMode === "byo"} label={statusLabel} />
      </div>

      {item.connected && item.accountLabel ? (
        <p className="mt-1 text-xs text-navy">
          {item.accountLabel}
          {item.lastConnectStatus ? ` · ${item.lastConnectStatus}` : ""}
        </p>
      ) : null}
      {item.lastOauthError ? (
        <p className="mt-2 rounded-md border border-dashed border-border bg-secondary/50 px-2.5 py-2 text-helper text-navy">
          <span className="font-semibold">{spec.wallTitle}.</span> {item.lastOauthError}
        </p>
      ) : null}
      {paidWall && !item.lastOauthError ? (
        <p className="mt-2 rounded-md border border-dashed border-border bg-fit-flag-bg px-2.5 py-2 text-helper text-navy">
          <span className="font-semibold">{spec.wallTitle}.</span>
        </p>
      ) : null}

      {hosted ? (
        <HostedMetaActions
          item={item}
          canEdit={canEdit}
          returnTo={returnTo}
          connectLabel={connectLabel}
        />
      ) : canEdit ? (
        <div className="mt-3 space-y-3">
          <form action={saveSocialByoCredentials} className="space-y-2">
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
                defaultValue={item.hasCredentials ? "••••••••••••" : ""}
                className="mt-1"
                autoComplete="new-password"
                placeholder={item.hasCredentials ? "Saved · leave to keep" : "Agency secret only"}
              />
            </div>
            <div>
              <Label className="text-xs">Page / account label (optional)</Label>
              <Input
                name="accountLabel"
                defaultValue={item.accountLabel ?? ""}
                className="mt-1"
                placeholder="FitFirst Insurance · Palm Bay"
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
            <form action={startSocialByoOAuth}>
              <input type="hidden" name="provider" value={item.id} />
              <input type="hidden" name="next" value={returnTo} />
              <Button type="submit" size="sm">
                {connectLabel}
              </Button>
            </form>
            {item.hasCredentials ? (
              <form action={clearSocialByoCredentials}>
                <input type="hidden" name="provider" value={item.id} />
                <input type="hidden" name="next" value={returnTo} />
                <Button type="submit" size="sm" variant="ghost">
                  Clear app keys
                </Button>
              </form>
            ) : null}
            {item.connected ? (
              <form action={disconnectCatalogStub}>
                <input type="hidden" name="provider" value={item.id} />
                <input type="hidden" name="next" value={returnTo} />
                <Button type="submit" size="sm" variant="outline">
                  Disconnect
                </Button>
              </form>
            ) : null}
          </div>
        </div>
      ) : null}
    </article>
  );
}

function HostedMetaActions({
  item,
  canEdit,
  returnTo,
  connectLabel,
}: {
  item: CatalogItem;
  canEdit: boolean;
  returnTo: "/settings/social" | "/settings/integrations";
  connectLabel: string;
}) {
  const missing = platformHostedConnectMissingCopy(item.id === "instagram" ? "instagram" : "facebook");
  if (!canEdit) {
    return null;
  }
  if (!item.hasEnvCredentials) {
    return null;
  }
  return (
    <div className="mt-3 space-y-3">

      <div className="flex flex-wrap items-center gap-2">
        <form action={startSocialByoOAuth}>
          <input type="hidden" name="provider" value={item.id} />
          <input type="hidden" name="next" value={returnTo} />
          <Button type="submit" size="sm">
            {connectLabel}
          </Button>
        </form>
        {item.connected ? (
          <form action={disconnectCatalogStub}>
            <input type="hidden" name="provider" value={item.id} />
            <input type="hidden" name="next" value={returnTo} />
            <Button type="submit" size="sm" variant="outline">
              Disconnect
            </Button>
          </form>
        ) : null}
      </div>
    </div>
  );
}
