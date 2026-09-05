import { DeveloperComingSoon } from "@/components/developer-hub/coming-soon";
import { requireAdminPage } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export default async function DeveloperMacrosPlaceholderPage() {
  await requireAdminPage();
  return (
    <DeveloperComingSoon title="Macros" current="macros" sibling="see Custom Buttons / Macros bots" />
  );
}
