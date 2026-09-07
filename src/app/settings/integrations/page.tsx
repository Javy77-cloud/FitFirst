import { SettingsShell } from "@/components/settings/settings-shell";
import { IntegrationCard } from "@/components/settings/integration-card";
import { ConnectionBadge } from "@/components/settings/connection-badge";
import { SocialByoCard } from "@/components/social/social-byo-card";
import { currentDeskSession } from "@/lib/auth/session";
import {
  AGENCY_PAYS_VENDOR,
  INTEGRATION_CATEGORY_BLURB,
  INTEGRATION_CATEGORY_LABEL,
} from "@/lib/integrations/catalog";
import { listCatalogByCategory } from "@/lib/integrations/catalog-store";
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
  const [session, groups, query, agency] = await Promise.all([
    currentDeskSession(),
    listCatalogByCategory(),
    searchParams,
    getAgencySettings(),
  ]);
  const notice = typeof query.notice === "string" ? query.notice : undefined;
  const provider = typeof query.provider === "string" ? query.provider : undefined;
  const connectedCount = groups.reduce(
    (sum, group) => sum + group.items.filter((item) => item.connected).length,
    0,
  );
  const total = groups.reduce((sum, group) => sum + group.items.length, 0);

  return (
    <SettingsShell title="Integrations" current="integrations">
      <p className="mb-3 text-sm text-muted-foreground">
        Bring-your-own providers the agency already pays. {AGENCY_PAYS_VENDOR} Social / GBP
        accepts the agency’s developer app and real OAuth up to the vendor wall. Email, SMS,
        Twilio, IVANS, Stripe, and rater seats stay not connected until those OAuth paths are
        wired. {MAPS_FREE_LINK_NOTE}
      </p>
      <div className="mb-4 rounded-md border border-dashed border-border bg-secondary/50 px-3 py-2 text-sm">
        <div className="font-medium text-navy">Bring your own · agency pays</div>
        <p className="mt-0.5 text-muted-foreground">
          {connectedCount} of {total} social accounts connected. Other catalog cards stay{" "}
          <ConnectionBadge connected={false} className="align-middle" /> until OAuth is wired.
        </p>
      </div>
      {notice === "connected" ? (
        <p className="mb-3 rounded-md border border-dashed border-border px-3 py-2 text-sm">
          {provider ?? "Provider"} is not live. OAuth is not wired for that catalog card.
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
          Paste the agency App ID / Client ID and secret first.
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
          OAuth stopped at the vendor wall. Open the social card for the error from Meta / Google /
          LinkedIn.
        </p>
      ) : null}
      {notice === "byo-connected" ? (
        <p className="mb-3 rounded-md border border-[var(--ff-green)]/30 bg-[var(--ff-green-bg)] px-3 py-2 text-sm">
          {provider ?? "Account"} connected with the agency’s app. Inbox sync waits on the vendor API.
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
              {group.items.map((item) =>
                group.category === "social" ? (
                  <SocialByoCard
                    key={item.id}
                    item={item}
                    canEdit={session.isAdmin}
                    returnTo="/settings/integrations"
                  />
                ) : (
                  <IntegrationCard key={item.id} item={item} canEdit={session.isAdmin} />
                ),
              )}
            </div>
          </section>
        ))}
      </div>
    </SettingsShell>
  );
}
