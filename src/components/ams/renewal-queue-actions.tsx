import { advanceRenewalQueue } from "@/app/actions/ams";
import { Button } from "@/components/ui/button";
import type { RenewalQueueStage } from "@/lib/domain-ams";

export function RenewalQueueActions({
  queueId,
  stage,
  returnTo = "/renewals/queue",
}: {
  queueId: string;
  stage: string;
  returnTo?: string;
}) {
  const actions: { action: string; label: string; next: RenewalQueueStage | "reset" }[] = [];
  if (stage === "upcoming") actions.push({ action: "quote", label: "Start quoting", next: "quoting" });
  if (stage === "quoting") actions.push({ action: "offer", label: "Mark offered", next: "offered" });
  if (stage === "offered") actions.push({ action: "accept", label: "Accept (stub)", next: "accepted" });
  if (stage === "upcoming" || stage === "quoting" || stage === "offered") {
    actions.push({ action: "lose", label: "Mark lost", next: "lost" });
  }
  if (stage === "accepted" || stage === "lost" || stage === "offered") {
    actions.push({ action: "reset", label: "Return to upcoming", next: "reset" });
  }

  if (actions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((row) => (
        <form key={row.action} action={advanceRenewalQueue}>
          <input type="hidden" name="queueId" value={queueId} />
          <input type="hidden" name="action" value={row.action} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <Button type="submit" size="sm" variant={row.action === "accept" ? "outline" : "default"}>
            {row.label}
          </Button>
        </form>
      ))}
    </div>
  );
}
