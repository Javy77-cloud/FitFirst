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

      <MacroForm templates={templates.map((row) => ({ id: row.id, name: row.name }))} />
    </SettingsShell>
  );
}
