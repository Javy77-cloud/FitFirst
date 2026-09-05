import Link from "next/link";
import { saveGbpAgentMonitor } from "@/app/actions/social";
import { SettingsShell } from "@/components/settings/settings-shell";
import { IntegrationCard } from "@/components/settings/integration-card";
import { ConnectionBadge } from "@/components/settings/connection-badge";
import { Button } from "@/components/ui/button";
import { currentDeskSession } from "@/lib/auth/session";
import { AGENCY_PAYS_VENDOR } from "@/lib/integrations/catalog";
import { listConnectHub } from "@/lib/integrations/catalog-store";
import { loadGbpMonitorPolicy } from "@/lib/social/store";

export const dynamic = "force-dynamic";

export default async function IntegrationsCatalogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [session, hub, allowAgentsMonitorGbp, query] = await Promise.all([
    currentDeskSession(),
    listConnectHub(),
    loadGbpMonitorPolicy(),
    searchParams,
  ]);
  const notice = typeof query.notice === "string" ? query.notice : undefined;
  const provider = typeof query.provider === "string" ? query.provider : undefined;
  const featuredCount = hub.featured.reduce((sum, section) => sum + section.items.length, 0);
  const featuredConnected = hub.featured.reduce(
    (sum, section) => sum + section.items.filter((item) => item.connected).length,
    0,
  );
  const gbp = hub.items.find((item) => item.id === "google_business_profile");
  const gbpLocked = !session.isAdmin && !allowAgentsMonitorGbp;

  return (
    <SettingsShell title="Connect" current="integrations">
      <p className="mb-3 text-sm text-muted-foreground">
        Bring-your-own vendors. {AGENCY_PAYS_VENDOR} FitFirst does not bill Google, Outlook, Zoho,
        Meta, SMS, e-sign, EZLynx, or QuoteRush. Connect is a demo toggle — no OAuth, no API keys,
        no Stripe, no Twilio.
      </p>
      <div className="mb-4 rounded-md border border-dashed border-border bg-secondary/50 px-3 py-2 text-sm">
        <div className="font-medium text-navy">Bring your own · agency pays</div>
        <p className="mt-0.5 text-muted-foreground">
          {featuredConnected} of {featuredCount} Connect cards marked{" "}
          <ConnectionBadge connected className="align-middle" />. Everything else stays{" "}
          <ConnectionBadge connected={false} className="align-middle" /> until Admin flips the
          toggle. Nothing leaves this desk.
        </p>
      </div>
      {notice === "connected" ? (
        <p className="mb-3 rounded-md border border-[var(--ff-green)]/30 bg-[var(--ff-green-bg)] px-3 py-2 text-sm">
          {provider ?? "Provider"} marked connected (demo). No OAuth ran.
        </p>
      ) : null}
      {notice === "disconnected" ? (
        <p className="mb-3 rounded-md border border-dashed border-border px-3 py-2 text-sm">
          {provider ?? "Provider"} marked not connected. Desk history stays.
        </p>
      ) : null}
      {notice === "gbp-agents-on" || notice === "gbp-agents-off" ? (
        <p className="mb-3 rounded-md border border-dashed border-border px-3 py-2 text-sm">
          {notice === "gbp-agents-on"
            ? "Agents can monitor Google Business Profile on Social pulse."
            : "Agents see GBP locked until you allow monitoring again."}
        </p>
      ) : null}
      {!session.isAdmin ? (
        <p className="mb-3 rounded-md border border-border bg-fit-flag-bg px-3 py-2 text-sm">
          Connecting a vendor is Admin-only. Agents can see what the agency plugged in. GBP stays
          locked until Admin allows monitoring.
        </p>
      ) : null}

      <div className="space-y-6">
        {hub.featured.map((section) => (
          <section key={section.id} id={section.id} className="space-y-2">
            {section.id === "sms" ? (
              <span id="phone_sms" className="sr-only">
                Phone / SMS
              </span>
            ) : null}
            <div>
              <h2 className="text-sm font-semibold text-navy">{section.title}</h2>
              <p className="text-helper text-muted-foreground">{section.blurb}</p>
            </div>
            {section.id === "social" ? (
              <div className="rounded-md border border-border bg-card px-3 py-3" data-gbp-gate="true">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-navy">GBP Admin gate</h3>
                    <p className="text-helper text-muted-foreground">
                      Connecting the listing is not enough. Admin must allow agents to monitor
                      Google Business Profile.
                    </p>
                  </div>
                  <ConnectionBadge connected={Boolean(gbp?.connected)} />
                </div>
                {session.isAdmin ? (
                  <form
                    action={saveGbpAgentMonitor}
                    className="mt-3 flex flex-wrap items-center justify-between gap-3"
                  >
                    <label className="flex items-start gap-2 text-sm text-navy">
                      <input
                        type="checkbox"
                        name="allowAgentsMonitorGbp"
                        value="true"
                        defaultChecked={allowAgentsMonitorGbp}
                        className="mt-1"
                      />
                      <span>
                        Allow agents to monitor GBP
                        <span className="block text-helper text-muted-foreground">
                          Until this is on, agents see a locked card on Social pulse.
                        </span>
                      </span>
                    </label>
                    <input type="hidden" name="next" value="/settings/integrations" />
                    <Button type="submit" size="sm">
                      Save GBP gate
                    </Button>
                  </form>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">
                    {allowAgentsMonitorGbp
                      ? "Admin has allowed agents to monitor GBP."
                      : "Waiting on Admin to allow agents to monitor GBP."}
                  </p>
                )}
              </div>
            ) : null}
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {section.items.map((item) => (
                <IntegrationCard
                  key={item.id}
                  item={item}
                  canEdit={session.isAdmin}
                  gbpLocked={item.id === "google_business_profile" ? gbpLocked : false}
                  gbpLockReason={
                    item.id === "google_business_profile" && gbpLocked
                      ? "Admin has not allowed agents to monitor Google Business Profile."
                      : null
                  }
                />
              ))}
            </div>
          </section>
        ))}

        {hub.more.length > 0 ? (
          <section id="more" className="space-y-2">
            <span id="campaigns" className="sr-only">
              Campaigns
            </span>
            <div>
              <h2 className="text-sm font-semibold text-navy">Also on this desk</h2>
              <p className="text-helper text-muted-foreground">
                Optional campaigns, video, Yahoo, and extra voice seats. Same demo toggle.{" "}
                {AGENCY_PAYS_VENDOR}
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {hub.more.map((item) => (
                <IntegrationCard key={item.id} item={item} canEdit={session.isAdmin} />
              ))}
            </div>
          </section>
        ) : null}
      </div>

      <p className="mt-6 text-sm">
        <Link href="/settings/social" className="text-primary hover:underline">
          Social / GBP owners
        </Link>
        <span className="px-2 text-muted-foreground">·</span>
        <Link href="/settings" className="text-primary hover:underline">
          Back to Settings
        </Link>
      </p>
    </SettingsShell>
  );
}
