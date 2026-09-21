import Link from "next/link";
import { SettingsShell } from "@/components/settings/settings-shell";
import { AgentPolicyAccessPanel } from "@/components/settings/agent-policy-access-panel";
import { requireAdminPage } from "@/lib/auth/guards";
import { getAgentPolicyAccess } from "@/lib/policy/agent-policy-access-prefs";

export const dynamic = "force-dynamic";

export default async function AgentPolicyAccessSettingsPage() {
  await requireAdminPage();
  const access = await getAgentPolicyAccess();

  return (
    <SettingsShell title="Agent Policy Access" current="agent-policy-access">
      <p className="mb-4 max-w-3xl text-sm text-muted-foreground">
        Four agency toggles for what agents can see and change on Policies. Everything else stays
        readable and not writable for agents (servicing checklist, coverage, documents, activity,
        FNOL, inspections, certificates, renewals board). Policy number and key dates stay locked
        behind a confirmation for everyone — including admins. Agents never see “Admin only” labels.
      </p>
      <p className="mb-4 text-sm">
        <Link href="/settings/roles-access" className="text-primary hover:underline">
          Roles &amp; access
        </Link>
        {" "}covers the Admin / Owner / Agent / Developer matrix and agency feature toggles.
      </p>
      <AgentPolicyAccessPanel initial={access} />
    </SettingsShell>
  );
}
