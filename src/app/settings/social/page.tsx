import { saveGbpAgentMonitor } from "@/app/actions/social";
import { ConnectionBadge } from "@/components/settings/connection-badge";
import { IntegrationCard } from "@/components/settings/integration-card";
import { SettingsShell } from "@/components/settings/settings-shell";
import { Button } from "@/components/ui/button";
import { currentDeskSession } from "@/lib/auth/session";
import { listCatalogByCategory } from "@/lib/integrations/catalog-store";
import { loadGbpMonitorPolicy } from "@/lib/social/store";

export const dynamic = "force-dynamic";

export default async function SocialSettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [session, groups, allowAgentsMonitorGbp, query] = await Promise.all([
    currentDeskSession(),
    listCatalogByCategory(),
    loadGbpMonitorPolicy(),
    searchParams,
  ]);
  const social = groups.find((group) => group.category === "social")?.items ?? [];
  const gbp = social.find((item) => item.id === "google_business_profile");
  const notice = typeof query.notice === "string" ? query.notice : undefined;

  return (
    <SettingsShell title="Social / GBP" current="social">
      <p className="mb-3 text-sm text-muted-foreground">
        Bring-your-own social accounts. FitFirst does not subscribe to Meta, X, LinkedIn, or Google.
        Connect is a stub so later OAuth can land here. Pulse numbers are demo seeds after connect.
      </p>
      {notice === "gbp-agents-on" ? (
        <p className="mb-3 rounded-md border border-[var(--ff-green)]/30 bg-[var(--ff-green-bg)] px-3 py-2 text-sm">
          Agents can monitor Google Business Profile on Social pulse.
        </p>
      ) : null}
      {notice === "connected" ? (
        <p className="mb-3 rounded-md border border-[var(--ff-green)]/30 bg-[var(--ff-green-bg)] px-3 py-2 text-sm">
          {typeof query.provider === "string" ? query.provider : "Provider"} marked connected. No
          OAuth ran.
        </p>
      ) : null}
      {notice === "disconnected" ? (
        <p className="mb-3 rounded-md border border-dashed border-border px-3 py-2 text-sm">
          {typeof query.provider === "string" ? query.provider : "Provider"} marked not connected.
        </p>
      ) : null}
      {notice === "gbp-agents-off" ? (
        <p className="mb-3 rounded-md border border-dashed border-border px-3 py-2 text-sm">
          Agents see GBP locked until you allow monitoring again.
        </p>
      ) : null}
      {!session.isAdmin ? (
        <p className="mb-3 rounded-md border border-border bg-fit-flag-bg px-3 py-2 text-sm">
          Connecting a vendor is Admin-only. GBP stays locked on the agent desk until Admin allows
          monitoring.
        </p>
      ) : null}

      <section className="mb-5 ff-card space-y-3 p-4" data-gbp-gate="true">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-navy">Google Business Profile policy</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Javy’s rule: Admin approval before agents can monitor GBP. Connecting the listing is
              not enough — turn the toggle on after you trust the plug.
            </p>
          </div>
          <ConnectionBadge connected={Boolean(gbp?.connected)} />
        </div>
        {session.isAdmin ? (
          <form action={saveGbpAgentMonitor} className="flex flex-wrap items-center justify-between gap-3">
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
                <span className="block text-xs text-muted-foreground">
                  Until this is on, agents see a locked card and cannot open GBP inquiries as Leads.
                </span>
              </span>
            </label>
            <Button type="submit" size="sm">
              Save GBP gate
            </Button>
          </form>
        ) : (
          <p className="text-sm text-muted-foreground">
            {allowAgentsMonitorGbp
              ? "Admin has allowed agents to monitor GBP."
              : "Waiting on Admin to allow agents to monitor GBP."}
          </p>
        )}
      </section>

      <div className="grid gap-3 md:grid-cols-2">
        {social.map((item) => (
          <IntegrationCard
            key={item.id}
            item={item}
            canEdit={session.isAdmin}
            returnTo="/settings/social"
          />
        ))}
      </div>
    </SettingsShell>
  );
}
