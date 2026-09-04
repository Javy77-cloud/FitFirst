import { SettingsShell } from "@/components/settings/settings-shell";
import { IntegrationCard } from "@/components/settings/integration-card";
import { ConnectionBadge } from "@/components/settings/connection-badge";
import { currentDeskSession } from "@/lib/auth/session";
import {
  INTEGRATION_CATEGORY_BLURB,
  INTEGRATION_CATEGORY_LABEL,
} from "@/lib/integrations/catalog";
import { listCatalogByCategory } from "@/lib/integrations/catalog-store";

export const dynamic = "force-dynamic";

export default async function IntegrationsCatalogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [session, groups, query] = await Promise.all([
    currentDeskSession(),
    listCatalogByCategory(),
    searchParams,
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
        Connectable providers the agency already pays. FitFirst does not bill Gmail, Twilio, Zoom,
        or anyone else. Connect is a stub so later OAuth can land on this settings shape — no
        vendor keys, no live token exchange.
      </p>
      <div className="mb-4 rounded-md border border-dashed border-border bg-secondary/50 px-3 py-2 text-sm">
        <div className="font-medium text-navy">Bring your own · agency pays</div>
        <p className="mt-0.5 text-muted-foreground">
          {connectedCount} of {total} marked connected. Status is{" "}
          <ConnectionBadge connected={false} className="align-middle" /> until an admin clicks
          Connect stub, then <ConnectionBadge connected className="align-middle" />. Nothing
          leaves this desk.
        </p>
      </div>
      {notice === "connected" ? (
        <p className="mb-3 rounded-md border border-[var(--ff-green)]/30 bg-[var(--ff-green-bg)] px-3 py-2 text-sm">
          {provider ?? "Provider"} marked connected. No OAuth ran.
        </p>
      ) : null}
      {notice === "disconnected" ? (
        <p className="mb-3 rounded-md border border-dashed border-border px-3 py-2 text-sm">
          {provider ?? "Provider"} marked not connected. Desk history stays.
        </p>
      ) : null}
      {!session.isAdmin ? (
        <p className="mb-3 rounded-md border border-border bg-fit-flag-bg px-3 py-2 text-sm">
          Connecting a vendor is Admin-only. Agents can see what the agency plugged in.
        </p>
      ) : null}

      <div className="space-y-6">
        {groups.map((group) => (
          <section key={group.category} id={group.category} className="space-y-2">
            <div>
              <h2 className="text-sm font-semibold text-navy">
                {INTEGRATION_CATEGORY_LABEL[group.category]}
              </h2>
              <p className="text-xs text-muted-foreground">
                {INTEGRATION_CATEGORY_BLURB[group.category]}
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {group.items.map((item) => (
                <IntegrationCard key={item.id} item={item} canEdit={session.isAdmin} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </SettingsShell>
  );
}
