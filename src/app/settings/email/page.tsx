import Link from "next/link";
import { SettingsShell } from "@/components/settings/settings-shell";
import { IntegrationCard } from "@/components/settings/integration-card";
import { ByoOauthCard } from "@/components/settings/byo-oauth-card";
import { currentDeskSession } from "@/lib/auth/session";
import { listCatalogItems } from "@/lib/integrations/catalog-store";
import { tenantLooksSolo } from "@/lib/integrations/connect-policy";
import { isByoOauthProviderId } from "@/lib/integrations/oauth-specs";

export const dynamic = "force-dynamic";

export default async function EmailSettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [session, items, soloDesk, query] = await Promise.all([
    currentDeskSession(),
    listCatalogItems(),
    tenantLooksSolo(),
    searchParams,
  ]);
  const inboxes = items.filter((item) => item.category === "email");
  const notice = typeof query.notice === "string" ? query.notice : undefined;

  return (
    <SettingsShell title="Email" current="email">
      {notice === "credentials-cleared" ? (
        <p className="mb-3 rounded-md border border-dashed border-border px-3 py-2 text-sm">
          Settings-pasted app keys cleared. Environment credentials still apply if they are set.
        </p>
      ) : null}
      <p className="mb-4 text-sm text-muted-foreground">
        Gmail is one-click Google Connect — Admin can paste, replace, or clear Google Client ID and
        Secret on the card. Yahoo Mail stays BYO OAuth. Agency Admin connects the agency inbox; a
        solo Admin who also works the desk can connect personal Gmail. FitFirst does not host mail.
        Outlook / Zoho stay unwired. Templates and signatures stay under Brand / lists.
      </p>
      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        <Link href="/settings/email-templates" className="text-primary hover:underline">
          Template library
        </Link>
        <span className="text-muted-foreground">·</span>
        <Link href="/settings/email-signatures" className="text-primary hover:underline">
          Signatures
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
              returnTo="/settings/email"
              soloDesk={soloDesk}
            />
          ) : (
            <IntegrationCard key={item.id} item={item} canEdit={session.isAdmin} />
          ),
        )}
      </div>
    </SettingsShell>
  );
}
