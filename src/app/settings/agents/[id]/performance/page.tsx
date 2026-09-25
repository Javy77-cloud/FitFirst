import Link from "next/link";
import { notFound } from "next/navigation";
import { ScorecardStatGrid } from "@/components/scorecards/scorecard-grid";
import { SettingsShell } from "@/components/settings/settings-shell";
import { requireAdminPage } from "@/lib/auth/guards";
import { getPerson } from "@/lib/people/store";
import { loadOneScorecard } from "@/lib/scorecards/load";

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
  const { card } = await loadOneScorecard(person.id);

  return (
    <SettingsShell title={`${person.name} · production`} current="agents">
      <p className="mb-4 text-sm text-muted-foreground">
        <Link href={`/settings/agents/${person.id}`} className="text-primary hover:underline">
          Back to {person.name}
        </Link>
        {" · "}
        <Link href={`/scorecards/${person.id}`} className="text-primary hover:underline">
          Full producer scorecard
        </Link>
      </p>

      {person.status !== "active" ? (
        <p className="mb-4 rounded-md bg-fit-yellow-bg px-3 py-2 text-sm text-fit-yellow">
          This login is {person.status}. Figures are historical.
        </p>
      ) : null}

      {card ? (
        <ScorecardStatGrid card={card} />
      ) : (
        <p className="rounded-md bg-fit-yellow-bg px-3 py-2 text-sm text-fit-yellow">
          No scorecard rows for this login yet.
        </p>
      )}

    </SettingsShell>
  );
}
