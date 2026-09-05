import { MacroForm } from "@/components/developer-hub/macro-form";
import { SettingsShell } from "@/components/settings/settings-shell";
import { requireAdminPage } from "@/lib/auth/guards";
import { listEmailTemplates } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default async function NewMacroPage() {
  await requireAdminPage();
  const templates = await listEmailTemplates();
  return (
    <SettingsShell title="New macro" current="macros">
      <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
        Pick target modules and actions. Macros do not schedule. Agents run them from the
        matching list or record. Same desk_macros row as Automations.
      </p>
      <MacroForm templates={templates.map((row) => ({ id: row.id, name: row.name }))} />
    </SettingsShell>
  );
}
