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

      <p className="mb-4 text-sm">
        <Link href="/settings/roles-access" className="text-primary hover:underline">
          Roles &amp; access
        </Link>
      </p>
      <AgentPolicyAccessPanel initial={access} />
    </SettingsShell>
  );
}
