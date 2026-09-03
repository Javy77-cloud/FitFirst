import { AppShell } from "@/components/app-shell";
import { SettingsSubnav } from "@/components/templates/email-activity";
import { TemplateForm } from "@/components/templates/template-form";

export const dynamic = "force-dynamic";

export default function NewEmailTemplatePage() {
  return (
    <AppShell title="New email template">
      <SettingsSubnav current="templates" />
      <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
        Write both languages. Spanish-preferring contacts get ES; everyone else gets EN.
      </p>
      <TemplateForm />
    </AppShell>
  );
}
