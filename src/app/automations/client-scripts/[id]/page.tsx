import { notFound } from "next/navigation";
import { deleteDeskScript } from "@/app/actions/developer-hub";
import { AppShell } from "@/components/app-shell";
import { AutomationsModuleNav } from "@/components/automations/module-nav";
import { AutomationsNotice } from "@/components/automations/notice";
import { ScriptForm } from "@/components/developer-hub/script-form";
import { HardDeleteForm } from "@/components/desk/hard-delete-form";
import { Button } from "@/components/ui/button";
import { requireAdminPage } from "@/lib/auth/guards";
import { parseClientScript } from "@/lib/developer-hub/client-scripts";
import { getDeskScript } from "@/lib/db/developer-hub-queries";

export const dynamic = "force-dynamic";

export default async function ClientScriptDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage();
  const { id } = await params;
  const query = await searchParams;
  const script = await getDeskScript(id);
  if (!script) notFound();
  const statements = parseClientScript(script.body);

  return (
    <AppShell title={script.name}>
      <AutomationsModuleNav />
      <AutomationsNotice notice={typeof query.notice === "string" ? query.notice : undefined} />
      <ScriptForm script={script} />
      <section className="ff-card mt-4 max-w-3xl p-4">
        <h2 className="text-sm font-semibold text-navy">Parsed statements (test log)</h2>
        {statements.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            No allowlisted statements. The body is saved; the desk will not eval it.
          </p>
        ) : (
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            {statements.map((item, index) => (
              <li key={`${item.kind}-${index}`}>
                {item.kind === "ifEmpty"
                  ? `If ${item.field} is empty → showError on ${item.errorField}: ${item.message}`
                  : `If ${item.field} is empty → setValue ${item.value}`}
              </li>
            ))}
          </ul>
        )}
      </section>
      <HardDeleteForm action={deleteDeskScript} subject="this script" className="mt-4">
        <input type="hidden" name="id" value={script.id} />
        <Button type="submit" size="sm" variant="destructive">
          Delete script
        </Button>
      </HardDeleteForm>
    </AppShell>
  );
}
