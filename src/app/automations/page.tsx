import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { AutomationsModuleNav } from "@/components/automations/module-nav";
import { requireSignedIn } from "@/lib/auth/guards";
import { AUTOMATION_HUB_SECTIONS } from "@/lib/automations/types";
import { outcomeBadges } from "@/lib/automations/engine";
import {
  listAutomationRuns,
  listGuidedAutomations,
  listPendingSignatureApprovals,
  listMySignatures,
} from "@/lib/db/automation-queries";
import { listCampaignSequences } from "@/lib/db/sequence-queries";
import { listEmailTemplates } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default async function AutomationsHubPage() {
  const session = await requireSignedIn();
  const [templates, automations, pending, mine, sequences, runs] = await Promise.all([
    listEmailTemplates(),
    listGuidedAutomations({ isAdmin: session.isAdmin }),
    listPendingSignatureApprovals(),
    session.userId ? listMySignatures(session.userId) : Promise.resolve([]),
    listCampaignSequences(),
    listAutomationRuns({ isAdmin: session.isAdmin }),
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
  };

  return (
    <AppShell title="Automations">
      <AutomationsModuleNav />
      <p className="mb-2 max-w-3xl text-sm text-muted-foreground">
        In-desk automations. Playbooks create Tasks and in-app Alerts. Templates stay EN/ES
        drafts. Paid campaign and SMS vendors are off.
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
      <div className="grid gap-3 md:grid-cols-2">
        {AUTOMATION_HUB_SECTIONS.map((section) => (
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
    </AppShell>
  );
}
