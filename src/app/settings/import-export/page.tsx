import Link from "next/link";
import { ImportExportHub } from "@/components/settings/import-export-hub";
import { SettingsShell } from "@/components/settings/settings-shell";
import { ZohoJsonlImportCard } from "@/components/settings/zoho-jsonl-import";
import { requireAdminPage } from "@/lib/auth/guards";
import { listJobs } from "@/lib/import-export/jobs";
import { EXPORT_HREF, IMPORT_HREF } from "@/lib/settings/import-export";

export const dynamic = "force-dynamic";

export default async function ImportExportPage() {
  await requireAdminPage();
  const jobs = await listJobs();

  return (
    <SettingsShell title="Import / Export" current="import-export">
      <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
        Portable CRM + AMS packs. Export CSV with stable headers, download a blank template, then import
        with a dry-run preview. Create vs update matches email, policy number, or carrier code. Import never
        deletes. CSV import does not bind a shop or invent a Policy. Zoho JSONL is the live book
        path. No paid migration vendor. Open API CSV still lives on{" "}
        <Link href={EXPORT_HREF} className="text-primary hover:underline">
          Export
        </Link>
        . CSV upload is on{" "}
        <Link href={IMPORT_HREF} className="text-primary hover:underline">
          Import
        </Link>
        .
      </p>

      <ZohoJsonlImportCard />

      <section className="ff-card mb-4 border-dashed p-4">
        <div className="text-sm font-semibold text-navy">IVANS / AL3 download</div>

        <button
          type="button"
          disabled
          className="mt-3 h-8 rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground"
        >
          Connect IVANS / AL3 (not configured)
        </button>
      </section>

      <ImportExportHub
        initialJobs={jobs.map((job) => ({
          id: job.id,
          actor_name: job.actorName,
          actor_email: job.actorEmail,
          entity: job.entity,
          action: job.action,
          status: job.status,
          filename: job.filename,
          rows_ok: job.rowsOk,
          rows_error: job.rowsError,
          rows_create: job.rowsCreate,
          rows_update: job.rowsUpdate,
          rows_skip: job.rowsSkip,
          has_error_csv: Boolean(job.errorCsv),
          created_at: job.createdAt.toISOString(),
        }))}
      />
    </SettingsShell>
  );
}
