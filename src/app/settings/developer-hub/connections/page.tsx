import { DeveloperHubCoreStub } from "@/components/developer-hub/core-stub";
import { requireAdminPage } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export default async function DeveloperHubConnectionsPage() {
  await requireAdminPage();
  return (
    <DeveloperHubCoreStub
      title="Connections"
      current="dev-connections"
      body="OAuth / connector stubs are reserved for Developer Hub core. Integrations catalog stays under Settings → Integrations."
    />
  );
}
