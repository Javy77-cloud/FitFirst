import { notFound } from "next/navigation";
import { deleteDeskMacro } from "@/app/actions/developer-hub";
import { HubNotice } from "@/components/developer-hub/hub-notice";
import { MacroForm } from "@/components/developer-hub/macro-form";
import { SettingsShell } from "@/components/settings/settings-shell";
import { Button } from "@/components/ui/button";
import { requireAdminPage } from "@/lib/auth/guards";
import { getDeskMacro, listDeskMacroRuns } from "@/lib/db/developer-hub-queries";
import { listEmailTemplates } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default async function EditMacroPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  await requireAdminPage();
  const { id } = await params;
  const { notice } = await searchParams;
  const [macro, templates, runs] = await Promise.all([
    getDeskMacro(id),
    listEmailTemplates(),
    listDeskMacroRuns(id),
  ]);
  if (!macro) notFound();

  return (
    <SettingsShell
      title={macro.name}
      current="macros"
      actions={
        <form action={deleteDeskMacro}>
          <input type="hidden" name="id" value={macro.id} />
          <Button type="submit" size="sm" variant="outline">
            Delete
          </Button>
        </form>
      }
    >
      <HubNotice notice={notice} />
      <MacroForm macro={macro} templates={templates.map((row) => ({ id: row.id, name: row.name }))} />
      <section className="mt-6">
        <h2 className="mb-2 text-sm font-semibold text-navy">Recent runs</h2>
        {runs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Not run yet. Use Leads list checkboxes.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {runs.slice(0, 8).map((run) => (
              <li key={run.id} className="rounded-md border border-border px-3 py-2">
                <div className="text-navy">{run.summary}</div>
                <div className="text-xs text-muted-foreground">
                  {run.ranAt.toISOString().slice(0, 16).replace("T", " ")} · {run.recordIds.length} record
                  {run.recordIds.length === 1 ? "" : "s"}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </SettingsShell>
  );
}
