import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { EmailActivityList, HistoryList } from "@/components/templates/email-activity";
import { getPolicyWorkspace } from "@/lib/db/template-queries";
import { formatDay, formatMoney } from "@/lib/domain";

export const dynamic = "force-dynamic";

export default async function PolicyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const workspace = await getPolicyWorkspace(id);
  if (!workspace) notFound();
  const { policy, contact, history, jobs } = workspace;

  return (
    <AppShell title={policy.policyNumber}>
      <p className="mb-4 text-sm text-muted-foreground">
        {policy.lineOfBusiness} · {formatMoney(policy.premium)} · Expires {formatDay(policy.expirationDate)}{" "}
        ·{" "}
        <Link href={`/contacts/${contact.id}`} className="text-primary hover:underline">
          {contact.lastName}, {contact.firstName}
        </Link>
        {policy.dealId ? (
          <>
            {" "}
            ·{" "}
            <Link href={`/deals/${policy.dealId}`} className="text-primary hover:underline">
              Deal
            </Link>
          </>
        ) : null}
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="ff-card overflow-hidden">
          <div className="border-b border-border px-4 py-2 text-sm font-semibold text-navy">
            Renewal / client email jobs
          </div>
          <EmailActivityList
            jobs={jobs}
            empty="No renewal emails on this policy. 60- and 30-day triggers schedule from the expiration date."
          />
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
