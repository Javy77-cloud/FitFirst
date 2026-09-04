import Link from "next/link";
import { duplicateEmailTemplate } from "@/app/actions/templates";
import { SettingsShell } from "@/components/settings/settings-shell";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { requireAdminPage } from "@/lib/auth/guards";
import { getResolvedDesk } from "@/lib/db/brand-queries";
import { listEmailTemplates } from "@/lib/db/template-queries";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function EmailTemplatesPage() {
  const session = await requireAdminPage();
  const [templates, desk] = await Promise.all([listEmailTemplates(), getResolvedDesk()]);

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
        Client-facing mail only. Every template ships English and Spanish. If a contact prefers
        Spanish we send ES; English, Creole, or blank uses EN. Seeded copy is marked so you can
        rewrite it in your voice. The same library is on{" "}
        <Link href="/automations/templates" className="text-primary hover:underline">
          Automations → Work email templates
        </Link>
        .
      </p>
      <section className="ff-card overflow-hidden">
        {templates.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">
            No templates yet. Seed the desk or create one.
          </p>
        ) : (
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
                      {desk.isAdmin ? (
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
        )}
      </section>
    </SettingsShell>
  );
}
