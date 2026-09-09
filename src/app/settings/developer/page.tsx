import Link from "next/link";
import { StatusChip } from "@/components/developer-hub/status-chip";
import { SettingsShell } from "@/components/settings/settings-shell";
import { requireAdminPage } from "@/lib/auth/guards";
import { developerToolCounts } from "@/lib/developer-hub/store";
import type { HubToolStatus } from "@/lib/developer-hub/types";

export const dynamic = "force-dynamic";

const TOOLS: {
  href: string;
  title: string;
  body: string;
  status: HubToolStatus;
  countKey?: keyof Awaited<ReturnType<typeof developerToolCounts>>;
}[] = [
  {
    href: "/automations/macros",
    title: "Macros",
    body: "Platform Settings macros. Target Leads, Deals, Contacts, Businesses, Policies, Campaigns, Tasks, Quotes. Same desk_macros table — not a second list.",
    status: "working",
    countKey: "macros",
  },
  {
    href: "/automations/functions",
    title: "Functions",
    body: "Button / Automation / Schedule / Standalone. Persist the body. Test log. REST with an org API key.",
    status: "working",
    countKey: "functions",
  },
  {
    href: "/automations/webhooks",
    title: "Webhooks",
    body: "Outbound desk events and inbound Signals. Same developer_webhooks tables as Developer Hub core.",
    status: "working",
    countKey: "webhooks",
  },
  {
    href: "/automations/api-keys",
    title: "API Keys",
    body: "Org-level keys. Hashed secret. Used by Standalone function REST.",
    status: "working",
    countKey: "liveKeys",
  },
  {
    href: "/automations/buttons",
    title: "Custom Buttons",
    body: "List / detail / mass-action. URL, function, or widget stub.",
    status: "working",
    countKey: "buttons",
  },
  {
    href: "/automations/client-scripts",
    title: "Client Scripts",
    body: "onLoad / onChange bodies persist. Allowlisted getValue / setValue / showError.",
    status: "working",
    countKey: "scripts",
  },
  {
    href: "/automations/connections",
    title: "Connections",
    body: "Named OAuth connectors. Authorize is a wall. Same developer_connections table.",
    status: "needs_oauth",
    countKey: "connections",
  },
];

export default async function DeveloperHubOverviewPage() {
  const session = await requireAdminPage();
  const counts = await developerToolCounts();

  return (
    <SettingsShell title="Developer Hub" current="developer">
      <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
        Power-user tools live on Automations and share the Settings Developer Hub sibling tables
        (<code>developer_*</code> + <code>desk_macros</code>). Working UIs stop at the API / OAuth
        wall. FitFirst does not call paid vendors and does not write to live Zoho.
      </p>
      {session.isSiteDeveloper ? (
        <Link
          href="/settings/developer/appetite-log"
          className="ff-card mb-4 flex items-start justify-between gap-3 px-4 py-3 hover:border-primary/40"
          data-ff-dev-appetite-log=""
        >
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-sm font-semibold text-navy">Appetite Log</div>
              <StatusChip status="working" />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Platform-builder training data from every quote attempt (quote_attempt_logs). Not visible
              to agents or admins — site developers only.
            </p>
          </div>
        </Link>
      ) : null}
      <p className="mb-4 text-sm">
        <Link href="/automations" className="font-semibold text-primary hover:underline">
          Open Automations hub
        </Link>
      </p>
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="ff-card px-4 py-3">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Functions</div>
          <div className="text-xl font-semibold text-navy">{counts.functions}</div>
        </div>
        <div className="ff-card px-4 py-3">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Live API keys</div>
          <div className="text-xl font-semibold text-navy">{counts.liveKeys}</div>
        </div>
        <div className="ff-card px-4 py-3">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Macros</div>
          <div className="text-xl font-semibold text-navy">{counts.macros}</div>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {TOOLS.map((tool) => (
          <Link
            key={tool.href}
            href={tool.href}
            className="ff-card flex items-start justify-between gap-3 px-4 py-3 hover:border-primary/40"
          >
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-sm font-semibold text-navy">{tool.title}</div>
                <StatusChip status={tool.status} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{tool.body}</p>
              {tool.countKey ? (
                <p className="mt-2 text-xs text-muted-foreground">{counts[tool.countKey]} on this desk</p>
              ) : null}
            </div>
          </Link>
        ))}
      </div>
    </SettingsShell>
  );
}
