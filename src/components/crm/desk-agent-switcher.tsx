import { getCurrentAgent, listDeskAgents } from "@/lib/crm/desk-agent";
import { DeskAgentSwitcherForm } from "@/components/crm/desk-agent-switcher-form";

export async function DeskAgentSwitcher({ compact = false }: { compact?: boolean }) {
  const [current, agents] = await Promise.all([getCurrentAgent(), listDeskAgents()]);
  return (
    <DeskAgentSwitcherForm
      compact={compact}
      currentId={current.id}
      agents={agents.map((agent) => ({
        id: agent.id,
        displayName: agent.displayName,
        role: agent.role,
      }))}
    />
  );
}
