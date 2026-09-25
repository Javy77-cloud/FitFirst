import { SettingsShell } from "@/components/settings/settings-shell";
import { IntegrationCard } from "@/components/settings/integration-card";
import { HealthSherpaCard } from "@/components/settings/healthsherpa-card";
import { ByoOauthCard } from "@/components/settings/byo-oauth-card";
import { ByoOauthWallNotice } from "@/components/settings/byo-oauth-wall-notice";
import { SocialByoCard } from "@/components/social/social-byo-card";
import { currentDeskSession } from "@/lib/auth/session";
import { INTEGRATION_CATEGORY_LABEL } from "@/lib/integrations/catalog";
import { listCatalogByCategory } from "@/lib/integrations/catalog-store";
import { tenantLooksSolo } from "@/lib/integrations/connect-policy";
import { isByoOauthProviderId } from "@/lib/integrations/oauth-specs";
import { socialByoSpec } from "@/lib/social/byo";
import { isSocialPlatformId } from "@/lib/social/platforms";
import { MacContinuityToggle } from "@/components/settings/mac-continuity-toggle";
import { publicVaultStatus } from "@/lib/developer/vault-public";
import { getAgencySettings } from "@/lib/db/queries";
import {
  describeMedicareBulkReady,
  loadMedicareBulkOneshotState,
} from "@/lib/healthsherpa/bulk-medicare";
import {
  loadHealthSherpaAcaPublicStatus,
  loadHealthSherpaInboundPublicStatus,
  loadHealthSherpaMedicarePublicStatus,
} from "@/lib/healthsherpa/vault";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export default async function IntegrationsCatalogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [session, groups, query, agency, soloDesk, hsMedicare, hsAca, hsInbound, hsBulkReady, hsBulkOneshot] =
    await Promise.all([
    currentDeskSession(),
    listCatalogByCategory().catch(() => []),
    searchParams,
    getAgencySettings().catch(() => ({ fiscalYearStartMonth: 1 })),
    tenantLooksSolo().catch(() => false),
    loadHealthSherpaMedicarePublicStatus().catch(() =>
      publicVaultStatus({
        configured: false,
        source: "none",
        provider: "healthsherpa_medicare",
        label: "HealthSherpa Medicare",
      }),
    ),
    loadHealthSherpaAcaPublicStatus().catch(() =>
      publicVaultStatus({
        configured: false,
        source: "none",
        provider: "healthsherpa_aca",
        label: "HealthSherpa ACA",
      }),
    ),
    loadHealthSherpaInboundPublicStatus().catch(() =>
      publicVaultStatus({
        configured: false,
        source: "none",
        provider: "healthsherpa_inbound",
        label: "HealthSherpa inbound",
      }),
    ),
    describeMedicareBulkReady().catch(() => ({
      hasApiKey: false,
      hasAgentEmail: false,
      configured: false,
      code: "not_configured" as const,
      message: null,
    })),
    loadMedicareBulkOneshotState().catch(() => ({ hidden: false, lastRunAt: null, lastRun: null })),
  ]);
  const notice = typeof query.notice === "string" ? query.notice : undefined;
  const provider = typeof query.provider === "string" ? query.provider : undefined;
  const catalogItems = groups.flatMap((group) => group.items);
  const wallError =
    catalogItems.find((item) => item.id === provider)?.lastOauthError ??
    catalogItems.find((item) => item.lastOauthError)?.lastOauthError ??
    null;
  const liveCount = groups.reduce(
    (sum, group) =>
      sum +
      group.items.filter((item) => item.connected && (item.connectMode === "byo" || group.category === "social"))
        .length,
    0,
  );
  const total = groups.reduce((sum, group) => sum + group.items.length, 0);

  return (
    <SettingsShell title="Integrations" current="integrations">

      <div className="mb-4 rounded-md border border-dashed border-border bg-secondary/50 px-3 py-2 text-sm">
        <div className="font-medium text-navy">Bring your own · agency pays</div>
        <p className="mt-0.5 text-muted-foreground">
          {liveCount} of {total} catalog rows connected.
        </p>
      </div>
      {notice === "disconnected" ? (
        <p className="mb-3 rounded-md border border-dashed border-border px-3 py-2 text-sm">
          {provider ?? "Provider"} marked not connected. Desk history stays.
        </p>
      ) : null}
      {notice === "credentials-saved" ? (
        <p className="mb-3 rounded-md border border-[var(--ff-green)]/30 bg-[var(--ff-green-bg)] px-3 py-2 text-sm">
          Agency app credentials saved
          {provider && isSocialPlatformId(provider) ? ` for ${socialByoSpec(provider).product}` : ""}.
        </p>
      ) : null}
      {notice === "credentials-cleared" ? (
        <p className="mb-3 rounded-md border border-dashed border-border px-3 py-2 text-sm">
          Settings-pasted app keys cleared
          {provider ? ` for ${provider}` : ""}. Environment credentials still apply if they are set.
        </p>
      ) : null}
      {notice === "paid-wall" ? (
        <p className="mb-3 rounded-md border border-border bg-fit-flag-bg px-3 py-2 text-sm">
          {provider && isSocialPlatformId(provider)
            ? socialByoSpec(provider).wallBody
            : "That vendor requires a paid API. FitFirst does not buy it."}
        </p>
      ) : null}
      {notice === "oauth-wall" ? <ByoOauthWallNotice lastOauthError={wallError} /> : null}
      {notice === "gmail-need-to" ? (
        <p className="mb-3 rounded-md border border-border bg-fit-flag-bg px-3 py-2 text-sm">
          Enter an address for the Gmail smoke-test send.
        </p>
      ) : null}
      {notice === "admin-only" ? (
        <p className="mb-3 rounded-md border border-border bg-fit-flag-bg px-3 py-2 text-sm">
          Connecting a vendor is Agency Admin-only.
        </p>
      ) : null}

      <div className="space-y-6">
        {groups.map((group) => (
          <section key={group.category} id={group.category} className="space-y-2">
            <div>
              <h2 className="text-sm font-semibold text-navy">
                {INTEGRATION_CATEGORY_LABEL[group.category]}
              </h2>
            </div>
            {group.category === "phone_sms" ? (
              <MacContinuityToggle
                enabled={Boolean("macContinuity" in agency && agency.macContinuity)}
                canEdit={session.isAdmin}
              />
            ) : null}
            <div className="grid gap-3 md:grid-cols-2">
              {group.items.map((item) => {
                if (group.category === "social") {
                  return (
                    <SocialByoCard
                      key={item.id}
                      item={item}
                      canEdit={session.isAdmin}
                      returnTo="/settings/integrations"
                    />
                  );
                }
                if (item.id === "healthsherpa_medicare" || item.id === "healthsherpa_aca") {
                  return (
                    <HealthSherpaCard
                      key={item.id}
                      item={item}
                      medicare={hsMedicare}
                      aca={hsAca}
                      inbound={hsInbound}
                      medicareBulkReady={hsBulkReady}
                      medicareBulkOneshot={hsBulkOneshot}
                    />
                  );
                }
                if (isByoOauthProviderId(item.id)) {
                  const returnTo =
                    item.id === "gmail"
                      ? "/inbox"
                      : item.id === "google_calendar"
                        ? "/calendar"
                        : item.id === "google_meet"
                          ? "/settings/video"
                          : "/settings/integrations";
                  return (
                    <ByoOauthCard
                      key={item.id}
                      item={item}
                      canEdit={session.isAdmin}
                      returnTo={returnTo}
                      soloDesk={soloDesk}
                    />
                  );
                }
                return <IntegrationCard key={item.id} item={item} canEdit={session.isAdmin} />;
              })}
            </div>
          </section>
        ))}
      </div>
    </SettingsShell>
  );
}
