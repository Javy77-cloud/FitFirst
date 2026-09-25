import { SettingsShell } from "@/components/settings/settings-shell";
import { TemplateForm } from "@/components/templates/template-form";
import { requireAdminPage } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export default async function NewEmailTemplatePage() {
  await requireAdminPage();

  return (
    <SettingsShell title="New email template" current="templates">

      <TemplateForm />
    </SettingsShell>
  );
}
