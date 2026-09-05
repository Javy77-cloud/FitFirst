import { ScriptForm } from "@/components/developer-hub/script-form";
import { SettingsShell } from "@/components/settings/settings-shell";
import { requireAdminPage } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export default async function NewClientScriptPage() {
  await requireAdminPage();
  return (
    <SettingsShell title="New client script" current="dev-scripts">
      <ScriptForm />
    </SettingsShell>
  );
}
