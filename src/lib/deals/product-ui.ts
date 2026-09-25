import type { DealProductGroupId, DealProductId } from "@/lib/deals/deal-products";
import { dealProductDef } from "@/lib/deals/deal-products";
import type { AgentDealTab } from "@/lib/deals/tabs";

export type DealFlowStepId = "create" | AgentDealTab;

export const DEAL_SHOP_FLOW = [
  { id: "create" as const, label: "Create", hint: "Pick products — nothing saves yet" },
  { id: "details" as const, label: "Details", hint: "Shared facts, then each product" },
  { id: "documents" as const, label: "Documents", hint: "One Risk Profile per product line" },
  { id: "markets" as const, label: "Markets", hint: "Shop the active product" },
  { id: "quotes" as const, label: "Quotes", hint: "Compare and bind" },
];

export type DealGroupTheme = {
  id: DealProductGroupId;
  label: string;
  /** Short competitive line — shown on the picker group. */
  blurb: string;
  stripe: string;
  wash: string;
  ink: string;
  selected: string;
  chip: string;
  chipOn: string;
  bar: string;
};

export const DEAL_GROUP_THEMES: Record<DealProductGroupId, DealGroupTheme> = {
  personal: {
    id: "personal",
    label: "Personal",
    blurb: "Home, Auto, Flood, and the rest of the household",
    stripe: "bg-navy",
    wash: "bg-[var(--ff-check-bg)]",
    ink: "text-navy",
    selected: "border-navy bg-navy text-white shadow-sm",
    chip: "border-navy/40 bg-white text-navy hover:border-navy",
    chipOn: "border-navy bg-navy text-white",
    bar: "bg-navy",
  },
  commercial: {
    id: "commercial",
    label: "Commercial",
    blurb: "GL, E&O, WC, BOP, Commercial Auto — Business path on bind",
    stripe: "bg-[var(--ff-terracotta)]",
    wash: "bg-[#f8e8df]",
    ink: "text-[var(--ff-terracotta)]",
    selected: "border-[var(--ff-terracotta)] bg-[var(--ff-terracotta)] text-white shadow-sm",
    chip: "border-[var(--ff-terracotta)]/50 bg-white text-[var(--ff-terracotta)] hover:border-[var(--ff-terracotta)]",
    chipOn: "border-[var(--ff-terracotta)] bg-[var(--ff-terracotta)] text-white",
    bar: "bg-[var(--ff-terracotta)]",
  },
  life: {
    id: "life",
    label: "Life",
    blurb: "Term, Whole, IUL, Final Expense — same person, own board",
    stripe: "bg-[var(--ff-green)]",
    wash: "bg-[var(--ff-green-bg)]",
    ink: "text-[var(--ff-green)]",
    selected: "border-[var(--ff-green)] bg-[var(--ff-green)] text-white shadow-sm",
    chip: "border-[var(--ff-green)]/45 bg-white text-[var(--ff-green)] hover:border-[var(--ff-green)]",
    chipOn: "border-[var(--ff-green)] bg-[var(--ff-green)] text-white",
    bar: "bg-[var(--ff-green)]",
  },
  health: {
    id: "health",
    label: "Health",
    blurb: "Marketplace, MA, Med A&B, Supplemental",
    stripe: "bg-[var(--ff-accent)]",
    wash: "bg-[#e8f1fb]",
    ink: "text-[var(--ff-accent)]",
    selected: "border-[var(--ff-accent)] bg-[var(--ff-accent)] text-white shadow-sm",
    chip: "border-[var(--ff-accent)]/45 bg-white text-[var(--ff-accent)] hover:border-[var(--ff-accent)]",
    chipOn: "border-[var(--ff-accent)] bg-[var(--ff-accent)] text-white",
    bar: "bg-[var(--ff-accent)]",
  },
};

export function themeForProduct(product: DealProductId): DealGroupTheme {
  return DEAL_GROUP_THEMES[dealProductDef(product).group];
}

export function themeForGroup(group: DealProductGroupId): DealGroupTheme {
  return DEAL_GROUP_THEMES[group];
}

export function flowIndex(step: DealFlowStepId): number {
  return DEAL_SHOP_FLOW.findIndex((row) => row.id === step);
}

export function nextFlowStep(step: DealFlowStepId): (typeof DEAL_SHOP_FLOW)[number] | null {
  const index = flowIndex(step);
  return index >= 0 ? (DEAL_SHOP_FLOW[index + 1] ?? null) : null;
}

export function nextStepCopy(input: {
  step: DealFlowStepId;
  activeLabel?: string | null;
  productComplete?: boolean;
}): string {
  const next = nextFlowStep(input.step);
  if (input.step === "create") {
    return "Save Deal to open Details. Back leaves no record.";
  }
  if (input.step === "details" && !input.productComplete && input.activeLabel) {
    return `Finish ${input.activeLabel}, then Documents for that product’s sheet.`;
  }
  if (!next) return "Compare quotes and bind — one policy per product line.";
  return `Up next: ${next.label} — ${next.hint}.`;
}
