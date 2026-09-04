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
      {desk.isAdmin ? null : (
        <p className="mb-4 rounded-md border border-border bg-fit-flag-bg px-3 py-2 text-sm">
          Templates are Admin-only. Agents can read the library; use My desk for colors and
          columns.
        </p>
      )}
      {"isExampleCopy" in template && template.isExampleCopy ? (
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
      <TemplateForm template={template} readOnly={!desk.isAdmin} />
    </SettingsShell>
  );
}
