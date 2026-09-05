import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { AutomationsModuleNav } from "@/components/automations/module-nav";
import { ConnectionBadge } from "@/components/settings/connection-badge";
import { requireSignedIn } from "@/lib/auth/guards";
import {
  campaignsReady,
  connectedCampaignIntegrations,
  connectedSmsIntegrations,
  smsReady,
} from "@/lib/automations/connections";
import {
  AUTOMATION_DEVELOPER_SECTIONS,
  AUTOMATION_HUB_SECTIONS,
} from "@/lib/automations/types";
import { StatusChip } from "@/components/developer-hub/status-chip";
import { hubOverviewCounts } from "@/lib/developer-hub/store";
import type { HubToolStatus } from "@/lib/developer-hub/types";
import {
  listGuidedAutomations,
  listPendingSignatureApprovals,
  listMySignatures,
} from "@/lib/db/automation-queries";
import { getSmsSettings } from "@/lib/db/ops-queries";
import { listCampaignSequences } from "@/lib/db/sequence-queries";
import { listEmailTemplates } from "@/lib/db/queries";
import { listCatalogItems } from "@/lib/integrations/catalog-store";

export const dynamic = "force-dynamic";

export default async function AutomationsHubPage() {
  const session = await requireSignedIn();
  const [catalog, sms, templates, automations, pending, mine, sequences, hub] = await Promise.all([
    listCatalogItems(),
    getSmsSettings(),
    listEmailTemplates(),
    listGuidedAutomations(),
    listPendingSignatureApprovals(),
    session.userId ? listMySignatures(session.userId) : Promise.resolve([]),
    listCampaignSequences(),
    hubOverviewCounts(),
  ]);
  const campaignOk = campaignsReady(catalog);
  const smsOk = smsReady(catalog, Boolean(sms?.connected));
  const campaignConnected = connectedCampaignIntegrations(catalog);
  const smsConnected = connectedSmsIntegrations(catalog);
  const myLive = mine.filter((row) => row.approvalStatus === "live").length;
  const myPending = mine.filter((row) => row.approvalStatus === "pending").length;

  const sequencesOn = sequences.filter((row) => row.enabled).length;
  const status: Record<string, string> = {
    sequences: `${sequencesOn} of ${sequences.length} sequences on · Task + email stubs`,
    campaigns: campaignOk
      ? `${campaignConnected.map((item) => item.name).join(", ")} ready`
      : "Connect Mailchimp, Constant Contact, or SendGrid",
    sms: smsOk
      ? `${smsConnected[0]?.name ?? sms?.provider ?? "SMS"} ready`
      : "Connect a phone / SMS integration",
    templates: templates.length
      ? `${templates.length} templates in the work-email library`
      : "No templates yet — seed the desk",
    builder: `${automations.length} named rules · prefer in-app notify`,
    signatures: session.isAdmin
      ? `${pending.length} waiting on Admin`
      : myPending
        ? `${myPending} waiting on Admin`
        : myLive
          ? `${myLive} live`
          : "Draft a signature for Admin review",
  };

  return (
    <AppShell title="Automations">
      <AutomationsModuleNav />
      <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
        Insurance campaign sequences, guided campaigns, bulk SMS, work-email templates, and a
        simple Trigger → Condition → Action builder. Developer tools (Functions, Macros, Webhooks,
        API Keys, Connections) live here too — same records as Settings → Developer Hub. Agent
        alerts stay in Alerts. Signatures need Admin before they go live.
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        {AUTOMATION_HUB_SECTIONS.map((section) => (
          <Link
            key={section.id}
            href={section.href}
            className="ff-card block p-4 hover:border-primary/40"
          >
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-sm font-semibold text-navy">{section.label}</h2>
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

      <h2 className="mb-2 mt-6 text-sm font-semibold text-navy">Developer tools</h2>
      <p className="mb-3 max-w-3xl text-xs text-muted-foreground">
        Working stubs up to the OAuth wall. Admin creates and runs them. Same tables as Settings.
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        {AUTOMATION_DEVELOPER_SECTIONS.map((section) => {
          const chip: HubToolStatus =
            section.id === "macros"
              ? "stub"
              : section.id === "connections"
                ? "needs_oauth"
                : "working";
          const count =
            section.id === "functions"
              ? `${hub.functions} functions`
              : section.id === "api-keys"
                ? `${hub.liveKeys} live keys`
                : section.id === "webhooks"
                  ? `${hub.webhooks} outbound · ${hub.inbound} inbound`
                  : section.id === "connections"
                    ? `${hub.connections} connectors`
                    : "Coming / sibling bot";
          return (
            <Link
              key={section.id}
              href={section.href}
              className="ff-card block p-4 hover:border-primary/40"
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-sm font-semibold text-navy">{section.label}</h2>
                <StatusChip status={chip} />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{section.summary}</p>
              <p className="mt-2 text-xs text-navy">{count}</p>
            </Link>
          );
        })}
      </div>
    </AppShell>
  );
}
