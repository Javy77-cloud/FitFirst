import Link from "next/link";
import { SettingsShell } from "@/components/settings/settings-shell";
import { requireAdminPage } from "@/lib/auth/guards";
import {
  IMPORT_EXPORT_HUB_HREF,
  IMPORT_EXPORT_PACKS,
  importExportPack,
} from "@/lib/settings/import-export";

export const dynamic = "force-dynamic";

export default async function ImportSettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage();
  const query = await searchParams;
  const selected = importExportPack(typeof query.pack === "string" ? query.pack : undefined);

  return (
    <SettingsShell title="Import" current="import">
      <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
        CSV import on this page stays a placeholder. The Air-desk Zoho book path is JSONL:
        copy dumps into <code>import/zoho/</code>, then{" "}
        <code>npm run db:wipe-crm</code> and <code>npm run db:import-zoho</code>. That wipe
        keeps users, tenant, and carriers. Ana is not re-seeded. File bytes stay out of this
        pass.
      </p>
      <p className="mb-4 text-sm">
        <Link href={IMPORT_EXPORT_HUB_HREF} className="text-primary hover:underline">
          Back to Import / Export
        </Link>
      </p>

      {selected ? (
        <section className="ff-card mb-4 space-y-3 p-4" data-pack={selected.id}>
          <div className="text-sm font-semibold text-navy">{selected.label}</div>
          <p className="text-sm text-muted-foreground">{selected.blurb}</p>
          <label className="block text-xs text-muted-foreground">
            CSV
            <input
              type="file"
              accept=".csv,text/csv"
              disabled
              className="mt-1 block text-sm text-muted-foreground"
            />
          </label>
          <button
            type="button"
            disabled
            className="h-8 rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground"
          >
            Import CSV (not configured)
          </button>
        </section>
      ) : (
        <p className="mb-4 text-sm text-muted-foreground">Pick a pack. Nothing uploads from here.</p>
      )}

      <ul className="grid gap-2 sm:grid-cols-2">
        {IMPORT_EXPORT_PACKS.map((pack) => (
          <li key={pack.id}>
            <Link
              href={`/settings/import?pack=${pack.id}`}
              className={
                selected?.id === pack.id
                  ? "ff-card block border-primary/40 p-3 text-sm font-medium text-navy"
                  : "ff-card block p-3 text-sm text-navy hover:border-primary/40"
              }
            >
              {pack.label}
              <span className="mt-0.5 block text-xs font-normal text-muted-foreground">{pack.blurb}</span>
            </Link>
          </li>
        ))}
      </ul>
    </SettingsShell>
  );
}
