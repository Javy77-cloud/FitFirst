import { awardLeadOffer } from "@/app/actions/lead-offers";
import { Button } from "@/components/ui/button";

export function AwardLeadForm({
  leadId,
  agents,
  next,
}: {
  leadId: string;
  agents: { id: string; name: string }[];
  next: string;
}) {
  if (agents.length === 0) {
    return <p className="text-helper text-muted-foreground">No agents to award to.</p>;
  }
  return (
    <form action={awardLeadOffer} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="leadId" value={leadId} />
      <input type="hidden" name="next" value={next} />
      <label className="text-helper text-muted-foreground">
        Award to
        <select
          name="agentId"
          required
          className="mt-0.5 block h-8 min-w-40 rounded-md border border-border bg-background px-2 text-sm text-navy"
        >
          {agents.map((agent) => (
            <option key={agent.id} value={agent.id}>
              {agent.name}
            </option>
          ))}
        </select>
      </label>
      <Button type="submit" size="sm">
        Award
      </Button>
    </form>
  );
}
