import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { RiskForm } from "@/components/deal/risk-form";
import { SettingsSubnav } from "@/components/templates/email-activity";
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
    <AppShell title="Master risk">
      <SettingsSubnav current="master-risk" />
      {!session.isAdmin ? (
        <p className="mb-4 rounded-md border border-border bg-fit-flag-bg px-3 py-2 text-sm">
          Master risk is an Admin background appetite tool. It is not on the agent Deal. Agents
          shop from Documents, Quote Sheet, Markets, and Quotes.
        </p>
      ) : (
        <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
          Background appetite worksheet. Agents do not see this tab on the Deal. Pick a shop,
          edit the structured risk, then use Markets on that Deal. Ana stays unbound.
        </p>
      )}

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
      ) : session.isAdmin && dealId && !workspace?.risk ? (
        <p className="text-sm text-muted-foreground">That deal has no master risk row.</p>
      ) : session.isAdmin ? (
        <p className="text-sm text-muted-foreground">Choose a deal to edit its appetite worksheet.</p>
      ) : null}
    </AppShell>
  );
}
