import { SettingsShell } from "@/components/settings/settings-shell";
import { TemplateForm } from "@/components/templates/template-form";
import { getResolvedDesk } from "@/lib/db/brand-queries";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function NewEmailTemplatePage() {
  const desk = await getResolvedDesk();
  if (!desk.isAdmin) redirect("/settings/my-desk?error=admin-only");

  return (
    <SettingsShell title="New email template" current="templates">
      <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
        Write both languages. Spanish-preferring contacts get ES; everyone else gets EN.
      </p>
      <TemplateForm />
    </SettingsShell>
  );
}
