import { AppShell } from "@/components/app-shell";
import { AutomationsModuleNav } from "@/components/automations/module-nav";
import { FunctionForm } from "@/components/developer-hub/function-form";
import { requireAdminPage } from "@/lib/auth/guards";
import { listDeveloperConnections } from "@/lib/developer-hub/store";

export const dynamic = "force-dynamic";

export default async function NewFunctionPage() {
  await requireAdminPage();
  const connections = await listDeveloperConnections();
  return (
    <AppShell title="New function">
      <AutomationsModuleNav />
      <FunctionForm connections={connections} />
    </AppShell>
  );
}
