import Link from "next/link";
import {
  ensureFlHoPartitionAction,
  runFlHoShadowAccuracyAction,
} from "@/app/actions/appetite-engine";
import { SettingsShell } from "@/components/settings/settings-shell";
import { buttonVariants } from "@/components/ui/button";
import { requireSiteDeveloperPage } from "@/lib/auth/guards";
import { loadAppetiteEngineDashboard } from "@/lib/appetite/engine";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AppetiteEngineDeveloperPage() {
  await requireSiteDeveloperPage();
  const { partitions, rules, edgeCases, recentPredictions } =
    await loadAppetiteEngineDashboard();

  const standing = rules.filter((r) => r.layer === "standing");
  const candidates = rules.filter((r) => r.layer === "candidate");
  const flHo = partitions.find((p) => p.state === "FL" && p.line === "HO");

  return (
    <SettingsShell
      title="Appetite Engine"
      current="developer"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/settings/developer"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Developer Hub
          </Link>
          <Link
            href="/settings/developer/appetite-log"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Appetite Log
          </Link>
        </div>
      }
    >

      <div className="mb-4 flex flex-wrap gap-2" data-ff-appetite-engine-actions="">
        <form action={ensureFlHoPartitionAction}>
          <button type="submit" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            Ensure FL/HO partition + seed
          </button>
        </form>
        <form action={runFlHoShadowAccuracyAction}>
          <button
            type="submit"
            className={cn(buttonVariants({ size: "sm" }))}
            data-ff-run-shadow-accuracy=""
          >
            Run shadow accuracy
          </button>
        </form>
      </div>

      {flHo ? (
        <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4" data-ff-fl-ho-summary="">
          <div className="ff-card px-3 py-2">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">FL/HO status</div>
            <div className="text-lg font-semibold text-navy">{flHo.status}</div>
          </div>
          <div className="ff-card px-3 py-2">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Accuracy</div>
            <div className="text-lg font-semibold text-navy">
              {flHo.accuracyPct == null ? "—" : `${(flHo.accuracyPct * 100).toFixed(1)}%`}
            </div>
          </div>
          <div className="ff-card px-3 py-2">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Scored shops</div>
            <div className="text-lg font-semibold text-navy">
              {flHo.scoredShops}
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                / {flHo.minSample} min
              </span>
            </div>
          </div>
          <div className="ff-card px-3 py-2">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Threshold</div>
            <div className="text-lg font-semibold text-navy">
              {(flHo.accuracyThreshold * 100).toFixed(0)}%
            </div>
          </div>
        </div>
      ) : null}

      <section className="mb-6" data-ff-appetite-partitions="">
        <h2 className="mb-2 text-sm font-semibold text-navy">Partitions (state × line)</h2>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-wash text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2">State</th>
                <th className="px-3 py-2">Line</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Accuracy</th>
                <th className="px-3 py-2">Scored</th>
              </tr>
            </thead>
            <tbody>
              {partitions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-3 text-muted-foreground">
                    No partitions yet — click Ensure FL/HO.
                  </td>
                </tr>
              ) : (
                partitions.map((p) => (
                  <tr key={p.id} className="border-t border-border">
                    <td className="px-3 py-2 font-medium text-navy">{p.state}</td>
                    <td className="px-3 py-2">{p.line}</td>
                    <td className="px-3 py-2">
                      <span className="rounded-sm border border-border bg-wash px-1.5 py-0.5 text-[11px] font-medium">
                        {p.status}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {p.accuracyPct == null ? "—" : `${(p.accuracyPct * 100).toFixed(1)}%`}
                    </td>
                    <td className="px-3 py-2">
                      {p.scoredShops}/{p.minSample}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <section data-ff-standing-rules="">
          <h2 className="mb-2 text-sm font-semibold text-navy">
            Standing rules ({standing.length})
          </h2>
          <RuleTable rules={standing} empty="No Standing rules." />
        </section>
        <section data-ff-candidate-rules="">
          <h2 className="mb-2 text-sm font-semibold text-navy">
            Candidate rules ({candidates.length})
          </h2>
          <RuleTable rules={candidates} empty="No Candidate rules yet (decline_parse later)." />
        </section>
      </div>

      <section className="mb-6" data-ff-edge-case-queue="">
        <h2 className="mb-2 text-sm font-semibold text-navy">
          Edge-case queue (stub) — open {edgeCases.length}
        </h2>
        {edgeCases.length === 0 ? (
          <p className="text-sm text-muted-foreground">No open edge cases.</p>
        ) : (
          <ul className="space-y-2">
            {edgeCases.map((e) => (
              <li key={e.id} className="ff-card px-3 py-2 text-sm">
                <span className="text-[10px] uppercase text-muted-foreground">{e.status}</span>
                <div className="text-navy">{e.note || "(no note)"}</div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section data-ff-recent-shadow="">
        <h2 className="mb-2 text-sm font-semibold text-navy">
          Recent shadow predictions ({recentPredictions.length})
        </h2>
        {recentPredictions.length === 0 ? (
          <p className="text-sm text-muted-foreground">None yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-wash text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Predicted</th>
                  <th className="px-3 py-2">Actual</th>
                  <th className="px-3 py-2">Reason</th>
                  <th className="px-3 py-2">Scored</th>
                </tr>
              </thead>
              <tbody>
                {recentPredictions.map((p) => (
                  <tr key={p.id} className="border-t border-border">
                    <td className="px-3 py-2 font-medium">{p.predicted}</td>
                    <td className="px-3 py-2">{p.actualDisposition ?? "—"}</td>
                    <td className="px-3 py-2">{p.reasonCode ?? "—"}</td>
                    <td className="px-3 py-2">{p.scored ? "yes" : "no"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </SettingsShell>
  );
}

function RuleTable({
  rules,
  empty,
}: {
  rules: Array<{
    id: string;
    field: string;
    operator: string;
    threshold: unknown;
    disposition: string;
    reasonCode: string;
    source: string;
    live: boolean;
    carrierId: string | null;
  }>;
  empty: string;
}) {
  if (rules.length === 0) {
    return <p className="text-sm text-muted-foreground">{empty}</p>;
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="min-w-full text-left text-xs">
        <thead className="bg-wash text-[10px] uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-2 py-1.5">Field</th>
            <th className="px-2 py-1.5">Op</th>
            <th className="px-2 py-1.5">Threshold</th>
            <th className="px-2 py-1.5">Color</th>
            <th className="px-2 py-1.5">Reason</th>
            <th className="px-2 py-1.5">Src</th>
          </tr>
        </thead>
        <tbody>
          {rules.map((r) => (
            <tr key={r.id} className="border-t border-border">
              <td className="px-2 py-1.5 font-medium text-navy">{r.field}</td>
              <td className="px-2 py-1.5">{r.operator}</td>
              <td className="px-2 py-1.5 font-mono">
                {typeof r.threshold === "string"
                  ? r.threshold
                  : JSON.stringify(r.threshold)}
              </td>
              <td className="px-2 py-1.5">{r.disposition}</td>
              <td className="px-2 py-1.5">{r.reasonCode}</td>
              <td className="px-2 py-1.5">{r.source}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
