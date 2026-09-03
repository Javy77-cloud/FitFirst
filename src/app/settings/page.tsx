import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { buttonVariants } from "@/components/ui/button";
import { listEmailJobs, listEmailTemplates, listEmailTriggers } from "@/lib/db/template-queries";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [templates, triggers, jobs] = await Promise.all([
    listEmailTemplates(),
    listEmailTriggers(),
    listEmailJobs(),
  ]);
  const queued = jobs.filter(({ job }) => job.status === "queued").length;

  return (
    <AppShell title="Settings">
      <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
        Desk settings for Javier Garcia Insurance. Client mail lives in the template library.
        Internal alerts stay in-app — nothing emails the broker.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <section className="ff-card p-4">
          <h2 className="text-sm font-semibold text-navy">Email templates</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {templates.length} client templates, each with English and Spanish. Seeded bodies are
            example copy you can edit.
          </p>
          <Link
            href="/settings/email-templates"
            className={cn(buttonVariants(), "mt-3")}
          >
            Open template library
          </Link>
        </section>
        <section className="ff-card p-4">
          <h2 className="text-sm font-semibold text-navy">Email triggers</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {triggers.filter((row) => row.trigger.enabled).length} of {triggers.length} triggers
            on. {queued} send{queued === 1 ? "" : "s"} waiting on a connected inbox.
          </p>
          <Link
            href="/settings/email-triggers"
            className={cn(buttonVariants({ variant: "outline" }), "mt-3")}
          >
            Manage triggers
          </Link>
        </section>
      </div>
    </AppShell>
  );
}
