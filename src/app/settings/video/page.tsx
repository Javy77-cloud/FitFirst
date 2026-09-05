import Link from "next/link";
import { SettingsShell } from "@/components/settings/settings-shell";
import { IntegrationCard } from "@/components/settings/integration-card";
import { currentDeskSession } from "@/lib/auth/session";
import { listCatalogItems } from "@/lib/integrations/catalog-store";

export const dynamic = "force-dynamic";

export default async function VideoSettingsPage() {
  const [session, items] = await Promise.all([currentDeskSession(), listCatalogItems()]);
  const video = items.filter((item) => item.category === "video");

  return (
    <SettingsShell title="Video">
      <p className="mb-4 text-sm text-muted-foreground">
        Meeting links on calendar events later. Zoom or Google Meet — the agency account, not a
        FitFirst room. Connect is a stub. The desk calendar does not open a vendor.
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        {video.map((item) => (
          <IntegrationCard key={item.id} item={item} canEdit={session.isAdmin} />
        ))}
      </div>
      <p className="mt-4 text-sm">
        <Link href="/calendar" className="text-primary hover:underline">
          Open the desk calendar
        </Link>
        <span className="text-muted-foreground"> · </span>
        <Link href="/settings/integrations" className="text-primary hover:underline">
          Open Connect
        </Link>
      </p>
    </SettingsShell>
  );
}
