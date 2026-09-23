import {
  matchesLifeOrHealthSub,
  type DeskLineSettings,
} from "@/lib/desk/line-settings";
import { insuranceFamilyFromPolicy } from "@/lib/desk/policy-family";
import { isPcSubLine } from "@/lib/desk/policy-line";
import type { RenewalBoardCard } from "@/lib/renewal/board-data";

export const RENEWAL_SHOPPING_STAGES = ["upcoming", "contacted", "quoted"] as const;
export const RENEWAL_WON_LOST_STAGES = ["bound", "lost"] as const;
export const RENEWAL_ARCHIVE_STAGES = ["archive", "archived"] as const;
/** Quiet collection: client staying / renewal handled — not archived, not active chase. */
export const RENEWAL_HANDLED_STAGES = ["handled"] as const;

const WON_LOST = new Set<string>(RENEWAL_WON_LOST_STAGES);
const ARCHIVE = new Set<string>(RENEWAL_ARCHIVE_STAGES);
const HANDLED = new Set<string>(RENEWAL_HANDLED_STAGES);

export type RenewalDeskFilter = {
  pipeline?: string | null;
  stage?: string | null;
  pcSub?: string | null;
  lifeSub?: string | null;
  healthSub?: string | null;
};

/** Shopping = not parking. Custom admin stages stay on All / LOB boards. */
export function isRenewalShoppingStage(slug: string): boolean {
  return !WON_LOST.has(slug) && !ARCHIVE.has(slug) && !HANDLED.has(slug);
}

export function isRenewalWonLostStage(slug: string): boolean {
  return WON_LOST.has(slug);
}

export function isRenewalArchiveStage(slug: string): boolean {
  return ARCHIVE.has(slug);
}

export function isRenewalHandledStage(slug: string): boolean {
  return HANDLED.has(slug);
}

/** LOB → filter chip: Home/Auto/Flood/Commercial/… → p-c; Health* → health; Life* → life. */
export function renewalLobFamily(
  lineOfBusiness: string,
  policySubType?: string | null,
  insuranceType?: string | null,
  commissionFamily?: string | null,
): "p-c" | "health" | "life" {
  const family = insuranceFamilyFromPolicy({
    lineOfBusiness,
    policySubType,
    insuranceType,
    commissionFamily,
  });
  if (family === "Life") return "life";
  if (family === "Health") return "health";
  const blob = `${lineOfBusiness} ${policySubType ?? ""}`.toLowerCase();
  if (/(^|[^a-z])life([^a-z]|$)/.test(blob) && !blob.includes("health")) return "life";
  if (blob.includes("health") || blob.includes("medicare") || blob.includes("medigap")) return "health";
  return "p-c";
}

export function renewalStagesForPipeline<T extends { slug: string }>(
  stages: T[],
  pipeline?: string | null,
): T[] {
  if (pipeline === "won-lost") return stages.filter((stage) => isRenewalWonLostStage(stage.slug));
  if (pipeline === "archive") return stages.filter((stage) => isRenewalArchiveStage(stage.slug));
  if (pipeline === "handled") return stages.filter((stage) => isRenewalHandledStage(stage.slug));
  return stages.filter((stage) => isRenewalShoppingStage(stage.slug));
}

export function filterRenewalCards(
  cards: RenewalBoardCard[],
  filter: RenewalDeskFilter,
  settings: DeskLineSettings,
): RenewalBoardCard[] {
  const pipeline = filter.pipeline || null;
  return cards.filter((card) => {
    if (filter.stage && card.stage !== filter.stage) return false;
    if (!pipeline) {
      return isRenewalShoppingStage(card.stage);
    }
    if (pipeline === "won-lost") {
      return isRenewalWonLostStage(card.stage);
    }
    if (pipeline === "archive") {
      return isRenewalArchiveStage(card.stage);
    }
    if (pipeline === "handled") {
      return isRenewalHandledStage(card.stage);
    }
    if (pipeline === "p-c" || pipeline === "health" || pipeline === "life") {
      if (!isRenewalShoppingStage(card.stage)) return false;
      const family = renewalLobFamily(
        card.lineOfBusiness,
        card.policySubType,
        card.insuranceType,
        card.commissionFamily,
      );
      if (family !== pipeline) return false;
      if (pipeline === "p-c" && filter.pcSub && filter.pcSub !== "all") {
        if (!isPcSubLine(card.lineOfBusiness, filter.pcSub)) return false;
      }
      if (pipeline === "life" && filter.lifeSub && filter.lifeSub !== "all") {
        if (
          !matchesLifeOrHealthSub(
            card.policySubType || card.lineOfBusiness,
            filter.lifeSub,
            settings.lifeOptions,
          )
        ) {
          return false;
        }
      }
      if (pipeline === "health" && filter.healthSub && filter.healthSub !== "all") {
        if (
          !matchesLifeOrHealthSub(
            card.policySubType || card.lineOfBusiness,
            filter.healthSub,
            settings.healthOptions,
          )
        ) {
          return false;
        }
      }
      return true;
    }
    return isRenewalShoppingStage(card.stage);
  });
}
