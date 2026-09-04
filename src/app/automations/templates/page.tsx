import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { AutomationsModuleNav } from "@/components/automations/module-nav";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { requireSignedIn } from "@/lib/auth/guards";
import { listEmailTemplates } from "@/lib/db/queries";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AutomationsTemplatesPage() {
  const session = await requireSignedIn();
  const templates = await listEmailTemplates();

  return (
    <AppShell
      title="Work email templates"
      actions={
        session.isAdmin ? (
          <Link
            href="/settings/email-templates"
            className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
          >
            Manage in Settings
          </Link>
        ) : null
      }
    >
      <AutomationsModuleNav />
      <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
        Same work-email library the desk already seeds (thank-you, review ask). Agents read it
        here so it is not buried only in Admin Settings. Edits stay Admin-only.
      </p>
      <section className="ff-card overflow-hidden">
        {templates.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">
            No templates yet. Seed the desk or ask Admin to add one.
          </p>
        ) : (
          <table className="ff-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Slug</th>
                <th>Subject</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {templates.map((template) => (
                <tr key={template.id}>
                  <td>
                    <div className="font-medium">{template.name}</div>
                    <div className="mt-1">
                      <Badge variant="outline">Work email</Badge>
                    </div>
                  </td>
                  <td className="text-xs uppercase">{template.slug.replaceAll("_", " ")}</td>
                  <td className="max-w-[280px] truncate text-muted-foreground">
                    {template.subject}
                  </td>
                  <td>
                    {session.isAdmin ? (
                      <Link
                        href={`/settings/email-templates/${template.id}`}
                        className="text-sm text-primary hover:underline"
                      >
                        Open
                      </Link>
                    ) : (
                      <span className="text-xs text-muted-foreground">Admin edits</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </AppShell>
  );
}
