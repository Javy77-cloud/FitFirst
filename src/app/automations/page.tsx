import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { AutomationsModuleNav } from "@/components/automations/module-nav";
import { StatusChip } from "@/components/developer-hub/status-chip";
import { requireSignedIn } from "@/lib/auth/guards";
import { AUTOMATION_DESK_SECTIONS, AUTOMATION_DEV_SECTIONS } from "@/lib/automations/types";
import { outcomeBadges } from "@/lib/automations/engine";
import {
  listAutomationRuns,
  listGuidedAutomations,
  listPendingSignatureApprovals,
  listMySignatures,
} from "@/lib/db/automation-queries";
import { listCampaignSequences } from "@/lib/db/sequence-queries";
import { listEmailTemplates } from "@/lib/db/queries";
import { listDeskButtons, listDeskMacros } from "@/lib/db/developer-hub-queries";
import { developerToolCounts } from "@/lib/developer-hub/store";

export const dynamic = "force-dynamic";

export default async function AutomationsHubPage() {
  const session = await requireSignedIn();
  const [templates, automations, pending, mine, sequences, runs, tools, macros, buttons] =
    await Promise.all([
      listEmailTemplates(),
      listGuidedAutomations({ isAdmin: session.isAdmin }),
      listPendingSignatureApprovals(),
      session.userId ? listMySignatures(session.userId) : Promise.resolve([]),
      listCampaignSequences(),
      listAutomationRuns({ isAdmin: session.isAdmin }),
      developerToolCounts(),
      listDeskMacros(),
      listDeskButtons(),
    ]);
  const myLive = mine.filter((row) => row.approvalStatus === "live").length;
  const myPending = mine.filter((row) => row.approvalStatus === "pending").length;
  const sequencesOn = sequences.filter((row) => row.enabled).length;
  const dual = automations.filter((row) => outcomeBadges(row.actionKind).includes("Task")).length;
  const enEs = templates.filter((row) => row.subjectEn && row.bodyEn && row.subjectEs && row.bodyEs).length;

  const status: Record<string, string> = {
    playbooks: session.isAdmin
      ? `${automations.length} playbooks · ${runs.length} fires · ${dual} write Tasks`
      : `${automations.length} visible · ${runs.filter((row) => row.run.createdAlert || row.run.createdTask).length} fires on your book`,
    templates: templates.length
      ? `${templates.length} templates · ${enEs} EN+ES · none send`
      : "No templates yet — seed the desk",
    builder: session.isAdmin
      ? "Admin writes Trigger → Condition → Action"
      : "Read-only — ask Admin to add a playbook",
    sequences: `${sequencesOn} of ${sequences.length} sequence stubs on · Tasks only`,
    signatures: session.isAdmin
      ? `${pending.length} waiting on Admin`
      : myPending
        ? `${myPending} waiting on Admin`
        : myLive
          ? `${myLive} live`
          : "Draft a signature for Admin review",
    campaigns: "Not offered — no Mailchimp / SendGrid",
    sms: "Not offered — no Twilio",
    macros: `${macros.filter((row) => row.enabled).length} of ${macros.length} on · Run from list checkboxes`,
    functions: `${tools.functions} functions · test log + REST stub`,
    webhooks: `${tools.webhooks} outbound · ${tools.inbound} inbound slugs`,
    "api-keys": `${tools.liveKeys} live org keys`,
    buttons: `${tools.buttons} custom buttons`,
    "custom-buttons": `${buttons.filter((row) => row.enabled).length} of ${buttons.length} on · list / detail / mass action`,
    "client-scripts": `${tools.scripts} client scripts`,
    connections: `${tools.connections} named connectors · OAuth wall`,
  };

  return (
    <AppShell title="Automations">
      <AutomationsModuleNav />
      <p className="mb-2 max-w-3xl text-sm text-muted-foreground">
        In-desk automations. Playbooks create Tasks and in-app Alerts. Templates stay EN/ES
        drafts. Paid campaign and SMS vendors are off. Developer tools (Functions, Macros,
        Buttons, Client Scripts, Webhooks, API Keys, Connections) live here too — same records as
        Settings → Automations & Developer. Ana Dib is never auto-updated.
      </p>
      <p className="mb-4 rounded-md border border-border bg-card px-3 py-2 text-sm">
        {session.isAdmin ? (
          <>
            <span className="font-semibold text-navy">Admin view.</span> Write playbooks, toggle
            them, and run a demo fire. Internal pings stay in Alerts / pop-up — nothing emails you.
          </>
        ) : (
          <>
            <span className="font-semibold text-navy">Agent view.</span> Read the playbooks on
            your book and the Tasks / Alerts they already fired. You cannot edit rules or connect
            a vendor.
          </>
        )}
      </p>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Link
          href="/settings/developer-hub"
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
            <h2 className="text-sm font-semibold text-navy">{section.label}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{section.summary}</p>
            <p className="mt-2 text-xs text-navy">{status[section.id]}</p>
          </Link>
        ))}
      </div>
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Developer tools
      </h2>
      <p className="mb-3 max-w-3xl text-xs text-muted-foreground">
        Working stubs up to the OAuth wall. Admin creates and runs them. Same tables as Settings.
        Check rows on Leads, Contacts, Deals, Policies, Tasks, Businesses, Campaigns, or Quotes,
        then Run Macro. Leads also has Run Follow-up Macro. Same Settings desk_macros rows.
      </p>
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
