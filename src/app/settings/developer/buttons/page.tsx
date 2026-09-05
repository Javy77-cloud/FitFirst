import { DeveloperComingSoon } from "@/components/developer-hub/coming-soon";
import { requireAdminPage } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export default async function DeveloperButtonsPlaceholderPage() {
  await requireAdminPage();
  return (
    <DeveloperComingSoon
      title="Custom Buttons"
      current="custom-buttons"
      sibling="see Custom Buttons / Macros bots"
    />
  );
}
