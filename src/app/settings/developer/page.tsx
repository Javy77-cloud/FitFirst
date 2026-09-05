import Link from "next/link";
import { SettingsShell } from "@/components/settings/settings-shell";
import { StatusChip } from "@/components/developer-hub/status-chip";
import { requireAdminPage } from "@/lib/auth/guards";
import { hubOverviewCounts } from "@/lib/developer-hub/store";
import type { HubToolStatus } from "@/lib/developer-hub/types";

export const dynamic = "force-dynamic";

const TOOLS: {
  href: string;
  title: string;
  body: string;
  status: HubToolStatus;
  countKey?: keyof Awaited<ReturnType<typeof hubOverviewCounts>>;
}[] = [
  {
    href: "/settings/developer/functions",
    title: "Functions",
    body: "Named custom functions with a category, language picklist, and a persisted code body. Run test uses an allowlisted JSON transform — no host process spawn.",
    status: "working",
    countKey: "functions",
  },
  {
    href: "/settings/developer/api-keys",
    title: "API Keys",
    body: "Org-level keys (name, prefix, hashed secret). Shown once on create. The Function REST stub checks these keys.",
    status: "working",
    countKey: "liveKeys",
  },
  {
    href: "/settings/developer/webhooks",
    title: "Webhooks",
    body: "Outbound desk events enqueue a local delivery row. Send test POSTs only to localhost. Inbound Signals store a payload and raise an in-app alert.",
    status: "working",
    countKey: "webhooks",
  },
  {
    href: "/settings/developer/connections",
    title: "Connections",
    body: "Named connectors (Google, Outlook, DocuSign, Stripe, Zoho CRM sync, Custom OAuth). Client secrets are encrypted at rest. Authorize stops at the OAuth wall.",
    status: "needs_oauth",
    countKey: "connections",
  },
  {
    href: "/settings/developer/macros",
    title: "Macros",
    body: "Coming on the Macros sibling branch.",
    status: "stub",
  },
  {
    href: "/settings/developer/buttons",
    title: "Custom Buttons",
    body: "Coming on the Custom Buttons sibling branch.",
    status: "stub",
  },
  {
    href: "/settings/developer/client-scripts",
    title: "Client Scripts",
    body: "Coming on the Client Scripts sibling branch.",
    status: "stub",
  },
  {
    href: "/settings/developer/widgets",
    title: "Widgets",
    body: "Coming on the Widgets sibling branch.",
    status: "stub",
  },
];

export default async function DeveloperHubOverviewPage() {
  await requireAdminPage();
  const counts = await hubOverviewCounts();

  return (
    <SettingsShell title="Developer Hub" current="developer">
      <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
        Power-user tools for this desk — Functions, org API keys, webhooks, and named connections.
        Working paths stop at the API wall. FitFirst does not call paid vendors and does not write
        to live Zoho.
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
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Webhooks</div>
          <div className="text-xl font-semibold text-navy">{counts.webhooks}</div>
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
