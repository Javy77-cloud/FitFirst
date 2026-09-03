import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { SettingsSubnav } from "@/components/templates/email-activity";
import { buttonVariants } from "@/components/ui/button";
import { getResolvedDesk } from "@/lib/db/brand-queries";
import { listEmailJobs, listEmailTemplates, listEmailTriggers } from "@/lib/db/template-queries";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [desk, templates, triggers, jobs] = await Promise.all([
    getResolvedDesk(),
    listEmailTemplates(),
    listEmailTriggers(),
    listEmailJobs(),
  ]);
  const queued = jobs.filter(({ job }) => job.status === "queued").length;

  return (
    <AppShell title="Settings">
      <SettingsSubnav current="hub" />
      <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
        Two layers: <strong>Agency</strong> (Admin) sets the default look and standardized
        client mail. <strong>My desk</strong> is each agent&apos;s colors, fonts, density, and
        columns. No SaaS billing. Nothing emails the broker.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <section className="ff-card p-4">
          <h2 className="text-sm font-semibold text-navy">Agency (Admin)</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Logo + {desk.agencyName} in the top-left. {templates.length} templates. Signatures
            and triggers for client mail.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href="/settings/agency" className={cn(buttonVariants())}>
              Agency branding
            </Link>
            <Link
              href="/settings/email-templates"
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              Templates
            </Link>
            <Link
              href="/settings/email-signatures"
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              Signatures
            </Link>
          </div>
        </section>
        <section className="ff-card p-4">
          <h2 className="text-sm font-semibold text-navy">My desk (Agent)</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Acting as {desk.actor.label}. Color {desk.colorPreset}, {desk.fontPreset} font,{" "}
            {desk.density} density. {queued} queued client send
            {queued === 1 ? "" : "s"}. {triggers.filter((row) => row.trigger.enabled).length}{" "}
            triggers on.
          </p>
          <Link href="/settings/my-desk" className={cn(buttonVariants({ variant: "outline" }), "mt-3")}>
            Edit my desk
          </Link>
        </section>
      </div>
    </AppShell>
  );
}
