import Link from "next/link";
import { RiskForm } from "@/components/deal/risk-form";
import { SettingsShell } from "@/components/settings/settings-shell";
import { currentDeskSession } from "@/lib/auth/session";
import { getDealWorkspace, listDealLookup } from "@/lib/db/queries";
import { isUuid } from "@/lib/ids";

export const dynamic = "force-dynamic";

export default async function MasterRiskSettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [session, deals, query] = await Promise.all([
    currentDeskSession(),
    listDealLookup(),
    searchParams,
  ]);
  const dealId = typeof query.deal === "string" && isUuid(query.deal) ? query.deal : "";
  const riskTab = typeof query.riskTab === "string" ? query.riskTab : undefined;
  const workspace = dealId && session.isAdmin ? await getDealWorkspace(dealId) : null;

  return (
    <SettingsShell title="Master risk" current="master-risk">

      {session.isAdmin ? (
        <form className="mb-4 flex flex-wrap items-end gap-2" method="get">
          <label className="text-xs">
            Deal
            <select
              name="deal"
              defaultValue={dealId}
              className="mt-1 block h-8 min-w-72 rounded-md border border-input bg-card px-2 text-sm"
            >
              <option value="">Choose a deal</option>
              {deals.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.title}
                  {row.partyName ? ` · ${row.partyName}` : ""}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="h-8 rounded-md border border-border px-3 text-sm font-medium"
          >
            Open worksheet
          </button>
        </form>
      ) : null}

      {session.isAdmin && workspace?.risk ? (
        <div className="space-y-3">
          <p className="text-sm">
            Editing <span className="font-medium text-navy">{workspace.deal.title}</span>.{" "}
            <Link href={`/deals/${workspace.deal.id}`} className="text-primary hover:underline">
              Open deal
            </Link>
          </p>
          <RiskForm
            risk={workspace.risk}
            dealId={workspace.deal.id}
            activeTab={riskTab}
            extraQuery={{ deal: workspace.deal.id }}
          />
        </div>
      ) : session.isAdmin && dealId && !workspace?.risk ? null : session.isAdmin ? null : null}
    </SettingsShell>
  );
}
