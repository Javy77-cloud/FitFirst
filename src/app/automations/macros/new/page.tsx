import { AppShell } from "@/components/app-shell";
import { AutomationsModuleNav } from "@/components/automations/module-nav";
import { MacroForm } from "@/components/developer-hub/macro-form";
import { requireAdminPage } from "@/lib/auth/guards";
import { listEmailTemplates } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default async function NewMacroPage() {
  await requireAdminPage();
  const templates = await listEmailTemplates();
  return (
    <AppShell title="New macro">
      <AutomationsModuleNav />
      <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
        Caps stay at one email stub, three field updates, and three tasks. The macro never
        schedules itself.
      </p>
      <MacroForm templates={templates.map((row) => ({ id: row.id, name: row.name }))} />
    </AppShell>
  );
}
