export type AssignableAgent = {
  id: string;
  name: string;
  email: string;
  role: string;
};

export function AgentAssign({
  agents,
  selectedIds,
  primaryUserId,
  showPrimary = false,
}: {
  agents: AssignableAgent[];
  selectedIds: string[];
  primaryUserId?: string | null;
  showPrimary?: boolean;
}) {
  const picked = new Set(selectedIds);
  if (agents.length === 0) {
    return <p className="text-sm text-muted-foreground">No agents on this tenant yet.</p>;
  }
  return (
    <fieldset className="space-y-2">
      <legend className="text-xs text-muted-foreground">
        {showPrimary ? "Agents (check one primary office for each person)" : "Agents"}
      </legend>
      <ul className="divide-y divide-border rounded-md border border-border">
        {agents.map((agent) => (
          <li key={agent.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
            <label className="flex min-w-0 items-center gap-2 text-sm text-navy">
              <input
                type="checkbox"
                name="agentIds"
                value={agent.id}
                defaultChecked={picked.has(agent.id)}
                className="size-3.5 accent-primary"
              />
              <span className="truncate">
                {agent.name}
                <span className="ml-1 text-xs text-muted-foreground">
                  {agent.role === "admin" ? "Admin" : "Agent"} · {agent.email}
                </span>
              </span>
            </label>
            {showPrimary ? (
              <label className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <input
                  type="radio"
                  name="primaryUserId"
                  value={agent.id}
                  defaultChecked={primaryUserId === agent.id}
                  className="size-3 accent-primary"
                />
                Primary here
              </label>
            ) : null}
          </li>
        ))}
      </ul>
    </fieldset>
  );
}
