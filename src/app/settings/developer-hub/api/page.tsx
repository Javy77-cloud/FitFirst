import { DeveloperHubCoreStub } from "@/components/developer-hub/core-stub";
import { requireAdminPage } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export default async function DeveloperHubApiPage() {
  await requireAdminPage();
  return (
    <DeveloperHubCoreStub
      title="API"
      current="dev-api"
      body="REST token stubs are reserved for Developer Hub core. This branch does not invent a second token table."
    />
  );
}
