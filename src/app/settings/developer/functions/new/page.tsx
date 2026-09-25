import { FunctionForm } from "@/components/developer-hub/function-form";
import { SettingsShell } from "@/components/settings/settings-shell";
import { requireAdminPage } from "@/lib/auth/guards";
import { listDeveloperConnections } from "@/lib/developer-hub/store";

export const dynamic = "force-dynamic";

export default async function NewDeveloperFunctionPage() {
  await requireAdminPage();
  const connections = await listDeveloperConnections();

  return (
    <SettingsShell title="New function" current="functions">

      <FunctionForm connections={connections} />
    </SettingsShell>
  );
}
