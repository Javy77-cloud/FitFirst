import { notFound } from "next/navigation";
import { deleteDeskMacro } from "@/app/actions/developer-hub";
import { AppShell } from "@/components/app-shell";
import { AutomationsModuleNav } from "@/components/automations/module-nav";
import { AutomationsNotice } from "@/components/automations/notice";
import { MacroForm } from "@/components/developer-hub/macro-form";
import { Button } from "@/components/ui/button";
import { requireAdminPage } from "@/lib/auth/guards";
import { getDeskMacro, listDeskMacroRuns } from "@/lib/db/developer-hub-queries";
import { listEmailTemplates } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default async function MacroDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage();
  const { id } = await params;
  const query = await searchParams;
  const macro = await getDeskMacro(id);
  if (!macro) notFound();
  const [templates, runs] = await Promise.all([listEmailTemplates(), listDeskMacroRuns(macro.id)]);

  return (
    <AppShell title={macro.name}>
      <AutomationsModuleNav />
      <AutomationsNotice notice={typeof query.notice === "string" ? query.notice : undefined} />
      <MacroForm macro={macro} templates={templates.map((row) => ({ id: row.id, name: row.name }))} />
      <section className="ff-card mt-4 max-w-3xl overflow-hidden">
        <div className="border-b border-border px-4 py-2 text-sm font-semibold text-navy">Run log</div>
        {runs.length === 0 ? (
          <p className="px-4 py-4 text-sm text-muted-foreground">No runs yet. Use Run Macro on the list.</p>
        ) : (
          <ul className="divide-y divide-border">
            {runs.map((run) => (
              <li key={run.id} className="px-4 py-2 text-sm">
                {run.summary}
              </li>
            ))}
          </ul>
        )}
      </section>
      <form action={deleteDeskMacro} className="mt-4">
        <input type="hidden" name="id" value={macro.id} />
        <Button type="submit" size="sm" variant="destructive">
          Delete macro
        </Button>
      </form>
    </AppShell>
  );
}
