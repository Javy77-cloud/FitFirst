import { saveGbpAgentMonitor, saveSocialAccountOwner } from "@/app/actions/social";
import { ConnectionBadge } from "@/components/settings/connection-badge";
import { SocialByoCard } from "@/components/social/social-byo-card";
import { SettingsShell } from "@/components/settings/settings-shell";
import { Button } from "@/components/ui/button";
import { requireAdminPage } from "@/lib/auth/guards";
import { listCatalogByCategory } from "@/lib/integrations/catalog-store";
import { listUsers } from "@/lib/db/queries";
import { socialByoSpec } from "@/lib/social/byo";
import { isSocialPlatformId } from "@/lib/social/platforms";
import { loadGbpMonitorPolicy } from "@/lib/social/store";

export const dynamic = "force-dynamic";

export default async function SocialSettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [, groups, allowAgentsMonitorGbp, query, users] = await Promise.all([
    requireAdminPage(),
    listCatalogByCategory(),
    loadGbpMonitorPolicy(),
    searchParams,
    listUsers(),
  ]);
  const agents = users.filter((user) => user.role === "agent");
  const social = groups.find((group) => group.category === "social")?.items ?? [];
  const gbp = social.find((item) => item.id === "google_business_profile");
  const notice = typeof query.notice === "string" ? query.notice : undefined;

  return (
    <SettingsShell title="Social / GBP" current="social">

      {notice === "gbp-agents-on" ? (
        <p className="mb-3 rounded-md border border-[var(--ff-green)]/30 bg-[var(--ff-green-bg)] px-3 py-2 text-sm">
          Agents can monitor Google Business Profile on Social pulse.
        </p>
      ) : null}
      {notice === "connected" ? (
        <p className="mb-3 rounded-md border border-[var(--ff-green)]/30 bg-[var(--ff-green-bg)] px-3 py-2 text-sm">
          {typeof query.provider === "string" ? query.provider : "Provider"} is not live until
          OAuth completes.
        </p>
      ) : null}
      {notice === "disconnected" ? (
        <p className="mb-3 rounded-md border border-dashed border-border px-3 py-2 text-sm">
          {typeof query.provider === "string" ? query.provider : "Provider"} marked not connected.
        </p>
      ) : null}
      {notice === "credentials-saved" ? (
        <p className="mb-3 rounded-md border border-[var(--ff-green)]/30 bg-[var(--ff-green-bg)] px-3 py-2 text-sm">
          Agency app credentials saved for{" "}
          {typeof query.provider === "string" && isSocialPlatformId(query.provider)
            ? socialByoSpec(query.provider).product
            : "that platform"}
          .
        </p>
      ) : null}
      {notice === "credentials-cleared" ? (
        <p className="mb-3 rounded-md border border-dashed border-border px-3 py-2 text-sm">
          Agency app keys cleared.
        </p>
      ) : null}
      {notice === "paid-wall" ? (
        <p className="mb-3 rounded-md border border-border bg-fit-flag-bg px-3 py-2 text-sm">
          {typeof query.provider === "string" && isSocialPlatformId(query.provider)
            ? socialByoSpec(query.provider).wallBody
            : "That vendor requires a paid API. FitFirst does not buy it."}
        </p>
      ) : null}
      {notice === "byo-connected" ? (
        <p className="mb-3 rounded-md border border-[var(--ff-green)]/30 bg-[var(--ff-green-bg)] px-3 py-2 text-sm">
          {typeof query.provider === "string" ? query.provider : "Account"} connected with the
          agency’s app. Inbox sync waits on the vendor API.
        </p>
      ) : null}
      <section className="mb-5 ff-card space-y-3 p-4" data-gbp-gate="true">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-navy">Google Business Profile policy</h2>

          </div>
          <ConnectionBadge connected={Boolean(gbp?.connected)} />
        </div>
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

            </span>
          </label>
          <Button type="submit" size="sm">
            Save GBP gate
          </Button>
        </form>
      </section>

      <div className="grid gap-3 md:grid-cols-2">
        {social.map((item) => (
          <SocialByoCard
            key={item.id}
            item={item}
            canEdit
            returnTo="/settings/social"
          />
        ))}
      </div>

      <section className="mt-5 ff-card space-y-3 p-4">
        <div>
          <h2 className="text-sm font-semibold text-navy">Who owns each connected account</h2>

        </div>
        <ul className="divide-y divide-border rounded-md border border-border">
          {social.map((item) => {
            const ownerName = users.find((user) => user.id === item.ownerUserId)?.name;
            return (
              <li key={`owner-${item.id}`} className="flex flex-col gap-2 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-sm font-medium text-navy">{item.name}</div>
                  <p className="text-helper text-muted-foreground">
                    {item.connected
                      ? ownerName
                        ? `${ownerName}'s connected account`
                        : "Agency · unassigned inbound"
                      : "Not connected"}
                  </p>
                </div>
                {item.connected ? (
                  <form action={saveSocialAccountOwner} className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="provider" value={item.id} />
                    <select
                      name="ownerUserId"
                      defaultValue={item.ownerUserId ?? ""}
                      className="h-8 rounded-md border border-border bg-background px-2 text-sm text-navy"
                    >
                      <option value="">Agency (unassigned)</option>
                      {agents.map((agent) => (
                        <option key={agent.id} value={agent.id}>
                          {agent.name}
                        </option>
                      ))}
                    </select>
                    <Button type="submit" size="sm" variant="outline">
                      Save owner
                    </Button>
                  </form>
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>
    </SettingsShell>
  );
}
