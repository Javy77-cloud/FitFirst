import { ButtonForm } from "@/components/developer-hub/button-form";
import { SettingsShell } from "@/components/settings/settings-shell";
import { requireAdminPage } from "@/lib/auth/guards";
import { listDeskWidgets } from "@/lib/db/developer-hub-queries";

export const dynamic = "force-dynamic";

export default async function NewCustomButtonPage() {
  await requireAdminPage();
  const widgets = await listDeskWidgets();
  return (
    <SettingsShell title="New custom button" current="dev-buttons">
      <ButtonForm widgets={widgets} />
    </SettingsShell>
  );
}
