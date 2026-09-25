import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { requireDeveloperPage } from "@/lib/auth/guards";
import { DEVELOPER_UPCOMING } from "@/lib/developer/notes";
import { loadDeveloperUsageTiles } from "@/lib/developer/usage-store";
export const dynamic = "force-dynamic";

export default async function DeveloperHubPage() {
  const session = await requireDeveloperPage();
  let tiles: Awaited<ReturnType<typeof loadDeveloperUsageTiles>> = [];
  try {
    tiles = await loadDeveloperUsageTiles();
  } catch {
    tiles = [];
  }

  return (
    <AppShell title="Developer" eyebrow="Platform">

      <section className="mb-6" data-ff-developer-usage="">
        <h2 className="mb-2 text-sm font-semibold text-navy">API usage this month</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {tiles.map((tile) => (
            <div key={tile.id} className="ff-card space-y-1 p-4" data-ff-api-meter={tile.id}>
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-navy">{tile.label}</h3>
                {tile.instrumented ? (
                  <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    {tile.month}
                  </span>
                ) : null}
              </div>
              <p className="text-sm text-muted-foreground" data-ff-api-meter-status="">
                {tile.statusLabel}
              </p>
              {tile.instrumented && tile.limit != null ? (
                <p className="text-helper text-muted-foreground">Optional monthly cap</p>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      <section className="mb-6" data-ff-developer-healthsherpa="">
        <h2 className="mb-2 text-sm font-semibold text-navy">HealthSherpa</h2>
        <Link
          href="/developer/healthsherpa"
          className="ff-card block p-4 hover:border-primary/40"
          data-ff-developer-healthsherpa-open=""
        >
          <div className="text-sm font-semibold text-navy">Inbound contact review</div>

        </Link>
      </section>

      <section className="mb-6" data-ff-developer-auto-gaps="">
        <h2 className="mb-2 text-sm font-semibold text-navy">Auto quote gaps</h2>
        <Link
          href="/developer/auto-question-gaps"
          className="ff-card block p-4 hover:border-primary/40"
          data-ff-developer-auto-gaps-open=""
        >
          <div className="text-sm font-semibold text-navy">Carrier questions not on the Auto risk profile</div>

        </Link>
      </section>

      <section className="mb-6" data-ff-developer-login-issues="">
        <h2 className="mb-2 text-sm font-semibold text-navy">Carrier login issues</h2>
        <Link
          href="/developer/carrier-login-issues"
          className="ff-card block p-4 hover:border-primary/40"
          data-ff-developer-login-issues-open=""
        >
          <div className="text-sm font-semibold text-navy">Quote-bot login failures</div>

        </Link>
      </section>

      <section className="mb-6" data-ff-developer-gaps="">
        <h2 className="mb-2 text-sm font-semibold text-navy">Missing questions</h2>
        <Link
          href="/developer/missing-questions"
          className="ff-card block p-4 hover:border-primary/40"
          data-ff-developer-gaps-open=""
        >
          <div className="text-sm font-semibold text-navy">Carrier field gap list</div>

        </Link>
      </section>

      <section data-ff-developer-notes="">
        <h2 className="mb-2 text-sm font-semibold text-navy">Upcoming</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {DEVELOPER_UPCOMING.map((note) => (
            <div key={note.id} className="ff-card space-y-1 p-4">
              <h3 className="text-sm font-semibold text-navy">{note.title}</h3>
              <p className="text-sm text-muted-foreground">{note.body}</p>
            </div>
          ))}
        </div>
      </section>

      {session.isSiteDeveloper ? (
        <p className="mt-6 text-sm">
          <Link href="/settings/developer-hub/api-vault" className="text-primary font-medium">
            Open API vault
          </Link>

        </p>
      ) : null}
    </AppShell>
  );
}
