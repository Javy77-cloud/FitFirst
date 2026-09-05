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
      <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
        Name plus apiName. Standalone functions can expose REST (org API key) or show the OAuth
        wall. The body is not evaluated as host JavaScript.
      </p>
      <FunctionForm connections={connections} />
    </SettingsShell>
  );
}
