import { AppShell } from "@/components/app-shell";
import { SettingsSubnav } from "@/components/templates/email-activity";
import { TemplateForm } from "@/components/templates/template-form";
import { requireAdminPage } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export default async function NewEmailTemplatePage() {
  const session = await requireAdminPage();

  return (
    <AppShell title="New email template">
      <SettingsSubnav current="templates" isAdmin={session.isAdmin} />
      <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
        Write both languages. Spanish-preferring contacts get ES; everyone else gets EN.
      </p>
      <TemplateForm />
    </AppShell>
  );
}
