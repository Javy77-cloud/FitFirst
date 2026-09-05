import { AppShell } from "@/components/app-shell";
import { AutomationsModuleNav } from "@/components/automations/module-nav";
import { ButtonForm } from "@/components/developer-hub/button-form";
import { requireAdminPage } from "@/lib/auth/guards";
import { listDeskWidgets } from "@/lib/db/developer-hub-queries";

export const dynamic = "force-dynamic";

export default async function NewButtonPage() {
  await requireAdminPage();
  const widgets = await listDeskWidgets();
  return (
    <AppShell title="New custom button">
      <AutomationsModuleNav />
      <ButtonForm widgets={widgets} />
    </AppShell>
  );
}
