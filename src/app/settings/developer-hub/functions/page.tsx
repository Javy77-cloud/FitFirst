import { DeveloperHubCoreStub } from "@/components/developer-hub/core-stub";
import { requireAdminPage } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export default async function DeveloperHubFunctionsPage() {
  await requireAdminPage();
  return (
    <DeveloperHubCoreStub
      title="Functions"
      current="dev-functions"
      body="Server functions by apiName live on the sibling Developer Hub core branch (Functions / API / Webhooks / Connections). Custom Buttons keep a nullable functionApiName and toast a no-op until that table exists."
    />
  );
}
