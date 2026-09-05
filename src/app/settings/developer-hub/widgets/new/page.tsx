import { WidgetForm } from "@/components/developer-hub/widget-form";
import { SettingsShell } from "@/components/settings/settings-shell";
import { requireAdminPage } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export default async function NewWidgetPage() {
  await requireAdminPage();
  return (
    <SettingsShell title="New widget" current="dev-widgets">
      <WidgetForm />
    </SettingsShell>
  );
}
