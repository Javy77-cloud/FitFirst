import Link from "next/link";
import { notFound } from "next/navigation";
import { SettingsShell } from "@/components/settings/settings-shell";
import { requireAdminPage } from "@/lib/auth/guards";
import { formatMoney } from "@/lib/domain";
import { agentProduction, getPerson } from "@/lib/people/store";

export const dynamic = "force-dynamic";

export default async function AgentPerformancePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminPage();
  const { id } = await params;
  const person = await getPerson(id);
  if (!person) notFound();
  const stats = await agentProduction(person.id);

  return (
    <SettingsShell title={`${person.name} · production`} current="agents">
      <p className="mb-4 text-sm text-muted-foreground">
        <Link href={`/settings/agents/${person.id}`} className="text-primary hover:underline">
          Back to {person.name}
        </Link>
        {" · "}
        Agent-scoped KPIs from the book they own. Ana Dib HO3 stays Quote Sent / unbound at{" "}
        <span className="font-medium text-navy">$321,000</span> on the Admin shop — not this
        production total.
      </p>

      {person.status !== "active" ? (
        <p className="mb-4 rounded-md bg-fit-yellow-bg px-3 py-2 text-sm text-fit-yellow">
          This login is {person.status}. Figures are historical.
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Stat label="Leads owned" value={String(stats.leads)} />
        <Stat label="Deals owned" value={String(stats.deals)} hint={`${stats.shopping} still shopping`} />
        <Stat label="Policies owned" value={String(stats.policies)} hint={`${stats.inForce} in force`} />
        <Stat label="In-force premium" value={formatMoney(stats.premium)} hint="Active + Bound only" />
      </div>

      <section className="ff-card mt-4 p-4">
        <h2 className="text-sm font-semibold text-navy">What this is</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Counts use <code className="text-xs">owner_id</code> on Leads, Deals, and Policies.
          Home widgets stay on{" "}
          <Link href="/" className="text-primary hover:underline">
            Home
          </Link>{" "}
          when the agent can see agency widgets. This page is the Admin performance stub for
          one person.
        </p>
      </section>
    </SettingsShell>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="ff-card px-4 py-3">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-xl font-semibold text-navy">{value}</div>
      {hint ? <div className="text-xs text-muted-foreground">{hint}</div> : null}
    </div>
  );
}
