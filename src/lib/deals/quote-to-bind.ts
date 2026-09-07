import { isAnaDeal } from "@/lib/crm/bind-path";

export function stubBoundPolicyNumber(dealTitle: string, now = Date.now()): string {
  const slug = dealTitle
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 12);
  return `FF-${slug || "BIND"}-${String(now).slice(-6)}`;
}

export function quoteToBindFields(now = new Date()) {
  return {
    pipelineStage: "bound" as const,
    pipelineStageSlug: "closed_won",
    boundAt: now,
    wonAt: now,
    updatedAt: now,
  };
}

export function shouldAutoBindOnEsign(deal: {
  id: string;
  pipelineStage?: string | null;
  boundAt?: Date | string | null;
}): boolean {
  if (isAnaDeal(deal.id)) return false;
  return true;
}

export function quoteToBindNotes(existing: string | null | undefined, policyNumber: string): string {
  const line = `Policy ${policyNumber} attached on e-sign.`;
  const current = (existing ?? "").trim();
  if (!current) return line;
  if (current.includes(policyNumber)) return current;
  return `${current}\n${line}`;
}
