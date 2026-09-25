import Link from "next/link";
import { SettingsShell } from "@/components/settings/settings-shell";
import { IntegrationCard } from "@/components/settings/integration-card";
import { ByoOauthCard } from "@/components/settings/byo-oauth-card";
import { ByoOauthWallNotice } from "@/components/settings/byo-oauth-wall-notice";
import { currentDeskSession } from "@/lib/auth/session";
import { listCatalogItems } from "@/lib/integrations/catalog-store";
import { tenantLooksSolo } from "@/lib/integrations/connect-policy";
import { getAgentFeatureToggles } from "@/lib/settings/agent-feature-toggles-prefs";
import { isByoOauthProviderId } from "@/lib/integrations/oauth-specs";

export const dynamic = "force-dynamic";

export default async function EmailSettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [session, items, soloDesk, query, toggles] = await Promise.all([
    currentDeskSession(),
    listCatalogItems(),
    tenantLooksSolo(),
    searchParams,
    getAgentFeatureToggles(),
  ]);
  const inboxes = items.filter((item) => item.category === "email");
  const notice = typeof query.notice === "string" ? query.notice : undefined;
  const provider = typeof query.provider === "string" ? query.provider : undefined;
  const wallError =
    inboxes.find((item) => item.id === provider)?.lastOauthError ??
    inboxes.find((item) => item.lastOauthError)?.lastOauthError ??
    null;

  return (
    <SettingsShell title="Email" current="email">
      {notice === "credentials-cleared" ? (
        <p className="mb-3 rounded-md border border-dashed border-border px-3 py-2 text-sm">
          Settings-pasted app keys cleared. Environment credentials still apply if they are set.
        </p>
      ) : null}
      {notice === "credentials-saved" ? (
        <p className="mb-3 rounded-md border border-dashed border-border bg-secondary/40 px-3 py-2 text-sm text-navy">
          Google Client ID and Secret saved.
        </p>
      ) : null}
      {notice === "byo-connected" ? (
        <p className="mb-3 rounded-md border border-dashed border-border bg-secondary/40 px-3 py-2 text-sm text-navy">
          Gmail connected. Tokens are stored for this agency — open Inbox to work the mailbox.
        </p>
      ) : null}
      {notice === "oauth-wall" ? <ByoOauthWallNotice lastOauthError={wallError} /> : null}

      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        <Link href="/settings/email-templates" className="text-primary hover:underline">
          Email templates
        </Link>
        <span className="text-muted-foreground">·</span>
        <Link href="/settings/email-signatures" className="text-primary hover:underline">
          Email signatures
        </Link>
        <span className="text-muted-foreground">·</span>
        <Link href="/settings/email-triggers" className="text-primary hover:underline">
          Triggers
        </Link>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {inboxes.map((item) =>
          isByoOauthProviderId(item.id) ? (
            <ByoOauthCard
              key={item.id}
              item={item}
              canEdit={session.isAdmin}
              canConnect={
                session.isAdmin ||
                (item.id === "gmail" && toggles.agentsMayConnectPersonalGoogle)
              }
              returnTo="/settings/email"
              soloDesk={soloDesk}
              agentsMayConnectPersonalGoogle={toggles.agentsMayConnectPersonalGoogle}
            />
          ) : (
            <IntegrationCard key={item.id} item={item} canEdit={session.isAdmin} />
          ),
        )}
      </div>
    </SettingsShell>
  );
}
