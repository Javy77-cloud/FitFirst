import { notFound } from "next/navigation";
import { duplicateEmailTemplate } from "@/app/actions/templates";
import { SettingsShell } from "@/components/settings/settings-shell";
import { TemplateForm } from "@/components/templates/template-form";
import { Button } from "@/components/ui/button";
import { requireAdminPage } from "@/lib/auth/guards";
import { getResolvedDesk } from "@/lib/db/brand-queries";
import { getEmailTemplate } from "@/lib/db/template-queries";

export const dynamic = "force-dynamic";

export default async function EditEmailTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireAdminPage();
  const [template, desk] = await Promise.all([getEmailTemplate(id), getResolvedDesk()]);
  if (!template) notFound();

  return (
    <SettingsShell
      title={template.name}
      current="templates"
      actions={
        desk.isAdmin ? (
          <form action={duplicateEmailTemplate}>
            <input type="hidden" name="id" value={template.id} />
            <Button type="submit" size="sm" variant="outline">
              Duplicate
            </Button>
          </form>
        ) : null
      }
    >
      {desk.isAdmin ? null : null}
      {"isExampleCopy" in template && template.isExampleCopy ? null : null}
      <TemplateForm template={template} readOnly={!desk.isAdmin} />
    </SettingsShell>
  );
}
