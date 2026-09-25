import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { AutomationsModuleNav } from "@/components/automations/module-nav";
import { TemplateLocalePreview } from "@/components/automations/template-preview";
import { buttonVariants } from "@/components/ui/button";
import { requireSignedIn } from "@/lib/auth/guards";
import { listEmailTemplates } from "@/lib/db/queries";
import { partitionEmailTemplates, templateLanguageLabel, templateLocaleCopy } from "@/lib/templates/library";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AutomationsTemplatesPage() {
  const session = await requireSignedIn();
  const templates = await listEmailTemplates();
  const buckets = partitionEmailTemplates(templates);
  const readyBoth = templates.filter((row) => {
    const copy = templateLocaleCopy(row);
    return copy.enReady && copy.esReady;
  }).length;

  return (
    <AppShell
      title="Email templates"
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

      <p className="mb-4 text-xs text-navy">
        {readyBoth} of {templates.length} ready in both languages.
      </p>
      {templates.length === 0 ? (
        <section className="ff-card px-4 py-6 text-sm text-muted-foreground">
          No templates yet.
        </section>
      ) : (
        <div className="space-y-6" data-ff-email-library="">
          {(["system", "custom"] as const).map((bucket) => {
            const rows = buckets[bucket];
            return (
              <section key={bucket}>
                <h2 className="mb-2 text-sm font-semibold text-navy">
                  {bucket === "system" ? "System" : "Custom"}
                </h2>
                {rows.length === 0 ? (
                  <p className="text-sm text-muted-foreground">None in this bucket.</p>
                ) : (
                  <div className="grid gap-3 lg:grid-cols-2">
                    {rows.map((template) => {
                      const copy = templateLocaleCopy(template);
                      return (
                        <div key={template.id}>
                          <TemplateLocalePreview name={template.name} ready={copy} />
                          <p className="mt-1 px-1 text-[11px] text-muted-foreground">
                            {templateLanguageLabel(copy)}
                            {session.isAdmin ? (
                              <>
                                {" · "}
                                <Link
                                  href={`/settings/email-templates/${template.id}`}
                                  className="text-primary hover:underline"
                                >
                                  Edit
                                </Link>
                              </>
                            ) : (
                              " · Admin edits"
                            )}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
