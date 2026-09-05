import { attemptCarrierDownloadImport } from "@/app/actions/ams";
import { SettingsShell } from "@/components/settings/settings-shell";
import { Button } from "@/components/ui/button";
import { formatDay } from "@/lib/domain";
import { CARRIER_DOWNLOAD_STUB_REASON } from "@/lib/domain-ams";
import { loadCarrierDownloadDesk } from "@/lib/ams/queries";

export const dynamic = "force-dynamic";

export default async function CarrierDownloadSettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const rows = await loadCarrierDownloadDesk();
  const notice = typeof params.notice === "string" ? params.notice : undefined;
  const error = typeof params.error === "string" ? params.error : undefined;

  return (
    <SettingsShell title="Carrier download" current="carrier-download">
      <p className="mb-3 text-sm text-muted-foreground">
        IVANS and AL3 are the later plug for carrier policy feeds. This importer is empty on
        purpose. Status stays <strong>Not connected</strong>. No fake carrier fees. No live
        download.
      </p>
      {error ? (
        <p className="mb-3 rounded-md border border-dashed border-border px-3 py-2 text-sm">
          {error}
        </p>
      ) : null}
      {notice === "not_connected" ? (
        <p className="mb-3 rounded-md border border-dashed border-border px-3 py-2 text-sm">
          Still not connected. {CARRIER_DOWNLOAD_STUB_REASON}.
        </p>
      ) : null}
      <div className="grid gap-3 md:grid-cols-2">
        {rows.map((row) => (
          <section key={row.provider} className="ff-card p-4">
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-base font-semibold text-navy">{row.label}</h2>
              <span className="text-xs font-semibold uppercase text-muted-foreground">
                Not connected
              </span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{row.blurb}</p>
            {row.lastAttemptAt ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Last attempt {formatDay(row.lastAttemptAt)}
                {row.lastError ? ` · ${row.lastError}` : ""}
              </p>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">No import attempted.</p>
            )}
            <form action={attemptCarrierDownloadImport} className="mt-3">
              <input type="hidden" name="provider" value={row.provider} />
              <Button type="submit" size="sm" variant="outline">
                Attempt import
              </Button>
            </form>
          </section>
        ))}
      </div>
    </SettingsShell>
  );
}
