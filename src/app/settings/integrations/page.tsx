import { SettingsShell } from "@/components/settings/settings-shell";
import { IntegrationCard } from "@/components/settings/integration-card";
import { ByoOauthCard } from "@/components/settings/byo-oauth-card";
import { ConnectionBadge } from "@/components/settings/connection-badge";
import { SocialByoCard } from "@/components/social/social-byo-card";
import { currentDeskSession } from "@/lib/auth/session";
import {
  AGENCY_PAYS_VENDOR,
  INTEGRATION_CATEGORY_BLURB,
  INTEGRATION_CATEGORY_LABEL,
} from "@/lib/integrations/catalog";
import { listCatalogByCategory } from "@/lib/integrations/catalog-store";
import { tenantLooksSolo } from "@/lib/integrations/connect-policy";
import { isByoOauthProviderId } from "@/lib/integrations/oauth-specs";
import { MAPS_FREE_LINK_NOTE, socialByoSpec } from "@/lib/social/byo";
import { isSocialPlatformId } from "@/lib/social/platforms";
import { MacContinuityToggle } from "@/components/settings/mac-continuity-toggle";
import { getAgencySettings } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default async function IntegrationsCatalogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [session, groups, query, agency, soloDesk] = await Promise.all([
    currentDeskSession(),
    listCatalogByCategory(),
    searchParams,
    getAgencySettings(),
    tenantLooksSolo(),
  ]);
  const notice = typeof query.notice === "string" ? query.notice : undefined;
  const provider = typeof query.provider === "string" ? query.provider : undefined;
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
      <p className="mb-3 text-sm text-muted-foreground">
        Bring-your-own providers. {AGENCY_PAYS_VENDOR} Agency Admin controls OAuth. A solo Admin who
        also works the desk can connect personal Gmail. Gmail, Yahoo Mail, Google / Outlook Calendar
        (busy sync), Google Meet, social / GBP, and DocuSign sandbox open real vendor OAuth. Stripe,
        Twilio, Nylas, and HealthSherpa stay out of this wave. {MAPS_FREE_LINK_NOTE}
      </p>
      <div className="mb-4 rounded-md border border-dashed border-border bg-secondary/50 px-3 py-2 text-sm">
        <div className="font-medium text-navy">Bring your own · agency pays</div>
        <p className="mt-0.5 text-muted-foreground">
          {liveCount} of {total} catalog rows connected. Live OAuth cards show{" "}
          <ConnectionBadge connected className="align-middle" label="Connected (BYO)" /> after the
          vendor grant. Paid / unwired cards stay{" "}
          <ConnectionBadge connected={false} className="align-middle" />.
        </p>
      </div>
      {notice === "connected" ? (
        <p className="mb-3 rounded-md border border-dashed border-border px-3 py-2 text-sm">
          {provider ?? "Provider"} is a demo stub. Use the BYO Connect button on Gmail, calendars,
          social, or DocuSign for real OAuth.
        </p>
      ) : null}
      {notice === "disconnected" ? (
        <p className="mb-3 rounded-md border border-dashed border-border px-3 py-2 text-sm">
          {provider ?? "Provider"} marked not connected. Desk history stays.
        </p>
      ) : null}
      {notice === "credentials-saved" ? (
        <p className="mb-3 rounded-md border border-[var(--ff-green)]/30 bg-[var(--ff-green-bg)] px-3 py-2 text-sm">
          Agency app credentials saved
          {provider && isSocialPlatformId(provider) ? ` for ${socialByoSpec(provider).product}` : ""}.
          Click Connect to open the vendor OAuth dialog.
        </p>
      ) : null}
      {notice === "needs-credentials" ? (
        <p className="mb-3 rounded-md border border-border bg-fit-flag-bg px-3 py-2 text-sm">
          Paste the agency App ID / Client ID and secret, or set the matching env vars first.
        </p>
      ) : null}
      {notice === "paid-wall" ? (
        <p className="mb-3 rounded-md border border-border bg-fit-flag-bg px-3 py-2 text-sm">
          {provider && isSocialPlatformId(provider)
            ? socialByoSpec(provider).wallBody
            : "That vendor requires a paid API. FitFirst does not buy it."}
        </p>
      ) : null}
      {notice === "oauth-wall" ? (
        <p className="mb-3 rounded-md border border-border bg-fit-flag-bg px-3 py-2 text-sm">
          OAuth stopped at the vendor wall. Open the card for the error from Google / Microsoft /
          Yahoo / Meta / DocuSign.
        </p>
      ) : null}
      {notice === "byo-connected" ? (
        <p className="mb-3 rounded-md border border-[var(--ff-green)]/30 bg-[var(--ff-green-bg)] px-3 py-2 text-sm">
          {provider ?? "Account"} connected with the agency’s app. Deep lead sync stays minimal;
          connection status is real.
        </p>
      ) : null}
      {notice === "gmail-need-to" ? (
        <p className="mb-3 rounded-md border border-border bg-fit-flag-bg px-3 py-2 text-sm">
          Enter an address for the Gmail smoke-test send.
        </p>
      ) : null}
      {notice === "meet-helper" ? (
        <p className="mb-3 rounded-md border border-[var(--ff-green)]/30 bg-[var(--ff-green-bg)] px-3 py-2 text-sm">
          Google Meet helper is on Calendar. Check “Add Google Meet link” when creating a meeting.
        </p>
      ) : null}
      {notice === "admin-only" ? (
        <p className="mb-3 rounded-md border border-border bg-fit-flag-bg px-3 py-2 text-sm">
          Connecting a vendor is Agency Admin-only.
        </p>
      ) : null}
      {!session.isAdmin ? (
        <p className="mb-3 rounded-md border border-border bg-fit-flag-bg px-3 py-2 text-sm">
          Connecting a vendor is Admin-only. Agents can see what the agency plugged in. GBP stays
          locked on Social until Admin allows monitoring.
        </p>
      ) : null}

      <div className="space-y-6">
        {groups.map((group) => (
          <section key={group.category} id={group.category} className="space-y-2">
            <div>
              <h2 className="text-sm font-semibold text-navy">
                {INTEGRATION_CATEGORY_LABEL[group.category]}
              </h2>
              <p className="text-helper text-muted-foreground">
                {INTEGRATION_CATEGORY_BLURB[group.category]}
              </p>
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
                if (isByoOauthProviderId(item.id)) {
                  return (
                    <ByoOauthCard
                      key={item.id}
                      item={item}
                      canEdit={session.isAdmin}
                      returnTo="/settings/integrations"
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
