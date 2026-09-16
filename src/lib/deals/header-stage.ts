import { humanizeDealStage } from "@/lib/deals/package-lines";
import { canonicalizeProductStage } from "@/lib/deals/product-stages";

export type HeaderStageOption = {
  slug: string;
  name?: string | null;
  color?: string | null;
};

/** Happy-path order on the agency PC / Life / Health boards. */
export const STAGE_ADVANCE_ORDER = [
  "gathering",
  "markets",
  "quote_review",
  "quote_sent",
  "bound",
  "policy_issued",
  "closed_won",
] as const;

/** Full stage label for chips — never a truncated "Gather". */
export function stageChipLabel(stage: HeaderStageOption | string | null | undefined): string {
  if (stage == null) return humanizeDealStage(null);
  if (typeof stage === "string") return humanizeDealStage(stage);
  return humanizeDealStage(stage.name || stage.slug);
}

export function nextAdvanceStage(
  currentSlug: string | null | undefined,
  stages: readonly HeaderStageOption[],
): HeaderStageOption | null {
  const current = canonicalizeProductStage(currentSlug);
  if (!current || !stages.length) return null;
  const happyIdx = (STAGE_ADVANCE_ORDER as readonly string[]).indexOf(current);
  if (happyIdx >= 0) {
    for (let i = happyIdx + 1; i < STAGE_ADVANCE_ORDER.length; i++) {
      const slug = STAGE_ADVANCE_ORDER[i];
      const hit = stages.find((stage) => canonicalizeProductStage(stage.slug) === slug);
      if (hit) return hit;
    }
    return null;
  }
  const idx = stages.findIndex((stage) => canonicalizeProductStage(stage.slug) === current);
  if (idx < 0) return stages[0] ?? null;
  return stages.slice(idx + 1).find((stage) => stage.slug !== "closed_lost") ?? null;
}
