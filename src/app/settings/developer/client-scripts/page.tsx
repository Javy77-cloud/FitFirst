import { DeveloperComingSoon } from "@/components/developer-hub/coming-soon";
import { requireAdminPage } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export default async function DeveloperClientScriptsPlaceholderPage() {
  await requireAdminPage();
  return (
    <DeveloperComingSoon
      title="Client Scripts"
      current="client-scripts"
      sibling="see Custom Buttons / Macros bots"
    />
  );
}
