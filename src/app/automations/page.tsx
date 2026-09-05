import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { AutomationsModuleNav } from "@/components/automations/module-nav";
import { StatusChip } from "@/components/developer-hub/status-chip";
import { ConnectionBadge } from "@/components/settings/connection-badge";
import { requireSignedIn } from "@/lib/auth/guards";
import {
  campaignsReady,
  connectedCampaignIntegrations,
  connectedSmsIntegrations,
  smsReady,
} from "@/lib/automations/connections";
import {
  AUTOMATION_DESK_SECTIONS,
  AUTOMATION_DEV_SECTIONS,
  SIGNATURE_STATUS_LABEL,
} from "@/lib/automations/types";
import {
  listGuidedAutomations,
  listPendingSignatureApprovals,
  listMySignatures,
} from "@/lib/db/automation-queries";
import { getSmsSettings } from "@/lib/db/ops-queries";
import { listCampaignSequences } from "@/lib/db/sequence-queries";
import { listEmailTemplates } from "@/lib/db/queries";
import { listCatalogItems } from "@/lib/integrations/catalog-store";
import { developerToolCounts } from "@/lib/developer-hub/store";

export const dynamic = "force-dynamic";

export default async function AutomationsHubPage() {
  const session = await requireSignedIn();
  const [catalog, sms, templates, automations, pending, mine, sequences, tools] = await Promise.all([
    listCatalogItems(),
    getSmsSettings(),
    listEmailTemplates(),
    listGuidedAutomations(),
    listPendingSignatureApprovals(),
    session.userId ? listMySignatures(session.userId) : Promise.resolve([]),
    listCampaignSequences(),
    developerToolCounts(),
  ]);
  const campaignOk = campaignsReady(catalog);
  const smsOk = smsReady(catalog, Boolean(sms?.connected));
  const campaignConnected = connectedCampaignIntegrations(catalog);
  const smsConnected = connectedSmsIntegrations(catalog);
  const myLive = mine.filter((row) => row.approvalStatus === "live").length;
  const myPending = mine.filter((row) => row.approvalStatus === "pending").length;

  const sequencesOn = sequences.filter((row) => row.enabled).length;
  const status: Record<string, string> = {
    playbooks: `${automations.length} named playbooks · Task + Alert only`,
    sequences: `${sequencesOn} of ${sequences.length} sequences on · Task + email stubs`,
    campaigns: campaignOk
      ? `${campaignConnected.map((item) => item.name).join(", ")} ready`
      : "Connect Mailchimp, Constant Contact, or SendGrid",
    sms: smsOk
      ? `${smsConnected[0]?.name ?? sms?.provider ?? "SMS"} ready`
      : "Connect a phone / SMS integration",
    templates: templates.length
      ? `${templates.length} EN / ES templates in the work-email library`
      : "No templates yet — seed the desk",
    builder: `${automations.length} named rules · prefer in-app notify`,
    signatures: session.isAdmin
      ? `${pending.length} waiting on Admin`
      : myPending
        ? `${myPending} waiting on Admin`
        : myLive
          ? `${myLive} live`
          : "Draft a signature for Admin review",
    macros: `${tools.macros} macros · manual run on Leads / Contacts / Deals`,
    functions: `${tools.functions} functions · test log + REST stub`,
    webhooks: `${tools.webhooks} outbound · ${tools.inbound} inbound slugs`,
    "api-keys": `${tools.liveKeys} live org keys`,
    buttons: `${tools.buttons} custom buttons`,
    "client-scripts": `${tools.scripts} client scripts`,
    connections: `${tools.connections} named connectors · OAuth wall`,
  };

  return (
    <AppShell title="Automations">
      <AutomationsModuleNav />
      <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
        Insurance playbooks and campaign stubs stay in-house. Developer tools — macros, functions,
        webhooks, org API keys, custom buttons, client scripts, and connections — share the same
        tables as Settings → Developer Hub. Paid SMS and email campaigns stay connect-first stubs.
        Ana Dib is never auto-updated.
      </p>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Link
          href="/settings/developer"
          className="rounded-md border border-border bg-card px-3 py-1.5 text-sm font-semibold text-navy hover:border-primary/40"
        >
          Open Developer Hub
        </Link>
        <StatusChip status="working" />
      </div>
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Desk playbooks
      </h2>
      <div className="mb-6 grid gap-3 md:grid-cols-2">
        {AUTOMATION_DESK_SECTIONS.map((section) => (
          <Link
            key={section.id}
            href={section.href}
            className="ff-card block p-4 hover:border-primary/40"
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm font-semibold text-navy">{section.label}</h3>
              {section.id === "campaigns" ? (
                <ConnectionBadge connected={campaignOk} />
              ) : section.id === "sms" ? (
                <ConnectionBadge connected={smsOk} />
              ) : null}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{section.summary}</p>
            <p className="mt-2 text-xs text-navy">{status[section.id]}</p>
          </Link>
        ))}
      </div>
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Developer tools
      </h2>
      <div className="grid gap-3 md:grid-cols-2">
        {AUTOMATION_DEV_SECTIONS.map((section) => (
          <Link
            key={section.id}
            href={section.href}
            className="ff-card block p-4 hover:border-primary/40"
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm font-semibold text-navy">{section.label}</h3>
              <StatusChip
                status={section.id === "connections" ? "needs_oauth" : "working"}
              />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{section.summary}</p>
            <p className="mt-2 text-xs text-navy">{status[section.id]}</p>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
