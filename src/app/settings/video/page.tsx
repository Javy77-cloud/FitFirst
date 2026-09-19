import Link from "next/link";
import { SettingsShell } from "@/components/settings/settings-shell";
import { IntegrationCard } from "@/components/settings/integration-card";
import { ByoOauthCard } from "@/components/settings/byo-oauth-card";
import { currentDeskSession } from "@/lib/auth/session";
import { listCatalogItems } from "@/lib/integrations/catalog-store";
import { isByoOauthProviderId } from "@/lib/integrations/oauth-specs";

export const dynamic = "force-dynamic";

export default async function VideoSettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [session, items, query] = await Promise.all([
    currentDeskSession(),
    listCatalogItems(),
    searchParams,
  ]);
  const video = items.filter((item) => item.category === "video");
  const notice = typeof query.notice === "string" ? query.notice : undefined;

  return (
    <SettingsShell title="Video">
      {notice === "credentials-cleared" ? (
        <p className="mb-3 rounded-md border border-dashed border-border px-3 py-2 text-sm">
          Settings-pasted app keys cleared. Environment credentials still apply if they are set.
        </p>
      ) : null}
      <p className="mb-4 text-sm text-muted-foreground">
        Google Meet uses the same one-click Google Connect as Gmail and Calendar. Paste, replace, or
        clear Client ID + Secret on the card. The helper writes a Meet URL onto calendar events when
        Google Calendar or Meet is connected. Zoom stays a stub. The agency account, not a FitFirst
        room.
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        {video.map((item) =>
          isByoOauthProviderId(item.id) ? (
            <ByoOauthCard
              key={item.id}
              item={item}
              canEdit={session.isAdmin}
              returnTo="/settings/video"
            />
          ) : (
            <IntegrationCard key={item.id} item={item} canEdit={session.isAdmin} />
          ),
        )}
      </div>
      <p className="mt-4 text-sm">
        <Link href="/calendar" className="text-primary hover:underline">
          Open the desk calendar
        </Link>
        <span className="text-muted-foreground"> · </span>
        <Link href="/settings/integrations" className="text-primary hover:underline">
          Full catalog
        </Link>
      </p>
    </SettingsShell>
  );
}
