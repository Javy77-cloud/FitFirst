import { DeveloperComingSoon } from "@/components/developer-hub/coming-soon";
import { requireAdminPage } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export default async function DeveloperWidgetsPlaceholderPage() {
  await requireAdminPage();
  return (
    <DeveloperComingSoon title="Widgets" current="widgets" sibling="see Widgets sibling bot" />
  );
}
