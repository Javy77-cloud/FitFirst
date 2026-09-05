import { DeveloperHubCoreStub } from "@/components/developer-hub/core-stub";
import { requireAdminPage } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export default async function DeveloperHubWebhooksPage() {
  await requireAdminPage();
  return (
    <DeveloperHubCoreStub
      title="Webhooks"
      current="dev-webhooks"
      body="Outbound webhook stubs are reserved for Developer Hub core. Macro email uses the existing outbound email_send_jobs queue."
    />
  );
}
