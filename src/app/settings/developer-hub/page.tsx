import Link from "next/link";
import { SettingsShell } from "@/components/settings/settings-shell";
import { WidgetHost } from "@/components/developer-hub/widget-host";
import { requireAdminPage } from "@/lib/auth/guards";
import { DEV_HUB_SECTIONS } from "@/lib/developer-hub/hub";
import { listDeskButtons, listDeskMacros, listDeskScripts, listEnabledWidgetsByType } from "@/lib/db/developer-hub-queries";

export const dynamic = "force-dynamic";

export default async function DeveloperHubPage() {
  await requireAdminPage();
  const [macros, buttons, scripts, settingsWidgets] = await Promise.all([
    listDeskMacros(),
    listDeskButtons(),
    listDeskScripts(),
    listEnabledWidgetsByType("settings"),
  ]);
  const counts: Record<string, number> = {
    macros: macros.length,
    "custom-buttons": buttons.length,
    "client-scripts": scripts.length,
    widgets: settingsWidgets.length,
  };

  return (
    <SettingsShell title="Developer Hub" current="developer-hub">

      <div className="mb-6 grid gap-3 md:grid-cols-2">
        {DEV_HUB_SECTIONS.map((section) => (
          <Link
            key={section.id}
            href={section.href}
            className="ff-card block p-4 hover:border-primary/40"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="text-sm font-semibold text-navy">{section.label}</div>
              <span className="text-xs text-muted-foreground">
                {"badge" in section && section.badge
                  ? section.badge
                  : section.ownedHere
                    ? `${counts[section.id] ?? 0} on this desk`
                    : "Core branch"}
              </span>
            </div>

          </Link>
        ))}
      </div>
      {settingsWidgets.length ? (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-navy">Settings widgets</h2>
          {settingsWidgets.map((widget) => (
            <WidgetHost key={widget.id} name={widget.name} url={widget.externalUrl} compact />
          ))}
        </div>
      ) : null}
    </SettingsShell>
  );
}
