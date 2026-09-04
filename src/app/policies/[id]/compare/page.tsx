import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { buttonVariants } from "@/components/ui/button";
import { formatMoney } from "@/lib/domain";
import { getPolicyWorkspace } from "@/lib/db/queries";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PolicyComparePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const workspace = await getPolicyWorkspace(id);
  if (!workspace) notFound();

  const { policy, contact, carrier, terms, compareLogs } = workspace;
  const current = terms.find((term) => term.role === "current");
  const proposed = terms.find((term) => term.role === "proposed");
  const title = `Compare renewal · ${policy.policyNumber}`;

  return (
    <AppShell
      title={title}
      actions={
        <Link href={`/policies/${policy.id}`} className={cn(buttonVariants({ variant: "outline" }))}>
          Back to policy
        </Link>
      }
    >
      <p className="mb-4 text-base text-muted-foreground">
        Current term vs the carrier&apos;s proposed term — premium, deductibles, and key
        coverages. {contact ? `${contact.firstName} ${contact.lastName}` : "Client"} ·{" "}
        {carrier?.name ?? "carrier"} · {policy.lineOfBusiness}. Not a rater. No emails.
      </p>

      {policy.status.toLowerCase() !== "active" && policy.status.toLowerCase() !== "bound" ? (
        <section className="ff-card mb-4 p-4 text-base text-muted-foreground">
          Compare renewal is meant for in-force policies. This policy is {policy.status}.
        </section>
      ) : null}

      <div className="mb-4 grid gap-4 md:grid-cols-2">
        <TermCard title="Current term" term={current} />
        <TermCard title="Proposed term" term={proposed} />
      </div>

      <section className="ff-card overflow-hidden">
        <div className="border-b border-border px-4 py-2 text-base font-semibold text-navy">
          Compare log
        </div>
        {compareLogs.length === 0 ? (
          <p className="px-4 py-6 text-base text-muted-foreground">
            No renewal compare has been recorded on this policy. Terms are not seeded on the
            overnight book — this page reads `policy_terms` and `renewal_compare_logs` only.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {compareLogs.map((log) => (
              <li key={log.id} className="px-4 py-2 text-sm">
                <span className="font-medium">{log.eventType}</span>
                <span className="ml-2 text-base text-muted-foreground">{log.summary ?? "—"}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AppShell>
  );
}

function TermCard({
  title,
  term,
}: {
  title: string;
  term:
    | {
        premium: string | null;
        aopDeductible: string | null;
        hurricaneDeductible: string | null;
        termEffective: Date;
        termExpiration: Date;
        notes: string | null;
      }
    | undefined;
}) {
  return (
    <section className="ff-card p-4 text-sm">
      <h2 className="text-base font-semibold text-navy">{title}</h2>
      {!term ? (
        <p className="mt-2 text-base text-muted-foreground">No {title.toLowerCase()} on file.</p>
      ) : (
        <dl className="mt-3 grid gap-2 text-xs">
          <div>
            <dt className="text-muted-foreground">Premium</dt>
            <dd className="font-medium">{formatMoney(term.premium)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Term</dt>
            <dd>
              {term.termEffective.toISOString().slice(0, 10)} →{" "}
              {term.termExpiration.toISOString().slice(0, 10)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">AOP / hurricane</dt>
            <dd>
              {term.aopDeductible ?? "—"} / {term.hurricaneDeductible ?? "—"}
            </dd>
          </div>
          {term.notes ? (
            <div>
              <dt className="text-muted-foreground">Notes</dt>
              <dd>{term.notes}</dd>
            </div>
          ) : null}
        </dl>
      )}
    </section>
  );
}
