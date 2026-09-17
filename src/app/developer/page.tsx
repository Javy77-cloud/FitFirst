import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { requireDeveloperPage } from "@/lib/auth/guards";
import { DEVELOPER_UPCOMING } from "@/lib/developer/notes";
import { loadDeveloperUsageTiles } from "@/lib/developer/usage-store";
import { NOT_COUNTED_YET } from "@/lib/developer/usage";

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
      <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
        Third desk profile — separate from Admin and Agent. Tiles increment only when the server
        actually calls the vendor. Missing instrumentation stays {NOT_COUNTED_YET}.
      </p>

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

      <section className="mb-6" data-ff-developer-gaps="">
        <h2 className="mb-2 text-sm font-semibold text-navy">Missing questions</h2>
        <Link
          href="/developer/missing-questions"
          className="ff-card block p-4 hover:border-primary/40"
          data-ff-developer-gaps-open=""
        >
          <div className="text-sm font-semibold text-navy">Carrier field gap list</div>
          <p className="mt-1 text-sm text-muted-foreground">
            When a quote bot or carrier asks for data FitFirst has no field for, log it once. Mark
            Added after Deal Details or Risk Profile ships the field. Starts empty — no example
            carrier noise.
          </p>
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
          <span className="text-muted-foreground"> — keys stay masked for Admin.</span>
        </p>
      ) : null}
    </AppShell>
  );
}
