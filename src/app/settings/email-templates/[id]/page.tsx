import { notFound } from "next/navigation";
import { duplicateEmailTemplate } from "@/app/actions/templates";
import { AppShell } from "@/components/app-shell";
import { SettingsSubnav } from "@/components/templates/email-activity";
import { TemplateForm } from "@/components/templates/template-form";
import { Button } from "@/components/ui/button";
import { getEmailTemplate } from "@/lib/db/template-queries";

export const dynamic = "force-dynamic";

export default async function EditEmailTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const template = await getEmailTemplate(id);
  if (!template) notFound();

  return (
    <AppShell
      title={template.name}
      actions={
        <form action={duplicateEmailTemplate}>
          <input type="hidden" name="id" value={template.id} />
          <Button type="submit" size="sm" variant="outline">
            Duplicate
          </Button>
        </form>
      }
    >
      <SettingsSubnav current="templates" />
      {template.isExampleCopy ? (
        <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
          Example copy for Javier Garcia Insurance (321-429-1182). Edit the body, then uncheck
          “example copy” so a later seed does not overwrite your voice. Mail sends from the
          connected inbox — no street address is baked in.
        </p>
      ) : (
        <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
          Your edited copy. Seed will not overwrite this template.
        </p>
      )}
      <TemplateForm template={template} />
    </AppShell>
  );
}
