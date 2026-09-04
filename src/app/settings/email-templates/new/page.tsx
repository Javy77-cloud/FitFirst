import { SettingsShell } from "@/components/settings/settings-shell";
import { TemplateForm } from "@/components/templates/template-form";
import { requireAdminPage } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export default async function NewEmailTemplatePage() {
  const session = await requireAdminPage();

  return (
    <SettingsShell title="New email template" current="templates">
      <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
        Write both languages. Spanish-preferring contacts get ES; everyone else gets EN.
      </p>
      <TemplateForm />
    </SettingsShell>
  );
}
