import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { EmailActivityList, HistoryList } from "@/components/templates/email-activity";
import { getContactWorkspace } from "@/lib/db/template-queries";
import { formatDay } from "@/lib/domain";

export const dynamic = "force-dynamic";

export default async function ContactPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const workspace = await getContactWorkspace(id);
  if (!workspace) notFound();
  const { contact, history, jobs, deals, policies } = workspace;

  return (
    <AppShell title={`${contact.lastName}, ${contact.firstName}`}>
      <p className="mb-4 text-sm text-muted-foreground">
        {contact.email ?? "No email"} · {contact.phone ?? "No phone"} · Preferred language:{" "}
        {contact.preferredLanguage || "blank (EN)"} · Tenure {formatDay(contact.tenureStart)}
      </p>
      <div className="mb-4 flex flex-wrap gap-3 text-sm">
        {deals.map((deal) => (
          <Link key={deal.id} href={`/deals/${deal.id}`} className="text-primary hover:underline">
            {deal.title}
            {deal.archivedAt ? " (archived)" : ""}
          </Link>
        ))}
        {policies.map((policy) => (
          <Link
            key={policy.id}
            href={`/policies/${policy.id}`}
            className="text-primary hover:underline"
          >
            {policy.policyNumber}
          </Link>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="ff-card overflow-hidden">
          <div className="border-b border-border px-4 py-2 text-sm font-semibold text-navy">
            Client email jobs
          </div>
          <EmailActivityList jobs={jobs} empty="No client emails scheduled for this contact." />
        </section>
        <section className="ff-card overflow-hidden">
          <div className="border-b border-border px-4 py-2 text-sm font-semibold text-navy">
            Activity
          </div>
          <HistoryList items={history} />
        </section>
      </div>
    </AppShell>
  );
}
