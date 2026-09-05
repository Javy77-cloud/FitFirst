import Link from "next/link";
import { SettingsShell } from "@/components/settings/settings-shell";
import { requireAdminPage } from "@/lib/auth/guards";
import {
  coreImportExportPacks,
  EXPORT_HREF,
  IMPORT_HREF,
  relatedImportExportPacks,
  type ImportExportPack,
} from "@/lib/settings/import-export";

export const dynamic = "force-dynamic";

function statusLabel(pack: ImportExportPack) {
  if (pack.exportStatus === "csv") return "CSV ready";
  if (pack.exportStatus === "json") return "JSON API";
  return "Placeholder";
}

function PackGrid({ packs }: { packs: ImportExportPack[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {packs.map((pack) => (
        <article key={pack.id} id={pack.id} className="ff-card flex flex-col p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-semibold text-navy">{pack.label}</h3>
            <span className="rounded-sm bg-secondary px-1.5 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
              {statusLabel(pack)}
            </span>
          </div>
          <p className="mt-1 flex-1 text-sm text-muted-foreground">{pack.blurb}</p>
          <div className="mt-3 flex flex-wrap gap-3 text-sm">
            {pack.exportHref ? (
              <a href={pack.exportHref} className="text-primary hover:underline">
                {pack.exportStatus === "csv" ? "Download CSV" : "Open JSON"}
              </a>
            ) : (
              <span className="text-muted-foreground">Export pending the import slice</span>
            )}
            <Link href={pack.importHref} className="text-primary hover:underline">
              Import stub
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}

export default async function ImportExportHubPage() {
  await requireAdminPage();

  return (
    <SettingsShell title="Import / Export" current="import-export">
      <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
        Admin-only. Move the book in and out the way a CRM / AMS / rater desk expects: people,
        businesses, policies, carriers, leads, and shops, plus related packs. Live CSV is contacts,
        policies, and commissions. CSV import is a placeholder until that slice merges. Encrypted
        SSN / EIN / DL and carrier portal secrets stay off the file. Ana stays shopping.
      </p>
      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <Link href={IMPORT_HREF} className="ff-card block p-4 hover:border-primary/40">
          <div className="text-sm font-semibold text-navy">Import</div>
          <p className="mt-1 text-sm text-muted-foreground">
            CSV upload stub. The dedicated import bot owns the writer — this page will not invent
            rows.
          </p>
        </Link>
        <Link href={EXPORT_HREF} className="ff-card block p-4 hover:border-primary/40">
          <div className="text-sm font-semibold text-navy">Export</div>
          <p className="mt-1 text-sm text-muted-foreground">
            Contacts, policies, and commissions CSV plus the Open API token.
          </p>
        </Link>
      </div>

      <h2 className="mb-2 text-base font-semibold text-navy">Core records</h2>
      <p className="mb-3 text-xs text-muted-foreground">Contacts, businesses, policies, carriers, leads, deals.</p>
      <PackGrid packs={coreImportExportPacks()} />

      <h2 className="mb-2 mt-6 text-base font-semibold text-navy">Related packs</h2>
      <p className="mb-3 text-xs text-muted-foreground">
        Activities, document metadata, commissions, quote-sheet stubs.
      </p>
      <PackGrid packs={relatedImportExportPacks()} />
    </SettingsShell>
  );
}
