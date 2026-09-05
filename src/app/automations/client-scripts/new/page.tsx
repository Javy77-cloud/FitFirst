import { AppShell } from "@/components/app-shell";
import { AutomationsModuleNav } from "@/components/automations/module-nav";
import { ScriptForm } from "@/components/developer-hub/script-form";
import { requireAdminPage } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export default async function NewClientScriptPage() {
  await requireAdminPage();
  return (
    <AppShell title="New client script">
      <AutomationsModuleNav />
      <ScriptForm />
    </AppShell>
  );
}
