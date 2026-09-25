import Link from "next/link";
import { duplicateEmailTemplate } from "@/app/actions/templates";
import { SettingsShell } from "@/components/settings/settings-shell";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { requireAdminPage } from "@/lib/auth/guards";
import { getResolvedDesk } from "@/lib/db/brand-queries";
import { listEmailTemplates } from "@/lib/db/template-queries";
import type { EmailTemplate } from "@/lib/db/schema";
import { partitionEmailTemplates } from "@/lib/templates/library";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

function TemplateTable({
  templates,
  canEdit,
  empty,
}: {
  templates: EmailTemplate[];
  canEdit: boolean;
  empty: string;
}) {
  if (templates.length === 0) {
    return <p className="px-4 py-6 text-sm text-muted-foreground">{empty}</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="ff-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Kind</th>
            <th>Languages</th>
            <th>Subject (EN)</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {templates.map((template) => (
            <tr key={template.id}>
              <td>
                <Link
                  href={`/settings/email-templates/${template.id}`}
                  className="font-medium text-primary hover:underline"
                >
                  {template.name}
                </Link>
                {"isExampleCopy" in template && template.isExampleCopy ? (
                  <div className="mt-1">
                    <Badge variant="outline">Example copy</Badge>
                  </div>
                ) : null}
              </td>
              <td className="uppercase">
                {("kind" in template && typeof template.kind === "string"
                  ? template.kind
                  : template.slug
                ).replaceAll("_", " ")}
              </td>
              <td>EN + ES</td>
              <td className="max-w-[240px] truncate text-muted-foreground">
                {"subjectEn" in template && typeof template.subjectEn === "string"
                  ? template.subjectEn
                  : template.subject}
              </td>
              <td>
                {canEdit ? (
                  <form action={duplicateEmailTemplate}>
                    <input type="hidden" name="id" value={template.id} />
                    <Button type="submit" size="xs" variant="ghost">
                      Duplicate
                    </Button>
                  </form>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function EmailTemplatesPage() {
  await requireAdminPage();
  const [templates, desk] = await Promise.all([listEmailTemplates(), getResolvedDesk()]);
  const { system, custom } = partitionEmailTemplates(templates);

  return (
    <SettingsShell
      title="Email templates"
      current="templates"
      actions={
        desk.isAdmin ? (
          <Link href="/settings/email-templates/new" className={cn(buttonVariants())}>
            New template
          </Link>
        ) : null
      }
    >
      <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
        Admin library only. System templates stay seeded; custom templates are yours. Documents
        live under{" "}
        <Link href="/documents" className="text-primary hover:underline">
          Documents
        </Link>
        , not here. Preview the same rows on{" "}
        <Link href="/automations/templates" className="text-primary hover:underline">
          Automations → Email templates
        </Link>
        . Merge {`{{signature}}`} for the agency close.
      </p>
      <div className="space-y-4" data-ff-email-library="">
        <section className="ff-card overflow-hidden">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold text-navy">System</h2>

          </div>
          <TemplateTable
            templates={system}
            canEdit={desk.isAdmin}
            empty="No system templates. Seed the desk."
          />
        </section>
        <section className="ff-card overflow-hidden">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold text-navy">Custom</h2>

          </div>
          <TemplateTable
            templates={custom}
            canEdit={desk.isAdmin}
            empty="No custom templates yet. Duplicate a system row or create one."
          />
        </section>
      </div>
    </SettingsShell>
  );
}
