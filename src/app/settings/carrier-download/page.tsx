import { SettingsShell } from "@/components/settings/settings-shell";
import { loadCarrierDownloadDesk } from "@/lib/ams/queries";

export const dynamic = "force-dynamic";

export default async function CarrierDownloadSettingsPage() {
  const rows = await loadCarrierDownloadDesk();

  return (
    <SettingsShell title="Carrier download" current="carrier-download">

      <div className="grid gap-3 md:grid-cols-2">
        {rows.map((row) => (
          <section key={row.provider} className="ff-card p-4">
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-base font-semibold text-navy">{row.label}</h2>
              <span className="text-xs font-semibold uppercase text-muted-foreground">
                Not connected
              </span>
            </div>

          </section>
        ))}
      </div>
    </SettingsShell>
  );
}
