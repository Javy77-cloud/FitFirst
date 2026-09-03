"use client";

import { switchDeskAgent } from "@/app/actions/desk";

export function DeskAgentSwitcherForm({
  currentId,
  agents,
  compact,
  instanceId,
}: {
  currentId: string;
  agents: Array<{ id: string; displayName: string; role: string }>;
  compact?: boolean;
  instanceId: string;
}) {
  return (
    <form action={switchDeskAgent} className={compact ? "flex items-center gap-1" : "space-y-1"}>
      {compact ? null : (
        <label
          htmlFor={instanceId}
          className="block text-[10px] uppercase tracking-wide text-sidebar-foreground/60"
        >
          Desk agent
        </label>
      )}
      <select
        id={instanceId}
        name="agentId"
        defaultValue={currentId}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
        className={
          compact
            ? "h-7 max-w-44 rounded-md border border-input bg-card px-1.5 text-xs text-navy"
            : "w-full rounded-md border border-sidebar-border bg-sidebar-accent px-2 py-1 text-xs text-white"
        }
      >
        {agents.map((agent) => (
          <option key={agent.id} value={agent.id}>
            {agent.displayName}
            {agent.role === "admin" ? " (admin)" : ""}
          </option>
        ))}
      </select>
      <noscript>
        <button type="submit" className="text-xs underline">
          Switch
        </button>
      </noscript>
    </form>
  );
}
